import { usePlane, useSphere, useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import * as THREE from 'three';
import type { PhysicsParams } from '../../App';

export default function BouncingLabWrapper({ params }: { params: PhysicsParams }) {
  const structureKey = `${params.restitution}-${params.dropHeight}`;
  return <BouncingLab key={structureKey} params={params} />;
}

function BouncyBall({ position, color, restitution }: { position: [number, number, number], color: string, restitution: number }) {
  const [ref, api] = useSphere(() => ({
    mass: 1, position, args: [0.6], restitution
  }));

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useFrame(({ pointer, camera }) => {
    if (isDragging) {
      const vec = new THREE.Vector3(pointer.x, pointer.y, 0);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z; 
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      
      api.position.set(pos.x, Math.max(0.6, pos.y), pos.z || 0);
      api.velocity.set(0, 0, 0);
    }
  });

  return (
    <mesh 
      ref={ref as any} castShadow 
      onPointerOver={() => setIsHovered(true)} onPointerOut={() => setIsHovered(false)}
      onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); api.mass.set(0); }}
      onPointerUp={() => { setIsDragging(false); api.mass.set(1); }}
      onPointerMissed={() => { if(isDragging) { setIsDragging(false); api.mass.set(1); } }}
    >
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial 
        color={color} roughness={0.1} metalness={0.1} 
        emissive={isDragging ? color : "#000"} 
        emissiveIntensity={isDragging ? 0.5 : (isHovered ? 0.2 : 0)} 
      />
    </mesh>
  );
}

function BouncingLab({ params }: { params: PhysicsParams }) {
  // Floor
  usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -3.9, 0], restitution: params.restitution }));

  // Enclosure Walls
  useBox(() => ({ type: 'Static', args: [10, 16, 1], position: [0, 4, -4.5], restitution: params.restitution }));
  useBox(() => ({ type: 'Static', args: [10, 16, 1], position: [0, 4, 4.5], restitution: params.restitution }));
  useBox(() => ({ type: 'Static', args: [1, 16, 10], position: [-5.5, 4, 0], restitution: params.restitution }));
  useBox(() => ({ type: 'Static', args: [1, 16, 10], position: [5.5, 4, 0], restitution: params.restitution }));
  useBox(() => ({ type: 'Static', args: [10, 1, 10], position: [0, 12, 0], restitution: params.restitution })); 

  const H = params.dropHeight;

  const [balls] = useState([
    { pos: [0, H, 0] as [number, number, number], color: '#ff79c6' },
    { pos: [1.5, H, 1.5] as [number, number, number], color: '#bd93f9' },
    { pos: [-1.5, H, -1.5] as [number, number, number], color: '#8be9fd' },
    { pos: [2.5, H, 0] as [number, number, number], color: '#f1fa8c' }
  ]);

  return (
    <>
      <mesh position={[0, -3.9, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#bb86fc" transparent opacity={0.1} />
      </mesh>
      
      {/* Visual outline edges of the box */}
      <boxHelper args={[new THREE.Mesh(new THREE.BoxGeometry(10, 16, 8)), 0x8be9fd]} />
      
      {balls.map((b, i) => <BouncyBall key={i} position={b.pos} color={b.color} restitution={params.restitution} />)}
    </>
  );
}

import { useBox, usePointToPointConstraint, useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { PhysicsParams } from '../../App';

export default function PendulumLab({ params }: { params: PhysicsParams }) {
  const L = params.pendulumLength;
  const initAngleRad = (params.pendulumAngle * Math.PI) / 180;
  
  const anchorY = L + 1;
  const bobInitX = L * Math.sin(initAngleRad);
  const bobInitY = anchorY - (L * Math.cos(initAngleRad));
  const bobScale = 0.5 + (params.pendulumMass * 0.1);

  // Structural Supports
  const [anchorRef] = useBox(() => ({
    type: 'Static', position: [0, anchorY, 0], args: [1, 0.4, 1]
  }));

  // Bob
  const [bobRef, bobApi] = useSphere(() => ({
    mass: params.pendulumMass,
    position: [bobInitX, bobInitY, 0], 
    args: [bobScale],
    linearDamping: 0.05,
    angularDamping: 0.05,
  }));

  // The hook connecting them perfectly at L distance
  usePointToPointConstraint(anchorRef, bobRef, {
    pivotA: [0, -0.2, 0], 
    pivotB: [0, L, 0],
  });

  // Rope Visuals
  const ropeRef = useRef<THREE.Mesh>(null);
  const vAnchor = new THREE.Vector3(0, anchorY - 0.2, 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef(new THREE.Vector3());
  const dragVelRef = useRef(new THREE.Vector3());

  useFrame(({ pointer, camera }, delta) => {
    // 1. Update Rope Position & Rotation
    if (ropeRef.current && (bobRef.current as any)) {
       const vBob = new THREE.Vector3();
       (bobRef.current as any).getWorldPosition(vBob);
       
       const distance = vAnchor.distanceTo(vBob);
       const direction = new THREE.Vector3().subVectors(vBob, vAnchor).normalize();
       const center = new THREE.Vector3().addVectors(vAnchor, vBob).multiplyScalar(0.5);
       
       ropeRef.current.position.copy(center);
       ropeRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
       ropeRef.current.scale.y = distance;
    }

    // 2. Drag Logic
    if (isDragging) {
      const vec = new THREE.Vector3(pointer.x, pointer.y, 0);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const distance = -camera.position.z / dir.z; 
      const pos = camera.position.clone().add(dir.multiplyScalar(distance));
      
      const dt = Math.max(delta, 0.001);
      dragVelRef.current.copy(pos).sub(lastPosRef.current).multiplyScalar(1 / dt);
      lastPosRef.current.copy(pos);

      bobApi.position.set(pos.x, Math.max(0.5, pos.y), 0);
      bobApi.velocity.set(0, 0, 0);
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.cursor = isHovered ? "grab" : "default";
    }
  });

  return (
    <>
      <group>
        <mesh ref={anchorRef as any} castShadow receiveShadow>
          <boxGeometry args={[1, 0.4, 1]} />
          <meshStandardMaterial color="#444" roughness={0.1} metalness={0.8} />
        </mesh>
        
        <mesh position={[-2, anchorY/2 - 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, anchorY + 1.6, 0.3]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[2, anchorY/2 - 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, anchorY + 1.6, 0.3]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, anchorY + 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>

      {/* Dynamic Rope */}
      <mesh ref={ropeRef} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1, 16]} />
        <meshStandardMaterial color="#888" roughness={0.9} />
      </mesh>

      {/* Interactable Bob */}
      <mesh 
        ref={bobRef as any} castShadow 
        onPointerOver={() => setIsHovered(true)} onPointerOut={() => setIsHovered(false)}
        onPointerDown={(e) => { 
          e.stopPropagation(); 
          setIsDragging(true); 
          bobApi.mass.set(0); 
          lastPosRef.current.copy(bobRef.current.position);
        }}
        onPointerUp={() => { 
          setIsDragging(false); 
          bobApi.mass.set(params.pendulumMass); 
          const vx = Math.max(-30, Math.min(30, dragVelRef.current.x));
          const vy = Math.max(-30, Math.min(30, dragVelRef.current.y));
          const vz = Math.max(-30, Math.min(30, dragVelRef.current.z));
          bobApi.velocity.set(vx, vy, vz);
        }}
        onPointerMissed={() => { 
          if(isDragging) { 
            setIsDragging(false); 
            bobApi.mass.set(params.pendulumMass); 
            const vx = Math.max(-30, Math.min(30, dragVelRef.current.x));
            const vy = Math.max(-30, Math.min(30, dragVelRef.current.y));
            const vz = Math.max(-30, Math.min(30, dragVelRef.current.z));
            bobApi.velocity.set(vx, vy, vz);
          } 
        }}
      >
        <sphereGeometry args={[bobScale, 32, 32]} />
        <meshStandardMaterial color={isHovered ? "#d8b4fe" : "#bb86fc"} metalness={0.6} roughness={0.2} emissive={isDragging ? "#bb86fc" : "#000"} emissiveIntensity={0.2} />
      </mesh>
    </>
  );
}

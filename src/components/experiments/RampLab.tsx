import { useBox, usePlane, useSphere } from '@react-three/cannon';
import { useState, useEffect } from 'react';
import type { PhysicsParams } from '../../App';

function Projectile({ position, id }: { position: [number, number, number], id: number }) {
  const [ref] = useSphere(() => ({
    mass: 1, position, args: [0.5],
  }));
  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={id % 2 === 0 ? "#03dac6" : "#ff79c6"} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

export default function RampLab({ params, triggers }: { params: PhysicsParams, triggers: Record<string, number> }) {
  usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -3.9, 0] }));

  // Mathematically ensuring the lowest edge of the ramp is perfectly flush with the floor (Y = -3.9)
  const angleRad = (params.rampAngle * Math.PI) / 180;
  const L = params.rampLength;

  const floorY = -3.9;
  
  // Center of the ramp in world space, calculated so the bottom-left tip touches floorY
  const centerX = 0;
  const centerY = floorY + (L / 2) * Math.sin(angleRad);

  // Calculating the absolute highest tip
  const topX = centerX + (L / 2) * Math.cos(angleRad);
  const topY = centerY + (L / 2) * Math.sin(angleRad);

  // Spawning the ball *deeply inside* to prevent missing the top of a steep ramp
  const spawnD = 2.5;
  const spawnX = topX - spawnD * Math.cos(angleRad);
  const spawnY = topY - spawnD * Math.sin(angleRad) + 5.0; // Dropping from way higher!
  
  // Ramp Base
  const [rampRef] = useBox(() => ({
    type: 'Static', args: [L, 0.5, 4], rotation: [0, 0, angleRad], position: [centerX, centerY, 0], friction: params.friction
  }));

  // Guardrails
  useBox(() => ({
    type: 'Static', args: [L, 1, 0.4], rotation: [0, 0, angleRad], position: [centerX, centerY + 0.4, -2.2]
  }));
  useBox(() => ({
    type: 'Static', args: [L, 1, 0.4], rotation: [0, 0, angleRad], position: [centerX, centerY + 0.4, 2.2]
  }));

  const [projectiles, setProjectiles] = useState<{ id: number, pos: [number, number, number] }[]>([]);

  useEffect(() => {
    if (triggers.rampDrop > 0) {
       setProjectiles(prev => [...prev, { id: prev.length, pos: [spawnX, spawnY, 0] }]);
    }
  }, [triggers.rampDrop]);

  useEffect(() => {
    // Drop the balls when parameters resize so they don't get stuck in the air
    setProjectiles([]);
  }, [params.rampAngle, params.rampLength]);

  return (
    <>
      <mesh ref={rampRef as any} receiveShadow castShadow>
        <boxGeometry args={[L, 0.5, 4]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
      </mesh>
      
      {/* Visual guardrails */}
      <mesh position={[centerX, centerY + 0.4, -2.2]} rotation={[0, 0, angleRad]} receiveShadow castShadow>
        <boxGeometry args={[L, 1, 0.4]} />
        <meshStandardMaterial color="#bb86fc" />
      </mesh>
      <mesh position={[centerX, centerY + 0.4, 2.2]} rotation={[0, 0, angleRad]} receiveShadow castShadow>
        <boxGeometry args={[L, 1, 0.4]} />
        <meshStandardMaterial color="#bb86fc" />
      </mesh>

      {/* Visual marker at the spawn drop zone */}
      <mesh position={[spawnX, spawnY, 0]}>
         <sphereGeometry args={[0.2, 16, 16]} />
         <meshBasicMaterial color="#ffb86c" transparent opacity={0.5} />
      </mesh>

      {projectiles.map((p) => <Projectile key={p.id} id={p.id} position={p.pos} />)}
    </>
  );
}

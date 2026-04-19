import { useBox, useHingeConstraint, usePlane } from '@react-three/cannon';
import { useState, useEffect } from 'react';
import type { PhysicsParams } from '../../App';

function SettledWeight({ position, mass, size, color }: any) {
  const [ref] = useBox(() => ({ 
    mass, 
    position, 
    args: [size, size, size],
    friction: 1.0,  // Extremely high friction so it sticks to the plank
    restitution: 0.0, // Absolutely zero bounciness
    angularDamping: 0.9,
    linearDamping: 0.5
  }));

  return (
    <mesh ref={ref as any} castShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

export default function LeverLab({ params, triggers }: { params: PhysicsParams, triggers: Record<string, number> }) {
  // Ground
  usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -3.9, 0], friction: 1.0 }));

  const fulcrumY = -3.9 + 1.25; 
  // Wedge Fulcrum (Static Box scaled down, or a static hidden constraint)
  // We use a Box collider slightly smaller than the visual wedge so it rolls smoothly
  const [fulcrumRef] = useBox(() => ({
    type: 'Static', args: [0.2, 2.5, 2], position: [0, fulcrumY, 0]
  }));

  const leverY = fulcrumY + 1.25 + 0.2; // roughly -1.2
  const [leverRef] = useBox(() => ({
    mass: 50, // Massive weight so it's a sturdy foundation
    args: [12, 0.4, 2], 
    position: [0, leverY, 0], 
    linearDamping: 0.2, 
    angularDamping: 0.95, // Heavy air resistance so it doesn't spin wildly
    friction: 1.0
  }));

  useHingeConstraint(fulcrumRef, leverRef, {
    pivotA: [0, 1.25, 0], 
    pivotB: [0, -0.2, 0], 
    axisA: [0, 0, 1], 
    axisB: [0, 0, 1],
  });

  const [weights, setWeights] = useState<{ id: number, pos: [number, number, number], mass: number, size: number, color: string }[]>([]);

  // Calculate size mathematically so mass visually scales but doesn't get ridiculously huge
  const sizeS = 1.2 * Math.pow(params.leverMassScale, 0.33);
  const targetMass = 10 * params.leverMassScale;

  useEffect(() => {
    if (triggers.leverDropLeft > 0) {
      setWeights(w => [...w, { 
        id: Date.now(), 
        pos: [-4.5, leverY + sizeS + 1.0, 0],  // Dropping extremely close to the board
        mass: targetMass, 
        size: sizeS, 
        color: '#ff5555' 
      }]);
    }
  }, [triggers.leverDropLeft]);

  useEffect(() => {
    if (triggers.leverDropRight > 0) {
      setWeights(w => [...w, { 
        id: Date.now(), 
        pos: [4.5, leverY + sizeS + 1.0, 0], 
        mass: targetMass, 
        size: sizeS, 
        color: '#50fa7b' 
      }]);
    }
  }, [triggers.leverDropRight]);

  return (
    <>
      <mesh position={[0, fulcrumY, 0]} castShadow receiveShadow>
        {/* A 4-sided cone acts as a beautiful pyramid wedge */}
        <coneGeometry args={[1.5, 2.5, 4]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>

      <mesh ref={leverRef as any} castShadow receiveShadow>
        <boxGeometry args={[12, 0.4, 2]} />
         <meshStandardMaterial color="#e8c872" roughness={0.6} />
      </mesh>
      
      {/* Visual Markers for Torque Points safely projected onto the board visually */}
      <mesh position={[-4.5, leverY, 1.1]}>
         <sphereGeometry args={[0.2, 16, 16]} />
         <meshBasicMaterial color="#ff5555" />
      </mesh>
      <mesh position={[4.5, leverY, 1.1]}>
         <sphereGeometry args={[0.2, 16, 16]} />
         <meshBasicMaterial color="#50fa7b" />
      </mesh>

      {weights.map((w) => (
        <SettledWeight key={w.id} mass={w.mass} size={w.size} color={w.color} position={w.pos} />
      ))}
    </>
  );
}

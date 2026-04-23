import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, OrbitControls, ContactShadows, SoftShadows } from '@react-three/drei';
import type { ExperimentType, PhysicsParams } from '../../App';

import PendulumLab from '../experiments/PendulumLab';
import RampLab from '../experiments/RampLab';
import LeverLab from '../experiments/LeverLab';
import BouncingLab from '../experiments/BouncingLab';

interface PlaygroundProps {
  currentExperiment: ExperimentType;
  params: PhysicsParams;
  triggers: Record<string, number>;
}

export default function Playground({ currentExperiment, params, triggers }: PlaygroundProps) {
  const gravityConfig: [number, number, number] = [0, -params.gravity, 0];
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      {/* 
        Key forces recreation of the physics world entirely when resetting parameters 
        or hitting "resetPhysics" trigger
      */}
      <Canvas shadows camera={{ position: [0, 5, 14], fov: 40 }}>
        <SoftShadows size={20} samples={16} focus={0.5} />
        <color attach="background" args={['#06080d']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 15, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-bias={-0.0001}
          shadow-mapSize={[2048, 2048]} 
        />
        <pointLight position={[-10, 5, -10]} intensity={0.6} color="#8be9fd" />
        <pointLight position={[10, -5, 10]} intensity={0.2} color="#ff79c6" />

        <Physics key={`physics-${triggers.resetPhysics}-${currentExperiment}`} gravity={gravityConfig} defaultContactMaterial={{ friction: params.friction, restitution: params.restitution }}>
          {currentExperiment === 'pendulum' && <PendulumLab params={params} />}
          {currentExperiment === 'ramp' && <RampLab key={`ramp-${params.rampAngle}-${params.rampLength}`} params={params} triggers={triggers} />}
          {currentExperiment === 'lever' && <LeverLab key={`lever-${params.leverMassScale}`} params={params} triggers={triggers} />}
          {currentExperiment === 'bouncing' && <BouncingLab key={`bounce-${params.restitution}-${params.dropHeight}`} params={params} />}
        </Physics>

        {/* Beautiful ground reflection/shadow plane */}
        <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={15} color="#000000" position={[0, -3.99, 0]} />
        <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#1a1f2e" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Grid floor overlay */}
        <gridHelper args={[100, 100, '#333b5c', '#151926']} position={[0, -3.98, 0]} />

        <OrbitControls makeDefault enablePan={true} maxPolarAngle={Math.PI / 2 + 0.15} minDistance={3} maxDistance={30} />
        <Environment preset="studio" blur={0.8} />
      </Canvas>
    </div>
  );
}

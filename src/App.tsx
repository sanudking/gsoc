import { useState } from 'react';
import './index.css';
import Playground from './components/scene/Playground';
import Overlay from './components/ui/Overlay';

export type ExperimentType = 'pendulum' | 'ramp' | 'bouncing' | 'lever';

export interface PhysicsParams {
  gravity: number;
  pendulumLength: number;
  pendulumMass: number;
  pendulumAngle: number; // degrees
  rampAngle: number;
  rampLength: number;
  friction: number;
  restitution: number;
  dropHeight: number;
  leverMassScale: number;
}

function App() {
  const [currentExperiment, setCurrentExperiment] = useState<ExperimentType>('pendulum');
  
  const [params, setParams] = useState<PhysicsParams>({
    gravity: 9.81,
    pendulumLength: 4.0,
    pendulumMass: 1.0,
    pendulumAngle: 45,
    rampAngle: 30,
    rampLength: 10,
    friction: 0.1,
    restitution: 0.8,
    dropHeight: 10,
    leverMassScale: 1.0
  });

  const [triggers, setTriggers] = useState({
    rampDrop: 0,
    leverDropLeft: 0,
    leverDropRight: 0,
    resetPhysics: 0
  });

  return (
    <>
      <Playground 
        currentExperiment={currentExperiment} 
        params={params} 
        triggers={triggers} 
      />
      <Overlay 
        currentExperiment={currentExperiment} 
        onSelect={setCurrentExperiment} 
        params={params}
        onParamsChange={(newParams) => setParams(newParams)}
        triggers={triggers}
        onTrigger={(type) => setTriggers(prev => ({ ...prev, [type]: prev[type as keyof typeof triggers] + 1 }))}
      />
    </>
  );
}

export default App;

import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Playground from './components/scene/Playground';
import Overlay from './components/ui/Overlay';
import { HandTrackingProvider, useHandTracking } from './lib/gesture/HandTrackingContext';

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

const EXPERIMENT_ORDER: ExperimentType[] = ['pendulum', 'ramp', 'lever', 'bouncing'];

function AppInner() {
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

  const { gesture, fistHeld, pinchReleased, cursorX, isTracking } = useHandTracking();

  // ── Gesture: Swipe to switch experiments ──
  const switchExperiment = useCallback((direction: 'next' | 'prev') => {
    setCurrentExperiment(prev => {
      const idx = EXPERIMENT_ORDER.indexOf(prev);
      if (direction === 'next') {
        return EXPERIMENT_ORDER[(idx + 1) % EXPERIMENT_ORDER.length];
      } else {
        return EXPERIMENT_ORDER[(idx - 1 + EXPERIMENT_ORDER.length) % EXPERIMENT_ORDER.length];
      }
    });
  }, []);

  useEffect(() => {
    if (!isTracking) return;
    if (gesture === 'swipe_right') {
      switchExperiment('next');
    } else if (gesture === 'swipe_left') {
      switchExperiment('prev');
    }
  }, [gesture, isTracking, switchExperiment]);

  // ── Gesture: Fist held → reset ──
  useEffect(() => {
    if (!isTracking) return;
    if (fistHeld) {
      setTriggers(prev => ({ ...prev, resetPhysics: prev.resetPhysics + 1 }));
    }
  }, [fistHeld, isTracking]);

  // ── Gesture: Pinch release → lab-specific actions ──
  useEffect(() => {
    if (!isTracking || !pinchReleased) return;

    if (currentExperiment === 'ramp') {
      setTriggers(prev => ({ ...prev, rampDrop: prev.rampDrop + 1 }));
    }

    if (currentExperiment === 'lever') {
      // Left half of screen → drop left, right half → drop right
      if (cursorX < 0.5) {
        setTriggers(prev => ({ ...prev, leverDropLeft: prev.leverDropLeft + 1 }));
      } else {
        setTriggers(prev => ({ ...prev, leverDropRight: prev.leverDropRight + 1 }));
      }
    }
  }, [pinchReleased, isTracking, currentExperiment, cursorX]);

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

function App() {
  return (
    <HandTrackingProvider>
      <AppInner />
    </HandTrackingProvider>
  );
}

export default App;

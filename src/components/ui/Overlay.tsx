import type { ExperimentType, PhysicsParams } from '../../App';
import { CircleOff, ArrowRightToLine, MoveUp, Beaker, RotateCcw, Settings2, Calculator, PlaySquare } from 'lucide-react';

interface OverlayProps {
  currentExperiment: ExperimentType;
  onSelect: (exp: ExperimentType) => void;
  params: PhysicsParams;
  onParamsChange: (p: PhysicsParams) => void;
  triggers: Record<string, number>;
  onTrigger: (type: string) => void;
}

export default function Overlay({ currentExperiment, onSelect, params, onParamsChange, onTrigger }: OverlayProps) {
  const experiments: { id: ExperimentType, label: string, icon: any, desc: string }[] = [
    { id: 'pendulum', label: 'Pendulum Lab', icon: CircleOff, desc: 'Simple harmonic motion' },
    { id: 'ramp', label: 'Inclined Plane', icon: ArrowRightToLine, desc: 'Kinematics & forces' },
    { id: 'lever', label: 'Torque Balance', icon: MoveUp, desc: 'Static equilibrium system' },
    { id: 'bouncing', label: 'Elastic Collisions', icon: Beaker, desc: 'Restitution limits' }
  ];

  const Slider = ({ label, min, max, step, value, onChange, unit }: any) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.3rem' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 'bold' }}>{value.toFixed(2)} {unit}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#bb86fc' }}
      />
    </div>
  );

  const MathReadout = ({ label, value, unit, formula }: any) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#50fa7b' }}>{value} <span style={{ fontSize: '0.8rem' }}>{unit}</span></span>
        <code style={{ fontSize: '0.7rem', color: '#ffb86c' }}>{formula}</code>
      </div>
    </div>
  );

  return (
    <div className="ui-layer" style={{ pointerEvents: 'none' }}>
      <div className="ui-content" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', pointerEvents: 'auto' }}>
        
        {/* LEFT PANEL */}
        <div className="glass-panel animate-fade-in" style={{ width: '300px' }}>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.2rem', background: 'linear-gradient(90deg, #bb86fc, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Physics Engine
          </h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Textbook Module Selection</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {experiments.map(exp => {
              const Icon = exp.icon;
              return (
                <button 
                  key={exp.id} className={currentExperiment === exp.id ? 'active' : ''} 
                  onClick={() => onSelect(exp.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}
                >
                  <Icon size={20} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{exp.label}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 400 }}>{exp.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* MATH READOUTS */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Calculator size={16} /> Theoretical Analysis
            </h2>
            {currentExperiment === 'pendulum' && (
              <MathReadout 
                label="Ideal Period" 
                value={(2 * Math.PI * Math.sqrt(params.pendulumLength / params.gravity)).toFixed(2)} 
                unit="s" formula="T = 2π√(L/g)" 
              />
            )}
            {currentExperiment === 'ramp' && (
              <>
                 <MathReadout 
                    label="Height (Vertical)" 
                    value={(params.rampLength * Math.sin(params.rampAngle * Math.PI / 180)).toFixed(2)} 
                    unit="m" formula="h = L·sin(θ)" 
                  />
                 <MathReadout 
                    label="Final Velocity (No Friction)" 
                    value={Math.sqrt(2 * params.gravity * (params.rampLength * Math.sin(params.rampAngle * Math.PI / 180))).toFixed(2)} 
                    unit="m/s" formula="v = √(2gh)" 
                  />
              </>
            )}
            {currentExperiment === 'lever' && (
              <MathReadout 
                label="Balancing Torque" 
                value={(params.leverMassScale * params.gravity * 4.5).toFixed(2)} 
                unit="N·m" formula="τ = r × F (r=4.5)" 
              />
            )}
            {currentExperiment === 'bouncing' && (
              <>
                <MathReadout 
                  label="Impact Velocity" 
                  value={Math.sqrt(2 * params.gravity * params.dropHeight).toFixed(2)} 
                  unit="m/s" formula="v = √(2gh)" 
                />
                <MathReadout 
                  label="First Rebound Height" 
                  value={(params.dropHeight * Math.pow(params.restitution, 2)).toFixed(2)} 
                  unit="m" formula="h₁ = h·e²" 
                />
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - CONTROLS */}
        <div className="glass-panel animate-fade-in" style={{ width: '320px', alignSelf: 'flex-start' }}>
          
          {/* ACTION BUTTONS */}
          <div style={{ marginBottom: '1.5rem' }}>
             <h2 style={{ fontSize: '1.1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <PlaySquare size={18} /> Controls
             </h2>
             <div style={{ display: 'grid', gap: '0.5rem' }}>
              {currentExperiment === 'ramp' && (
                <button onClick={() => onTrigger('rampDrop')} style={{ background: '#03dac6', color: '#000', padding: '0.6rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Drop Ball from Top</button>
              )}
              {currentExperiment === 'lever' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => onTrigger('leverDropLeft')} style={{ flex: 1, background: '#ff79c6', color: '#fff', padding: '0.6rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Drop Left</button>
                  <button onClick={() => onTrigger('leverDropRight')} style={{ flex: 1, background: '#ff79c6', color: '#fff', padding: '0.6rem', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Drop Right</button>
                </div>
              )}
              <button 
                onClick={() => onTrigger('resetPhysics')} 
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <RotateCcw size={16} /> Reset Lab
              </button>
             </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

          <h2 style={{ fontSize: '1.1rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings2 size={18} /> Parameters
          </h2>
          <div style={{ padding: '1rem 0' }}>
            <Slider label="Gravity (g)" min={1} max={25} step={0.1} value={params.gravity} unit="m/s²" onChange={(val: number) => onParamsChange({...params, gravity: val})} />
            
            {currentExperiment === 'pendulum' && (
              <>
                <Slider label="Initial Angle (θ)" min={0} max={90} step={1} value={params.pendulumAngle} unit="°" onChange={(val: number) => onParamsChange({...params, pendulumAngle: val})} />
                <Slider label="String Length (L)" min={1} max={8} step={0.1} value={params.pendulumLength} unit="m" onChange={(val: number) => onParamsChange({...params, pendulumLength: val})} />
                <Slider label="Bob Mass (m)" min={0.1} max={10} step={0.1} value={params.pendulumMass} unit="kg" onChange={(val: number) => onParamsChange({...params, pendulumMass: val})} />
              </>
            )}
            
            {currentExperiment === 'ramp' && (
              <>
                <Slider label="Ramp Angle (θ)" min={10} max={80} step={1} value={params.rampAngle} unit="°" onChange={(val: number) => onParamsChange({...params, rampAngle: val})} />
                <Slider label="Ramp Length (L)" min={5} max={20} step={1} value={params.rampLength} unit="m" onChange={(val: number) => onParamsChange({...params, rampLength: val})} />
                <Slider label="Kinetic Friction (μ)" min={0} max={1} step={0.05} value={params.friction} unit="" onChange={(val: number) => onParamsChange({...params, friction: val})} />
              </>
            )}

            {currentExperiment === 'lever' && (
              <>
                <Slider label="Weight Modifier" min={0.5} max={5} step={0.5} value={params.leverMassScale} unit="x" onChange={(val: number) => onParamsChange({...params, leverMassScale: val})} />
              </>
            )}

            {currentExperiment === 'bouncing' && (
              <>
                 <Slider label="Drop Height" min={2} max={15} step={1} value={params.dropHeight} unit="m" onChange={(val: number) => onParamsChange({...params, dropHeight: val})} />
                 <Slider label="Restitution (e)" min={0} max={1.2} step={0.05} value={params.restitution} unit="" onChange={(val: number) => onParamsChange({...params, restitution: val})} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

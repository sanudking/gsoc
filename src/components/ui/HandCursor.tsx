import { useHandTracking } from '../../lib/gesture/HandTrackingContext';

const GESTURE_HINT: Record<string, string> = {
  open_palm: 'Move to orbit',
  pinch: 'Grabbing...',
  fist: 'Hold to reset',
  point: 'Pointing',
  thumbs_up: 'Nice!',
};

export default function HandCursor() {
  const { isTracking, cursorX, cursorY, gesture, isPinching, fistHeld } = useHandTracking();

  if (!isTracking || gesture === 'none') return null;

  const screenX = cursorX * window.innerWidth;
  const screenY = cursorY * window.innerHeight;

  let className = 'hand-cursor';
  if (isPinching) className += ' pinching';
  if (gesture === 'fist') className += ' fist';
  if (fistHeld) className += ' fist-held';

  return (
    <>
      <div
        className={className}
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
        }}
      />
      {/* Interaction hint */}
      {GESTURE_HINT[gesture] && (
        <div
          className="hand-hint"
          style={{
            left: `${screenX + 20}px`,
            top: `${screenY - 10}px`,
          }}
        >
          {fistHeld ? '🔄 Resetting...' : GESTURE_HINT[gesture]}
        </div>
      )}
    </>
  );
}

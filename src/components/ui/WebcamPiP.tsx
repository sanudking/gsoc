import { useRef, useEffect } from 'react';
import { useHandTracking } from '../../lib/gesture/HandTrackingContext';
import { LM } from '../../lib/gesture/GestureClassifier';

// MediaPipe Hand Connections for drawing skeleton
const HAND_CONNECTIONS = [
  [LM.WRIST, LM.THUMB_CMC], [LM.THUMB_CMC, LM.THUMB_MCP], [LM.THUMB_MCP, LM.THUMB_IP], [LM.THUMB_IP, LM.THUMB_TIP],
  [LM.WRIST, LM.INDEX_MCP], [LM.INDEX_MCP, LM.INDEX_PIP], [LM.INDEX_PIP, LM.INDEX_DIP], [LM.INDEX_DIP, LM.INDEX_TIP],
  [LM.WRIST, LM.MIDDLE_MCP], [LM.MIDDLE_MCP, LM.MIDDLE_PIP], [LM.MIDDLE_PIP, LM.MIDDLE_DIP], [LM.MIDDLE_DIP, LM.MIDDLE_TIP],
  [LM.WRIST, LM.RING_MCP], [LM.RING_MCP, LM.RING_PIP], [LM.RING_PIP, LM.RING_DIP], [LM.RING_DIP, LM.RING_TIP],
  [LM.WRIST, LM.PINKY_MCP], [LM.PINKY_MCP, LM.PINKY_PIP], [LM.PINKY_PIP, LM.PINKY_DIP], [LM.PINKY_DIP, LM.PINKY_TIP],
  [LM.INDEX_MCP, LM.MIDDLE_MCP], [LM.MIDDLE_MCP, LM.RING_MCP], [LM.RING_MCP, LM.PINKY_MCP],
];

const HAND_COLORS = ['#03dac6', '#ff79c6'];

const GESTURE_LABELS: Record<string, string> = {
  none: '',
  open_palm: '🖐️ Palm',
  pinch: '🤏 Pinch',
  fist: '✊ Fist',
  point: '☝️ Point',
  thumbs_up: '👍 Thumbs Up',
  swipe_left: '👈 Swipe Left',
  swipe_right: '👉 Swipe Right',
};

export default function WebcamPiP() {
  const { isTracking, rawResult, videoRef, gesture } = useHandTracking();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);

  // Pipe the webcam stream into the visible video element
  useEffect(() => {
    if (!isTracking || !displayVideoRef.current) return;

    const pipeStream = () => {
      const srcVideo = videoRef.current;
      const dstVideo = displayVideoRef.current;
      if (!srcVideo || !dstVideo) return false;

      const stream = srcVideo.srcObject as MediaStream | null;
      if (stream && stream.active) {
        dstVideo.srcObject = stream;
        dstVideo.play().catch(() => {});
        return true;
      }
      return false;
    };

    // Try immediately
    if (pipeStream()) return;

    // If not ready yet, poll every 100ms until the stream is available
    const interval = setInterval(() => {
      if (pipeStream()) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (displayVideoRef.current) {
        displayVideoRef.current.srcObject = null;
      }
    };
  }, [isTracking, videoRef]);

  // Draw hand skeleton overlay
  useEffect(() => {
    if (!canvasRef.current || !rawResult || !isTracking) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    rawResult.landmarks.forEach((hand, handIdx) => {
      const color = HAND_COLORS[handIdx % HAND_COLORS.length];

      // Draw connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const pa = hand[a];
        const pb = hand[b];
        ctx.beginPath();
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
        ctx.stroke();
      });

      // Draw landmarks
      hand.forEach((lm, lmIdx) => {
        const tipSet: Set<number> = new Set([LM.THUMB_TIP as number, LM.INDEX_TIP as number, LM.MIDDLE_TIP as number, LM.RING_TIP as number, LM.PINKY_TIP as number]);
        const r = tipSet.has(lmIdx) ? 5 : 3;
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, r, 0, 2 * Math.PI);
        ctx.fillStyle = lmIdx === LM.INDEX_TIP ? '#fff' : color;
        ctx.globalAlpha = 1;
        ctx.fill();
      });
    });
  }, [rawResult, isTracking]);

  if (!isTracking) return null;

  return (
    <div className="webcam-pip" ref={containerRef}>
      <video
        ref={displayVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {/* Gesture badge */}
      {gesture !== 'none' && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#fff',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {GESTURE_LABELS[gesture] || gesture}
        </div>
      )}
    </div>
  );
}

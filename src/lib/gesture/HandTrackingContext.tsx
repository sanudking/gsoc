import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { HandTracker, type HandResult } from './HandTracker';
import {
  classifyDualHands,
  resetClassifier,
  isThumbsUpHeld,
  type DualHandState,
  type GestureType,
} from './GestureClassifier';

// ─── Types ───────────────────────────────────────────────────
export interface HandTrackingState {
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;

  /** Primary hand gesture result. */
  gesture: GestureType;
  /** Primary hand cursor in screen-space (0–1). */
  cursorX: number;
  cursorY: number;
  /** Primary hand is pinching. */
  isPinching: boolean;
  /** Primary hand pinch was just released this frame. */
  pinchReleased: boolean;
  /** Primary hand thumbs up held > 1.5s. */
  thumbsUpHeld: boolean;

  /** Full dual-hand state for advanced gestures. */
  dualState: DualHandState;
  /** Previous dualState for transition detection. */
  prevDualState: DualHandState;

  /** Raw landmark data for overlay drawing. */
  rawResult: HandResult | null;

  /** Controls */
  startTracking: () => Promise<void>;
  stopTracking: () => void;

  /** The video element ref for PiP display. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const emptyDualState: DualHandState = {
  primary: null,
  secondary: null,
  twoHandPinchDistance: null,
};

const defaultState: HandTrackingState = {
  isTracking: false,
  isLoading: false,
  error: null,
  gesture: 'none',
  cursorX: 0.5,
  cursorY: 0.5,
  isPinching: false,
  pinchReleased: false,
  thumbsUpHeld: false,
  dualState: emptyDualState,
  prevDualState: emptyDualState,
  rawResult: null,
  startTracking: async () => {},
  stopTracking: () => {},
  videoRef: { current: null },
};

// ─── Context ─────────────────────────────────────────────────
const HandTrackingContext = createContext<HandTrackingState>(defaultState);

export function useHandTracking() {
  return useContext(HandTrackingContext);
}

// ─── Provider ────────────────────────────────────────────────
export function HandTrackingProvider({ children }: { children: ReactNode }) {
  const trackerRef = useRef<HandTracker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs for high-frequency data to avoid re-rendering every frame
  const stateRef = useRef({
    gesture: 'none' as GestureType,
    cursorX: 0.5,
    cursorY: 0.5,
    isPinching: false,
    pinchReleased: false,
    thumbsUpHeld: false,
    dualState: emptyDualState,
    prevDualState: emptyDualState,
    rawResult: null as HandResult | null,
    wasPinching: false,
  });

  // We use a counter state to trigger re-renders at a throttled rate
  const [, setTick] = useState(0);
  const tickIntervalRef = useRef<number | null>(null);

  const handleResult = useCallback((result: HandResult) => {
    const s = stateRef.current;
    s.prevDualState = { ...s.dualState };

    const dual = classifyDualHands(result.landmarks, result.handedness, result.timestamp);
    s.dualState = dual;
    s.rawResult = result;

    if (dual.primary) {
      s.gesture = dual.primary.gesture;
      // Smooth the cursor with simple exponential smoothing
      const alpha = 0.4;
      s.cursorX = s.cursorX + alpha * (dual.primary.cursorX - s.cursorX);
      s.cursorY = s.cursorY + alpha * (dual.primary.cursorY - s.cursorY);
      
      const nowPinching = dual.primary.gesture === 'pinch';
      s.pinchReleased = s.wasPinching && !nowPinching;
      s.isPinching = nowPinching;
      s.wasPinching = nowPinching;
      s.thumbsUpHeld = isThumbsUpHeld(dual.primary.handType, result.timestamp);
    } else {
      s.gesture = 'none';
      s.isPinching = false;
      s.pinchReleased = false;
      s.thumbsUpHeld = false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (isTracking) return;
    setIsLoading(true);
    setError(null);

    try {
      // Create video element if needed
      if (!videoRef.current) {
        const v = document.createElement('video');
        v.setAttribute('autoplay', '');
        v.setAttribute('playsinline', '');
        v.muted = true;
        videoRef.current = v;
      }

      const tracker = new HandTracker();
      trackerRef.current = tracker;

      await tracker.start(videoRef.current, handleResult);

      setIsTracking(true);

      // Throttle UI re-renders to ~20fps for perf
      tickIntervalRef.current = window.setInterval(() => {
        setTick((t) => t + 1);
      }, 50);
    } catch (err: any) {
      console.error('Hand tracking start failed:', err);
      setError(err?.message ?? 'Failed to start camera');
    } finally {
      setIsLoading(false);
    }
  }, [isTracking, handleResult]);

  const stopTracking = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.destroy();
      trackerRef.current = null;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    resetClassifier();
    stateRef.current = {
      gesture: 'none',
      cursorX: 0.5,
      cursorY: 0.5,
      isPinching: false,
      pinchReleased: false,
      thumbsUpHeld: false,
      dualState: emptyDualState,
      prevDualState: emptyDualState,
      rawResult: null,
      wasPinching: false,
    };
    setIsTracking(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.destroy();
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, []);

  const s = stateRef.current;

  const value: HandTrackingState = {
    isTracking,
    isLoading,
    error,
    gesture: s.gesture,
    cursorX: s.cursorX,
    cursorY: s.cursorY,
    isPinching: s.isPinching,
    pinchReleased: s.pinchReleased,
    thumbsUpHeld: s.thumbsUpHeld,
    dualState: s.dualState,
    prevDualState: s.prevDualState,
    rawResult: s.rawResult,
    startTracking,
    stopTracking,
    videoRef,
  };

  return (
    <HandTrackingContext.Provider value={value}>
      {children}
    </HandTrackingContext.Provider>
  );
}

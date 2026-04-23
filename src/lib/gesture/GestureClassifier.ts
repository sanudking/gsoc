import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// ─── MediaPipe Hand Landmark indices ─────────────────────────
// See: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,  THUMB_MCP: 2,  THUMB_IP: 3,   THUMB_TIP: 4,
  INDEX_MCP: 5,  INDEX_PIP: 6,  INDEX_DIP: 7,   INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13,  RING_PIP: 14,  RING_DIP: 15,   RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19,  PINKY_TIP: 20,
} as const;

// ─── Gesture types ───────────────────────────────────────────
export type GestureType =
  | 'none'
  | 'open_palm'
  | 'pinch'
  | 'fist'
  | 'point'
  | 'thumbs_up'
  | 'swipe_left'
  | 'swipe_right';

export interface GestureResult {
  gesture: GestureType;
  confidence: number;
  /** Cursor position in normalized screen coords (0–1), mirrored. */
  cursorX: number;
  cursorY: number;
  /** Euclidean distance between thumb tip and index tip (0–1 range). */
  pinchDistance: number;
  /** Which hand ('Left' | 'Right'). */
  handType: string;
}

export interface DualHandState {
  primary: GestureResult | null;
  secondary: GestureResult | null;
  /** Distance between two-hand pinch points (for zoom). Null if <2 hands. */
  twoHandPinchDistance: number | null;
}

// ─── Velocity tracking for swipe detection ──────────────────
const VELOCITY_BUFFER_SIZE = 6;

interface VelocityBuffer {
  xs: number[];
  ts: number[];
  idx: number;
  filled: boolean;
}

function createVelocityBuffer(): VelocityBuffer {
  return {
    xs: new Array(VELOCITY_BUFFER_SIZE).fill(0),
    ts: new Array(VELOCITY_BUFFER_SIZE).fill(0),
    idx: 0,
    filled: false,
  };
}

function pushVelocitySample(buf: VelocityBuffer, x: number, t: number) {
  buf.xs[buf.idx] = x;
  buf.ts[buf.idx] = t;
  buf.idx = (buf.idx + 1) % VELOCITY_BUFFER_SIZE;
  if (buf.idx === 0) buf.filled = true;
}

function getVelocity(buf: VelocityBuffer): number {
  if (!buf.filled && buf.idx < 2) return 0;
  const count = buf.filled ? VELOCITY_BUFFER_SIZE : buf.idx;
  const oldest = (buf.idx - count + VELOCITY_BUFFER_SIZE) % VELOCITY_BUFFER_SIZE;
  const newest = (buf.idx - 1 + VELOCITY_BUFFER_SIZE) % VELOCITY_BUFFER_SIZE;
  const dt = buf.ts[newest] - buf.ts[oldest];
  if (dt === 0) return 0;
  return (buf.xs[newest] - buf.xs[oldest]) / dt;
}

// ─── Helpers ─────────────────────────────────────────────────
function dist2d(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Returns true if a finger tip is extended (above its PIP joint). */
function isFingerExtended(
  lm: NormalizedLandmark[],
  tipIdx: number,
  pipIdx: number,
): boolean {
  // In MediaPipe, Y increases downward, so tip.y < pip.y means extended
  return lm[tipIdx].y < lm[pipIdx].y;
}

/** Returns true if thumb is extended (away from palm center laterally). */
function isThumbExtended(lm: NormalizedLandmark[]): boolean {
  // Compare thumb tip X vs index MCP X. If thumb sticks out, it's extended.
  const thumbTip = lm[LM.THUMB_TIP];
  const thumbMcp = lm[LM.THUMB_MCP];
  const indexMcp = lm[LM.INDEX_MCP];
  // Use absolute lateral distance from palm center
  const thumbSpread = Math.abs(thumbTip.x - indexMcp.x);
  const baseSpread = Math.abs(thumbMcp.x - indexMcp.x);
  return thumbSpread > baseSpread * 1.2;
}

// ─── Classifier ──────────────────────────────────────────────
const velocityBuffers = new Map<string, VelocityBuffer>();

// Fist hold tracking for long-press detection
const fistStartTimes = new Map<string, number>();
const FIST_HOLD_DURATION = 1500; // ms

// Swipe cooldown
let lastSwipeTime = 0;
const SWIPE_COOLDOWN = 800; // ms

export function classifyGesture(
  landmarks: NormalizedLandmark[],
  handType: string,
  timestamp: number,
): GestureResult {
  const bufKey = handType;
  if (!velocityBuffers.has(bufKey)) {
    velocityBuffers.set(bufKey, createVelocityBuffer());
  }
  const velBuf = velocityBuffers.get(bufKey)!;
  const palmX = landmarks[LM.WRIST].x;
  pushVelocitySample(velBuf, palmX, timestamp);

  // Finger states
  const indexExt = isFingerExtended(landmarks, LM.INDEX_TIP, LM.INDEX_PIP);
  const middleExt = isFingerExtended(landmarks, LM.MIDDLE_TIP, LM.MIDDLE_PIP);
  const ringExt = isFingerExtended(landmarks, LM.RING_TIP, LM.RING_PIP);
  const pinkyExt = isFingerExtended(landmarks, LM.PINKY_TIP, LM.PINKY_PIP);
  const thumbExt = isThumbExtended(landmarks);

  const pinchDist = dist2d(landmarks[LM.THUMB_TIP], landmarks[LM.INDEX_TIP]);

  // Mirror X so the cursor moves in the direction the user expects
  const cursorX = 1 - landmarks[LM.INDEX_TIP].x;
  const cursorY = landmarks[LM.INDEX_TIP].y;

  const allFingersExtended = indexExt && middleExt && ringExt && pinkyExt;
  const allFingersCurled = !indexExt && !middleExt && !ringExt && !pinkyExt;

  let gesture: GestureType = 'none';
  let confidence = 0;

  // ── 1. Pinch ──
  if (pinchDist < 0.06) {
    gesture = 'pinch';
    confidence = 1.0 - pinchDist / 0.06;
  }
  // ── 2. Fist ──
  else if (allFingersCurled && !thumbExt) {
    gesture = 'fist';
    confidence = 0.9;
  }
  // ── 3. Point (only index extended) ──
  else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
    gesture = 'point';
    confidence = 0.85;
  }
  // ── 4. Thumbs up (only thumb extended) ──
  else if (thumbExt && allFingersCurled) {
    gesture = 'thumbs_up';
    confidence = 0.8;
  }
  // ── 5. Open palm ──
  else if (allFingersExtended && thumbExt) {
    gesture = 'open_palm';
    confidence = 0.9;
  }
  // ── 6. Swipe detection (overlaid on open palm) ──
  if (gesture === 'open_palm' || gesture === 'none') {
    const vel = getVelocity(velBuf);
    const now = performance.now();
    // Velocity is in normalized units per ms; threshold ~0.002 is a quick wrist flick
    if (Math.abs(vel) > 0.0015 && now - lastSwipeTime > SWIPE_COOLDOWN) {
      // MediaPipe X is mirrored, so positive velocity = physical left swipe
      if (vel > 0) {
        gesture = 'swipe_left';
        confidence = Math.min(1, Math.abs(vel) / 0.003);
        lastSwipeTime = now;
      } else {
        gesture = 'swipe_right';
        confidence = Math.min(1, Math.abs(vel) / 0.003);
        lastSwipeTime = now;
      }
    }
  }

  // Track fist hold time
  if (gesture === 'fist') {
    if (!fistStartTimes.has(bufKey)) {
      fistStartTimes.set(bufKey, timestamp);
    }
  } else {
    fistStartTimes.delete(bufKey);
  }

  return {
    gesture,
    confidence,
    cursorX,
    cursorY,
    pinchDistance: pinchDist,
    handType,
  };
}

/**
 * Check if fist has been held long enough for a "hold" trigger.
 */
export function isFistHeld(handType: string, currentTimestamp: number): boolean {
  const start = fistStartTimes.get(handType);
  if (start == null) return false;
  return currentTimestamp - start >= FIST_HOLD_DURATION;
}

/**
 * Process both hands and return a DualHandState.
 * Primary hand = right hand (or whichever is available).
 */
export function classifyDualHands(
  allLandmarks: NormalizedLandmark[][],
  handedness: string[],
  timestamp: number,
): DualHandState {
  if (allLandmarks.length === 0) {
    return { primary: null, secondary: null, twoHandPinchDistance: null };
  }

  const results = allLandmarks.map((lm, i) =>
    classifyGesture(lm, handedness[i] ?? 'Unknown', timestamp)
  );

  // Primary = the "Right" hand (which appears as left in mirrored view)
  let primary: GestureResult | null = null;
  let secondary: GestureResult | null = null;

  const rightIdx = results.findIndex((r) => r.handType === 'Right');
  const leftIdx = results.findIndex((r) => r.handType === 'Left');

  if (rightIdx >= 0) {
    primary = results[rightIdx];
    if (leftIdx >= 0) secondary = results[leftIdx];
  } else if (leftIdx >= 0) {
    primary = results[leftIdx];
    if (results.length > 1) {
      secondary = results.find((_, i) => i !== leftIdx) ?? null;
    }
  } else {
    primary = results[0];
    if (results.length > 1) secondary = results[1];
  }

  // Two-hand pinch distance (for zoom)
  let twoHandPinchDistance: number | null = null;
  if (allLandmarks.length >= 2) {
    const p1 = allLandmarks[0][LM.INDEX_TIP];
    const p2 = allLandmarks[1][LM.INDEX_TIP];
    twoHandPinchDistance = dist2d(p1, p2);
  }

  return { primary, secondary, twoHandPinchDistance };
}

/**
 * Reset all internal tracking state (call on mode toggle).
 */
export function resetClassifier(): void {
  velocityBuffers.clear();
  fistStartTimes.clear();
  lastSwipeTime = 0;
}

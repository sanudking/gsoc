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
  | 'thumbs_up';

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

// Thumbs up hold tracking for reset detection
const thumbsUpStartTimes = new Map<string, number>();
const THUMBS_UP_HOLD_DURATION = 1500; // ms

export function classifyGesture(
  landmarks: NormalizedLandmark[],
  handType: string,
  timestamp: number,
): GestureResult {
  const bufKey = handType;

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

  // Track thumbs up hold time
  if (gesture === 'thumbs_up') {
    if (!thumbsUpStartTimes.has(bufKey)) {
      thumbsUpStartTimes.set(bufKey, timestamp);
    }
  } else {
    thumbsUpStartTimes.delete(bufKey);
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
 * Check if thumbs_up has been held long enough for a "hold" trigger.
 */
export function isThumbsUpHeld(handType: string, currentTimestamp: number): boolean {
  const start = thumbsUpStartTimes.get(handType);
  if (start == null) return false;
  return currentTimestamp - start >= THUMBS_UP_HOLD_DURATION;
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
  thumbsUpStartTimes.clear();
}

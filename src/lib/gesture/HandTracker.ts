import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandResult {
  landmarks: NormalizedLandmark[][];   // up to 2 hands, 21 landmarks each
  handedness: string[];                // 'Left' | 'Right' per hand
  timestamp: number;
}

export type HandResultCallback = (result: HandResult) => void;

/**
 * Core hand-tracking engine wrapping MediaPipe HandLandmarker.
 * Manages webcam lifecycle and runs detection in a rAF loop.
 */
export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private callback: HandResultCallback | null = null;
  private lastTimestamp = -1;
  private _isRunning = false;

  get isRunning() {
    return this._isRunning;
  }

  /**
   * Initialize the MediaPipe Hand Landmarker model.
   * This downloads WASM + model files on first call (~5MB).
   */
  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  /**
   * Start the webcam and begin the detection loop.
   */
  async start(
    videoElement: HTMLVideoElement,
    callback: HandResultCallback,
  ): Promise<void> {
    if (!this.handLandmarker) {
      await this.init();
    }

    this.videoElement = videoElement;
    this.callback = callback;

    // Request camera
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
    });
    this.videoElement.srcObject = this.stream;

    // Wait for video metadata to load
    await new Promise<void>((resolve) => {
      if (this.videoElement!.readyState >= 2) {
        resolve();
      } else {
        this.videoElement!.onloadeddata = () => resolve();
      }
    });

    // Explicitly play the video (autoplay attr alone isn't reliable on programmatic elements)
    await this.videoElement.play();

    this._isRunning = true;
    this.detect();
  }

  /**
   * Internal rAF detection loop.
   */
  private detect = () => {
    if (!this._isRunning || !this.videoElement || !this.handLandmarker) return;

    const now = performance.now();

    // Guard against duplicate timestamps (some browsers)
    if (now !== this.lastTimestamp) {
      this.lastTimestamp = now;

      const result = this.handLandmarker.detectForVideo(this.videoElement, now);

      if (this.callback) {
        this.callback({
          landmarks: result.landmarks ?? [],
          handedness: (result.handednesses ?? []).map(
            (h) => h[0]?.categoryName ?? 'Unknown'
          ),
          timestamp: now,
        });
      }
    }

    this.animFrameId = requestAnimationFrame(this.detect);
  };

  /**
   * Stop tracking and release all resources.
   */
  stop(): void {
    this._isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Full cleanup including model disposal.
   */
  destroy(): void {
    this.stop();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}

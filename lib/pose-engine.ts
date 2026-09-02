import { meanVisibility } from "./geometry";
import { countMissingLandmarks } from "./pose-diagnostics";
import { CORE_JOINTS, toSkeleton } from "./skeleton";
import type { PoseLandmark, Skeleton } from "./types";

type MediaPipePoseLandmarker = {
  detect: (
    image: HTMLCanvasElement,
  ) => { landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>> };
  close: () => void;
};

export type PoseDetection = {
  landmarks: Skeleton;
  confidence: number;
  inferenceMs: number;
  missingLandmarkCount: number;
} | null;

export type SquarePad = {
  size: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
};

/**
 * Legacy mapper from when we letterboxed to a square before detect().
 * MediaPipe now receives the rectangular analysis frame; keep this for tests
 * and any caller that still has square-tensor coordinates.
 */
export function mapLandmarkFromSquare(
  landmark: { x: number; y: number; z: number; visibility?: number },
  pad: SquarePad,
): PoseLandmark {
  return {
    x: (landmark.x * pad.size - pad.dx) / pad.width,
    y: (landmark.y * pad.size - pad.dy) / pad.height,
    z: landmark.z,
    visibility: landmark.visibility ?? 0.5,
  };
}

function toLandmark(raw: { x: number; y: number; z: number; visibility?: number }): PoseLandmark {
  return { x: raw.x, y: raw.y, z: raw.z, visibility: raw.visibility ?? 0.5 };
}

export class PoseEngine {
  private landmarker: MediaPipePoseLandmarker | null = null;

  async load(): Promise<void> {
    if (this.landmarker) return;
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    const options = {
      baseOptions: {
        modelAssetPath: "/models/pose_landmarker_lite.task",
        delegate: "GPU" as const,
      },
      // IMAGE mode: each seeked frame is independent. VIDEO mode tracks across
      // time and, with 100ms seek gaps, leaves the skeleton on a stale pose.
      runningMode: "IMAGE" as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
      outputSegmentationMasks: false,
    };
    try {
      this.landmarker = (await PoseLandmarker.createFromOptions(vision, options)) as MediaPipePoseLandmarker;
    } catch {
      this.landmarker = (await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: "CPU" },
      })) as MediaPipePoseLandmarker;
    }
  }

  detect(canvas: HTMLCanvasElement): PoseDetection {
    if (!this.landmarker) throw new Error("The on-device pose model is not ready.");
    const started = performance.now();
    const result = this.landmarker.detect(canvas);
    const inferenceMs = performance.now() - started;
    const raw = result.landmarks[0];
    if (!raw || raw.length < 29) return null;
    const landmarks = toSkeleton(raw.map(toLandmark));
    return {
      landmarks,
      confidence: meanVisibility(landmarks, CORE_JOINTS),
      inferenceMs,
      missingLandmarkCount: countMissingLandmarks(landmarks),
    };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

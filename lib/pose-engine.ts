import { meanVisibility } from "./geometry";
import { CORE_JOINTS, toSkeleton } from "./skeleton";
import type { PoseLandmark, Skeleton } from "./types";

type MediaPipePoseLandmarker = {
  detectForVideo: (
    image: HTMLCanvasElement,
    timestampMs: number,
  ) => { landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>> };
  close: () => void;
};

export type PoseDetection = { landmarks: Skeleton; confidence: number } | null;

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
      runningMode: "VIDEO" as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.48,
      minPosePresenceConfidence: 0.48,
      minTrackingConfidence: 0.48,
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

  detect(canvas: HTMLCanvasElement, timestampMs: number): PoseDetection {
    if (!this.landmarker) throw new Error("The on-device pose model is not ready.");
    const result = this.landmarker.detectForVideo(canvas, timestampMs);
    const raw = result.landmarks[0];
    if (!raw || raw.length < 29) return null;
    const normalized: PoseLandmark[] = raw.map((landmark) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility ?? 0.5,
    }));
    const landmarks = toSkeleton(normalized);
    return { landmarks, confidence: meanVisibility(landmarks, CORE_JOINTS) };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

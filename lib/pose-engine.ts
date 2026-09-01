import { meanVisibility } from "./geometry";
import { CORE_JOINTS, toSkeleton } from "./skeleton";
import type { PoseLandmark, Skeleton } from "./types";

type MediaPipePoseLandmarker = {
  detect: (
    image: HTMLCanvasElement,
  ) => { landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>> };
  close: () => void;
};

export type PoseDetection = { landmarks: Skeleton; confidence: number } | null;

export type SquarePad = {
  size: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
};

/** Map a landmark from a square letterboxed tensor back onto the source frame. */
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

function padToSquare(source: HTMLCanvasElement, target: HTMLCanvasElement): SquarePad {
  const size = Math.max(source.width, source.height);
  if (target.width !== size || target.height !== size) {
    target.width = size;
    target.height = size;
  }
  const dx = Math.floor((size - source.width) / 2);
  const dy = Math.floor((size - source.height) / 2);
  const context = target.getContext("2d", { alpha: false });
  if (!context) throw new Error("SwingLens could not create a pose canvas.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, size, size);
  context.drawImage(source, dx, dy);
  return { size, dx, dy, width: source.width, height: source.height };
}

export class PoseEngine {
  private landmarker: MediaPipePoseLandmarker | null = null;
  private padCanvas: HTMLCanvasElement | null = null;

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
    this.padCanvas ??= document.createElement("canvas");
    const pad = padToSquare(canvas, this.padCanvas);
    const result = this.landmarker.detect(this.padCanvas);
    const raw = result.landmarks[0];
    if (!raw || raw.length < 29) return null;
    const normalized = raw.map((landmark) => mapLandmarkFromSquare(landmark, pad));
    const landmarks = toSkeleton(normalized);
    return { landmarks, confidence: meanVisibility(landmarks, CORE_JOINTS) };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.padCanvas = null;
  }
}

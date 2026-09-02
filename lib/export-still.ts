import { EMPHASIZED_POINTS, SKELETON_CONNECTIONS, SKELETON_POINTS } from "./skeleton";
import { getExportStillDimensions } from "./analysis-resolution";
import type { PoseLandmark, Skeleton } from "./types";

function waitSeeked(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Could not seek the video for an export still."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onDone);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onDone, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

export function drawSkeletonOverlay(
  context: CanvasRenderingContext2D,
  landmarks: Skeleton,
  width: number,
  height: number,
  contactPlaneX?: number,
): void {
  const px = (point: PoseLandmark) => point.x * width;
  const py = (point: PoseLandmark) => point.y * height;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (contactPlaneX !== undefined) {
    context.strokeStyle = "rgba(201, 255, 82, 0.85)";
    context.setLineDash([8, 6]);
    context.lineWidth = Math.max(2, width * 0.003);
    context.beginPath();
    context.moveTo(contactPlaneX * width, height * 0.02);
    context.lineTo(contactPlaneX * width, height * 0.98);
    context.stroke();
    context.setLineDash([]);
  }
  context.strokeStyle = "#c9ff52";
  context.lineWidth = Math.max(2, width * 0.004);
  for (const [from, to] of SKELETON_CONNECTIONS) {
    context.beginPath();
    context.moveTo(px(landmarks[from]), py(landmarks[from]));
    context.lineTo(px(landmarks[to]), py(landmarks[to]));
    context.stroke();
  }
  for (const joint of SKELETON_POINTS) {
    const radius = EMPHASIZED_POINTS.includes(joint) ? width * 0.01 : width * 0.007;
    context.fillStyle = "#f5f1e8";
    context.beginPath();
    context.arc(px(landmarks[joint]), py(landmarks[joint]), radius, 0, Math.PI * 2);
    context.fill();
  }
}

/** High-res still for download. Uses source pixels up to EXPORT_LONG_EDGE; never the 480px thumbnail. */
export async function renderExportStill(options: {
  videoSrc: string;
  timestampMs: number;
  landmarks: Skeleton;
  sourceWidth: number;
  sourceHeight: number;
  contactPlaneX?: number;
}): Promise<Blob> {
  const size = getExportStillDimensions(options.sourceWidth, options.sourceHeight);
  const video = document.createElement("video");
  video.src = options.videoSrc;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("Could not decode the video for an export still.")), { once: true });
  });
  const seconds = options.timestampMs / 1000;
  if (Math.abs(video.currentTime - seconds) > 0.002) {
    const seeked = waitSeeked(video);
    video.currentTime = seconds;
    await seeked;
  }
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create an export canvas.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(video, 0, 0, size.width, size.height);
  drawSkeletonOverlay(context, options.landmarks, size.width, size.height, options.contactPlaneX);
  video.removeAttribute("src");
  video.load();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the export still."))), "image/png");
  });
}

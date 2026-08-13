import { PoseEngine } from "./pose-engine";
import type { PoseFrame } from "./types";

// Sample budget (maxSamples) is what actually bounds on-device inference work,
// not clip length — a longer clip just spreads the same 72 samples thinner.
// This is a sanity ceiling for accidental non-swing uploads, not a real limit.
export const MAX_ANALYZED_SECONDS = 60;

export type VideoAnalysisOutput = {
  frames: PoseFrame[];
  expectedSamples: number;
  durationMs: number;
  sourceWidth: number;
  sourceHeight: number;
  analyzedWidth: number;
  analyzedHeight: number;
  truncated: boolean;
};

function waitForEvent(target: HTMLMediaElement, event: "loadedmetadata" | "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onDone);
      target.removeEventListener("error", onError);
    };
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("This browser could not decode the video. Try an MP4 or MOV file."));
    };
    target.addEventListener(event, onDone, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function seek(video: HTMLVideoElement, seconds: number): Promise<void> {
  if (Math.abs(video.currentTime - seconds) < 0.002 && video.readyState >= 2) return;
  const ready = waitForEvent(video, "seeked");
  video.currentTime = seconds;
  await ready;
}

function enhancedFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const sourceLong = Math.max(video.videoWidth, video.videoHeight);
  const targetLong = Math.min(720, Math.max(640, sourceLong));
  const scale = targetLong / sourceLong;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  if (!context) throw new Error("SwingLens could not create a frame canvas.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "contrast(1.055) saturate(0.97)";
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  return canvas;
}

function preview(frame: HTMLCanvasElement): string {
  const targetWidth = Math.min(480, frame.width);
  const scale = targetWidth / frame.width;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = Math.max(1, Math.round(frame.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return "";
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(frame, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function analyzeVideoFile(
  file: File,
  engine: PoseEngine,
  onProgress: (completed: number, total: number, stage: string) => void,
): Promise<VideoAnalysisOutput> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;

  try {
    await waitForEvent(video, "loadedmetadata");
    if (video.readyState < 2) await waitForEvent(video, "loadeddata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("SwingLens could not read the video duration.");
    }
    const durationSeconds = Math.min(video.duration, MAX_ANALYZED_SECONDS);
    const targetFps = 10;
    const maxSamples = 72;
    const expectedSamples = Math.max(8, Math.min(maxSamples, Math.ceil(durationSeconds * targetFps)));
    const lastTime = Math.max(0, durationSeconds - 0.025);
    const times = Array.from({ length: expectedSamples }, (_, index) =>
      expectedSamples === 1 ? 0 : (lastTime * index) / (expectedSamples - 1),
    );

    onProgress(0, expectedSamples, "Loading the on-device pose model");
    await engine.load();
    const frames: PoseFrame[] = [];
    let analyzedWidth = 0;
    let analyzedHeight = 0;

    for (let index = 0; index < times.length; index += 1) {
      await seek(video, times[index]);
      const canvas = enhancedFrame(video);
      analyzedWidth = canvas.width;
      analyzedHeight = canvas.height;
      const timestampMs = Math.round(times[index] * 1000) + index * 0.001;
      const detection = engine.detect(canvas, timestampMs);
      if (detection) {
        frames.push({
          timestampMs: Math.round(times[index] * 1000),
          landmarks: detection.landmarks,
          confidence: detection.confidence,
          previewDataUrl: preview(canvas),
        });
      }
      onProgress(index + 1, expectedSamples, index < expectedSamples * 0.72 ? "Enhancing frames · tracking joints" : "Finding swing checkpoints");
      if (index % 3 === 0) await nextPaint();
    }

    return {
      frames,
      expectedSamples,
      durationMs: Math.round(durationSeconds * 1000),
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      analyzedWidth,
      analyzedHeight,
      truncated: video.duration > MAX_ANALYZED_SECONDS,
    };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

import { PoseEngine } from "./pose-engine";
import { distance, midpoint, torsoScale } from "./geometry";
import type { PoseFrame, Skeleton } from "./types";

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

function evenlySpaced(durationSeconds: number, fps: number, maxSamples: number): number[] {
  const count = Math.max(8, Math.min(maxSamples, Math.ceil(durationSeconds * fps)));
  const lastTime = Math.max(0, durationSeconds - 0.02);
  return Array.from({ length: count }, (_, index) =>
    count === 1 ? 0 : (lastTime * index) / (count - 1),
  );
}

function handCenter(landmarks: Skeleton) {
  return midpoint(landmarks.leftHand, landmarks.rightHand);
}

/** Seconds covering the actual swing, padded, from coarse pose samples. */
export function swingWindowSeconds(frames: PoseFrame[], durationSeconds: number): { start: number; end: number } | null {
  if (frames.length < 6) return null;
  const origin = frames[0].landmarks;
  const originHands = {
    ...handCenter(origin),
    x: handCenter(origin).x - origin.centerHip.x,
    y: handCenter(origin).y - origin.centerHip.y,
  };
  const travel = frames.map((frame) => {
    const scale = torsoScale(frame.landmarks);
    const hands = handCenter(frame.landmarks);
    const relative = { ...hands, x: hands.x - frame.landmarks.centerHip.x, y: hands.y - frame.landmarks.centerHip.y };
    return distance(relative, originHands) / scale;
  });
  const peak = Math.max(...travel);
  if (peak < 0.28) return null;
  const threshold = peak * 0.16;
  let startIndex = 0;
  for (let index = 0; index < travel.length; index += 1) {
    if (travel[index] >= threshold) {
      startIndex = index;
      break;
    }
  }
  let endIndex = travel.length - 1;
  for (let index = travel.length - 1; index > startIndex; index -= 1) {
    if (travel[index] >= threshold) {
      endIndex = index;
      break;
    }
  }
  const pad = 0.55;
  const start = Math.max(0, frames[startIndex].timestampMs / 1000 - pad);
  const end = Math.min(durationSeconds, frames[endIndex].timestampMs / 1000 + pad);
  return end - start >= 0.45 ? { start, end } : null;
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
    onProgress(0, 1, "Loading the on-device pose model");
    await engine.load();

    const coarseTimes = evenlySpaced(durationSeconds, 12, 48);
    let analyzedWidth = 0;
    let analyzedHeight = 0;
    let completed = 0;

    const detectTimes = async (times: number[], stage: string, total: number): Promise<PoseFrame[]> => {
      const frames: PoseFrame[] = [];
      for (let index = 0; index < times.length; index += 1) {
        await seek(video, times[index]);
        const canvas = enhancedFrame(video);
        analyzedWidth = canvas.width;
        analyzedHeight = canvas.height;
        const detection = engine.detect(canvas);
        if (detection) {
          frames.push({
            timestampMs: Math.round(times[index] * 1000),
            landmarks: detection.landmarks,
            confidence: detection.confidence,
            previewDataUrl: preview(canvas),
          });
        }
        completed += 1;
        onProgress(completed, total, stage);
        if (index % 3 === 0) await nextPaint();
      }
      return frames;
    };

    const coarse = await detectTimes(coarseTimes, "Finding the swing window", coarseTimes.length + 36);
    const window = swingWindowSeconds(coarse, durationSeconds);
    let frames = coarse;
    let attempted = coarseTimes.length;
    if (window) {
      const denseTimes = evenlySpaced(window.end - window.start, 30, 90).map((time) => window.start + time);
      const dense = await detectTimes(denseTimes, "Tracking joints through the swing", coarseTimes.length + denseTimes.length);
      if (dense.length >= 8) {
        frames = dense;
        attempted = denseTimes.length;
      }
    }

    return {
      frames,
      expectedSamples: attempted,
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

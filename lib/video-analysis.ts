import { PoseEngine } from "./pose-engine";
import { ObjectEngine } from "./object-engine";
import { openFrameReader } from "./frame-reader";
import { OnlineObjectTracker, type ObjectTrackFrame } from "./object-tracking";
import type { ObjectKind } from "./object-tracking";
import {
  DEFAULT_ANALYSIS_QUALITY,
  getAnalysisDimensions,
  getThumbnailDimensions,
  type AnalysisQuality,
} from "./analysis-resolution";
import { recordPoseDiagnostics, type PoseRunDiagnostics } from "./pose-diagnostics";
import { axisAngleDifference, distance, lineAngleDegrees, midpoint, torsoScale } from "./geometry";
import type { Handedness, PoseFrame, Skeleton } from "./types";

export const MAX_ANALYZED_SECONDS = 60;
/** @deprecated Use getAnalysisDimensions with quality "quality". */
export const POSE_LONG_EDGE = 1280;
/** Thumbnail JPEG only. Not the review background. */
export const PREVIEW_MAX_WIDTH = 480;
const COARSE_FPS = 12;
const COARSE_MAX_SAMPLES = 48;
const DENSE_MAX_FPS = 120;
const DENSE_MAX_SAMPLES = 240;

export type VideoAnalysisOutput = {
  frames: PoseFrame[];
  expectedSamples: number;
  durationMs: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceFps: number;
  denseFps: number;
  analyzedWidth: number;
  analyzedHeight: number;
  truncated: boolean;
  quality: AnalysisQuality;
  diagnostics: PoseRunDiagnostics;
  objectFrames?: ObjectTrackFrame[];
  objectError?: string;
  objectInferenceMs?: number;
  objectTiled?: boolean;
  /** Requested sampling rate is not a claim about unique decoded frame rate. */
  effectiveSampleFps?: number;
  timestampMode?: "decoded-pts" | "seek-estimate";
};

export type AnalyzeVideoOptions = {
  quality?: AnalysisQuality;
  /** Low-light lift on the MediaPipe canvas only. Never applied to playback. */
  enhanceInference?: boolean;
  tiledObjects?: boolean;
  sourceFps?: number;
  signal?: AbortSignal;
  objectKinds?: ObjectKind[];
};

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void,
  ) => number;
};

function waitForEvent(target: HTMLMediaElement, event: "loadedmetadata" | "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Video ${event} timed out. Try a shorter MP4 clip.`));
    }, 15000);
    const cleanup = () => {
      window.clearTimeout(timeout);
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

function snapFps(raw: number): number {
  const common = [24, 25, 30, 48, 50, 60, 120];
  let nearest = 30;
  let best = Infinity;
  for (const rate of common) {
    const error = Math.abs(raw - rate);
    if (error < best) {
      best = error;
      nearest = rate;
    }
  }
  return best / raw < 0.12 ? nearest : Math.round(Math.min(120, Math.max(24, raw)));
}

/** Count real presented frames. Do not invent in-between frames. */
async function estimateSourceFps(video: HTMLVideoElement): Promise<number> {
  const requestFrame = (video as FrameCallbackVideo).requestVideoFrameCallback;
  if (!requestFrame) return 30;

  const times: number[] = [];
  // Slow presentation so a 60 Hz display can expose 120 fps source deltas.
  video.playbackRate = 0.25;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.pause();
      video.playbackRate = 1;
      resolve();
    };
    const onFrame = (_now: number, metadata: { mediaTime: number }) => {
      if (settled) return;
      times.push(metadata.mediaTime);
      if (times.length >= 20 || (times.length >= 8 && metadata.mediaTime - times[0] >= 0.35)) {
        finish();
        return;
      }
      requestFrame.call(video, onFrame);
    };
    requestFrame.call(video, onFrame);
    const playback = video.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => finish());
    window.setTimeout(finish, 1600);
  });

  if (times.length < 3) return 30;
  const deltas: number[] = [];
  for (let index = 1; index < times.length; index += 1) {
    const delta = times[index] - times[index - 1];
    if (delta > 0.008 && delta < 0.12) deltas.push(delta);
  }
  if (!deltas.length) return 30;
  deltas.sort((a, b) => a - b);
  return snapFps(1 / deltas[Math.floor(deltas.length / 2)]);
}

function analysisFrame(
  video: HTMLVideoElement,
  size: { width: number; height: number },
  enhanceInference: boolean,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  if (!context) throw new Error("SwingLens could not create a frame canvas.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // Low-light lift is inference-only and never applied to the review <video>.
  if (enhanceInference) context.filter = "contrast(1.055) saturate(0.97)";
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (enhanceInference) context.filter = "none";
  return canvas;
}

function thumbnailJpeg(frame: HTMLCanvasElement, sourceWidth: number, sourceHeight: number): string {
  const size = getThumbnailDimensions(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
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

function firstCrossing(values: number[], threshold: number): number {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] >= threshold) return index;
  }
  return 0;
}

function lastCrossing(values: number[], threshold: number, after: number): number {
  for (let index = values.length - 1; index > after; index -= 1) {
    if (values[index] >= threshold) return index;
  }
  return values.length - 1;
}

/**
 * 2D proxy for "the lower body started the swing."
 * Hip-line angle change (rotation in the camera plane), pelvis shift over the
 * feet, and knee travel. Lead-knee travel is weighted when stance is known.
 */
function lowerBodyOnset(frame: Skeleton, origin: Skeleton, handedness?: Handedness): number {
  const scale = torsoScale(frame);
  const hipRotate = axisAngleDifference(
    lineAngleDegrees(frame.leftHipJoint, frame.rightHipJoint),
    lineAngleDegrees(origin.leftHipJoint, origin.rightHipJoint),
  ) / 45;
  const originBase = midpoint(origin.leftFoot, origin.rightFoot);
  const frameBase = midpoint(frame.leftFoot, frame.rightFoot);
  const originPelvis = {
    x: origin.centerHip.x - originBase.x,
    y: origin.centerHip.y - originBase.y,
    z: 0,
    visibility: 1,
  };
  const framePelvis = {
    x: frame.centerHip.x - frameBase.x,
    y: frame.centerHip.y - frameBase.y,
    z: 0,
    visibility: 1,
  };
  const pelvisShift = distance(framePelvis, originPelvis) / scale;
  const bothKnees =
    (distance(frame.leftKnee, origin.leftKnee) + distance(frame.rightKnee, origin.rightKnee)) / (2 * scale);
  const leadKnee = handedness
    ? distance(
        handedness === "right" ? frame.leftKnee : frame.rightKnee,
        handedness === "right" ? origin.leftKnee : origin.rightKnee,
      ) / scale
    : bothKnees;
  return hipRotate * 1.1 + pelvisShift * 1.6 + bothKnees * 0.5 + leadKnee * 0.7;
}

function handTravelFromOrigin(frame: Skeleton, origin: Skeleton): number {
  const originHands = {
    x: handCenter(origin).x - origin.centerHip.x,
    y: handCenter(origin).y - origin.centerHip.y,
    z: 0,
    visibility: 1,
  };
  const hands = handCenter(frame);
  const relative = { x: hands.x - frame.centerHip.x, y: hands.y - frame.centerHip.y, z: 0, visibility: 1 };
  return distance(relative, originHands) / torsoScale(frame);
}

/**
 * Seconds covering the swing. Start = lower-body rotation onset (hips/knees
 * over the feet). End = last large hand travel (upper-body follow-through).
 */
export function swingWindowSeconds(
  frames: PoseFrame[],
  durationSeconds: number,
  handedness?: Handedness,
): { start: number; end: number } | null {
  if (frames.length < 6) return null;
  const origin = frames[0].landmarks;
  const lower = frames.map((frame) => lowerBodyOnset(frame.landmarks, origin, handedness));
  const hands = frames.map((frame) => handTravelFromOrigin(frame.landmarks, origin));
  const lowerPeak = Math.max(...lower);
  const handPeak = Math.max(...hands);
  if (handPeak < 0.22 && lowerPeak < 0.12) return null;

  const useLowerStart = lowerPeak >= 0.1;
  const startSeries = useLowerStart ? lower : hands;
  const startPeak = Math.max(...startSeries);
  const startIndex = firstCrossing(startSeries, startPeak * 0.16);
  const endIndex = lastCrossing(hands, Math.max(handPeak, 1e-6) * 0.16, startIndex);
  const pad = 0.55;
  const start = Math.max(0, frames[startIndex].timestampMs / 1000 - pad);
  const end = Math.min(durationSeconds, frames[endIndex].timestampMs / 1000 + pad);
  return end - start >= 0.45 ? { start, end } : null;
}

export async function analyzeVideoFile(
  file: File,
  engine: PoseEngine,
  onProgress: (completed: number, total: number, stage: string) => void,
  handedness?: Handedness,
  options: AnalyzeVideoOptions = {},
): Promise<VideoAnalysisOutput> {
  const quality = options.quality ?? DEFAULT_ANALYSIS_QUALITY;
  const enhanceInference = options.enhanceInference ?? false;
  const checkCancelled = () => options.signal?.throwIfAborted();
  const objects = new ObjectEngine();
  let reader: Awaited<ReturnType<typeof openFrameReader>> | undefined;
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
    onProgress(0, 1, "Reading the camera frame rate");
    checkCancelled();
    const analysisSize = getAnalysisDimensions(video.videoWidth, video.videoHeight, quality);
    try { reader = await openFrameReader(file, Math.max(analysisSize.width, analysisSize.height)); }
    catch { /* HTMLVideoElement remains a supported, explicitly labeled fallback. */ }
    const sourceFps = reader?.fps && Number.isFinite(reader.fps) ? reader.fps
      : options.sourceFps && [24, 30, 60, 120, 240].includes(options.sourceFps)
      ? options.sourceFps : await estimateSourceFps(video);
    video.pause();
    await seek(video, 0);
    const denseFps = Math.min(sourceFps, DENSE_MAX_FPS);
    const readFrame = async (seconds: number, enhance: boolean) => {
      if (!reader) {
        await seek(video, seconds);
        return { canvas: analysisFrame(video, analysisSize, enhance), timestampMs: seconds * 1000 };
      }
      const sample = await reader.sink.getCanvas(seconds);
      if (!sample) return null;
      const canvas = document.createElement("canvas");
      canvas.width = sample.canvas.width;
      canvas.height = sample.canvas.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Cannot create the decoded frame canvas.");
      if (enhance) context.filter = "contrast(1.055) saturate(0.97)";
      context.drawImage(sample.canvas, 0, 0);
      return { canvas, timestampMs: sample.timestamp * 1000 };
    };

    onProgress(0, 1, "Loading the on-device pose model");
    await engine.load();

    const coarseTimes = evenlySpaced(durationSeconds, COARSE_FPS, COARSE_MAX_SAMPLES);
    let completed = 0;
    let preprocessTotal = 0;
    let inferenceTotal = 0;
    let missingTotal = 0;
    let visibilityTotal = 0;
    let preprocessCount = 0;
    let poseCount = 0;

    const detectTimes = async (times: number[], stage: string, total: number): Promise<PoseFrame[]> => {
      const frames: PoseFrame[] = [];
      const seen = new Set<number>();
      for (let index = 0; index < times.length; index += 1) {
        checkCancelled();
        const preprocessStarted = performance.now();
        const sample = await readFrame(times[index], enhanceInference);
        if (!sample || seen.has(sample.timestampMs)) continue;
        seen.add(sample.timestampMs);
        const { canvas, timestampMs } = sample;
        preprocessTotal += performance.now() - preprocessStarted;
        preprocessCount += 1;
        const detection = engine.detect(canvas);
        if (detection) {
          poseCount += 1;
          inferenceTotal += detection.inferenceMs;
          missingTotal += detection.missingLandmarkCount;
          visibilityTotal += detection.confidence;
          frames.push({
            timestampMs,
            landmarks: detection.landmarks,
            confidence: detection.confidence,
            previewDataUrl: thumbnailJpeg(canvas, video.videoWidth, video.videoHeight),
            ball: null,
          });
        }
        completed += 1;
        onProgress(completed, total, stage);
        if (index % 3 === 0) await nextPaint();
      }
      return frames;
    };

    const coarse = await detectTimes(coarseTimes, "Finding the swing window", coarseTimes.length + 36);
    const window = swingWindowSeconds(coarse, durationSeconds, handedness);
    let frames = coarse;
    let finalTimes = coarseTimes;
    let attempted = coarseTimes.length;
    if (window) {
      const denseTimes = evenlySpaced(window.end - window.start, denseFps, DENSE_MAX_SAMPLES).map(
        (time) => window.start + time,
      );
      const dense = await detectTimes(
        denseTimes,
        "Tracking joints through the swing",
        coarseTimes.length + denseTimes.length,
      );
      if (dense.length >= 8) {
        frames = dense;
        attempted = denseTimes.length;
        finalTimes = denseTimes;
      }
    }

    // Objects do not depend on pose detection succeeding. No person is required.
    const objectTimes = window ? finalTimes : evenlySpaced(Math.min(durationSeconds, 8), denseFps, DENSE_MAX_SAMPLES);
    const objectFrames: ObjectTrackFrame[] = [];
    let objectError: string | undefined;
    let objectInferenceMs = 0;
    try {
      onProgress(0, objectTimes.length, "Loading the local bat + ball model");
      const objectKinds = options.objectKinds ?? ["ball", "bat"];
      if (!objectKinds.length) {
        onProgress(0, 1, "Body-only review · skipping object model");
      } else {
      await objects.load(objectKinds);
      checkCancelled();
      const tracker = new OnlineObjectTracker(video.videoWidth / video.videoHeight);
      const seen = new Set<number>();
      for (let i = 0; i < objectTimes.length; i++) {
        checkCancelled();
        const sample = await readFrame(objectTimes[i], false);
        if (!sample || seen.has(sample.timestampMs)) continue;
        seen.add(sample.timestampMs);
        const { canvas, timestampMs } = sample;
        const started = performance.now();
        // Full-frame inference runs every sample. Tiled inference is the
        // expensive recall pass, so stagger it across the sequence instead of
        // paying for five views on every frame. This keeps temporal coverage
        // dense while cutting the average detector cost by more than half.
        const tiledPass = Boolean(options.tiledObjects) && (i === 0 || i % 3 === 0);
        const candidates = objects.detect(canvas, tiledPass);
        objectInferenceMs += performance.now() - started;
        const observations = tracker.update(candidates, timestampMs);
        objectFrames.push({ timestampMs, objects: observations });
        const pose = frames.find((frame) => frame.timestampMs === timestampMs);
        if (pose) {
          const ball = observations.filter((o) => o.kind === "ball" && o.confirmed).sort((a, b) => b.score - a.score)[0];
          const bat = observations.find((o) => o.kind === "bat" && o.confirmed);
          pose.ball = ball ? { x: ball.x, y: ball.y, score: ball.score, trackId: ball.trackId } : null;
          pose.batBox = bat?.box ?? null;
        }
        onProgress(i + 1, objectTimes.length, `Tracking bat + ball${options.tiledObjects ? " · adaptive tiled scan" : ""}`);
        await nextPaint();
      }
      objectInferenceMs /= Math.max(1, objectFrames.length);
      }
    } catch (error) {
      checkCancelled();
      objectError = error instanceof Error ? error.message : "Object tracking failed.";
    }
    const diagnostics: PoseRunDiagnostics = {
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      analysisWidth: analysisSize.width,
      analysisHeight: analysisSize.height,
      quality,
      preprocessMs: preprocessCount ? preprocessTotal / preprocessCount : 0,
      inferenceMs: poseCount ? inferenceTotal / poseCount : 0,
      missingLandmarkCount: poseCount ? missingTotal / poseCount : 0,
      averageVisibility: poseCount ? visibilityTotal / poseCount : 0,
      sampledFrames: poseCount,
    };
    recordPoseDiagnostics(diagnostics);

    return {
      frames,
      expectedSamples: attempted,
      durationMs: Math.round(durationSeconds * 1000),
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      sourceFps,
      denseFps,
      analyzedWidth: analysisSize.width,
      analyzedHeight: analysisSize.height,
      truncated: video.duration > MAX_ANALYZED_SECONDS,
      quality,
      diagnostics,
      objectFrames,
      objectError,
      objectInferenceMs,
      objectTiled: options.tiledObjects ?? false,
      effectiveSampleFps: objectFrames.length > 1
        ? (objectFrames.length - 1) * 1000 / (objectFrames.at(-1)!.timestampMs - objectFrames[0].timestampMs) : 0,
      timestampMode: reader ? "decoded-pts" : "seek-estimate",
    };
  } finally {
    objects.close();
    reader?.dispose();
    engine.close();
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

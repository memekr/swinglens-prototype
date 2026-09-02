import { CORE_JOINTS } from "./skeleton";
import type { AnalysisQuality } from "./analysis-resolution";
import type { Skeleton } from "./types";

export type PoseRunDiagnostics = {
  sourceWidth: number;
  sourceHeight: number;
  analysisWidth: number;
  analysisHeight: number;
  quality: AnalysisQuality;
  preprocessMs: number;
  inferenceMs: number;
  missingLandmarkCount: number;
  averageVisibility: number;
  sampledFrames: number;
};

const LOW_VISIBILITY = 0.35;

export function countMissingLandmarks(skeleton: Skeleton): number {
  return CORE_JOINTS.filter((joint) => {
    const point = skeleton[joint];
    return !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.visibility < LOW_VISIBILITY;
  }).length;
}

let lastDiagnostics: PoseRunDiagnostics | null = null;

export function recordPoseDiagnostics(entry: PoseRunDiagnostics): void {
  lastDiagnostics = entry;
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[SwingLens pose]", entry);
  }
}

export function getLastPoseDiagnostics(): PoseRunDiagnostics | null {
  return lastDiagnostics;
}

export function resetPoseDiagnostics(): void {
  lastDiagnostics = null;
}

export function emptyPoseDiagnostics(partial: Partial<PoseRunDiagnostics> = {}): PoseRunDiagnostics {
  return {
    sourceWidth: 1280,
    sourceHeight: 720,
    analysisWidth: 1280,
    analysisHeight: 720,
    quality: "quality",
    preprocessMs: 0,
    inferenceMs: 0,
    missingLandmarkCount: 0,
    averageVisibility: 0,
    sampledFrames: 0,
    ...partial,
  };
}

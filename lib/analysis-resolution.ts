/**
 * Display vs inference resolution.
 *
 * MediaPipe Pose Landmarker tensors stay 224×224 (person finder) and 256×256
 * (landmarks). Passing a 4K canvas does not run those networks at 4K. A larger
 * source still helps the finder when the batter is a small fraction of the
 * frame, so we cap the *analysis* long edge instead of feeding raw 4K.
 *
 * 1280px is an evidence-informed starting cap, not a proven optimum. Validate
 * on labeled baseball swings at 720 / 960 / 1280 / 1920 using landmark error,
 * missing-joint rate, temporal jitter, swing-onset error, runtime, handedness,
 * and camera-angle splits. Never upscale: extra pixels would be invented.
 */
export type AnalysisQuality = "quality" | "balanced" | "fast";

export const DEFAULT_ANALYSIS_QUALITY: AnalysisQuality = "quality";

export const ANALYSIS_LONG_EDGE: Record<AnalysisQuality, number> = {
  quality: 1280,
  balanced: 960,
  fast: 720,
};

/** Compact list/preview JPEG only. Never the main review surface. Long-edge cap. */
export const THUMBNAIL_MAX_WIDTH = 480;

/** Exported stills with the skeleton drawn on. Never upscale past source. */
export const EXPORT_LONG_EDGE = 1280;

export type ScaledSize = {
  width: number;
  height: number;
  scale: number;
};

export function getAnalysisDimensions(
  sourceWidth: number,
  sourceHeight: number,
  quality: AnalysisQuality,
): ScaledSize {
  const sourceLongEdge = Math.max(sourceWidth, sourceHeight);
  const limit = ANALYSIS_LONG_EDGE[quality];
  const scale = Math.min(1, limit / Math.max(sourceLongEdge, 1));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

export function getThumbnailDimensions(sourceWidth: number, sourceHeight: number): ScaledSize {
  const sourceLongEdge = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / Math.max(sourceLongEdge, 1));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

export function getExportStillDimensions(sourceWidth: number, sourceHeight: number): ScaledSize {
  const sourceLongEdge = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(1, EXPORT_LONG_EDGE / Math.max(sourceLongEdge, 1));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

export type MediaPipelinePlan = {
  playback: { width: number; height: number; kind: "original" };
  analysis: ScaledSize & { quality: AnalysisQuality };
  thumbnail: ScaledSize & { replacesPlayback: false };
  exportStill: ScaledSize;
};

/** Quality mode changes analysis size only. Playback stays at source pixels. */
export function planMediaPipeline(
  sourceWidth: number,
  sourceHeight: number,
  quality: AnalysisQuality,
): MediaPipelinePlan {
  return {
    playback: { width: sourceWidth, height: sourceHeight, kind: "original" },
    analysis: { ...getAnalysisDimensions(sourceWidth, sourceHeight, quality), quality },
    thumbnail: { ...getThumbnailDimensions(sourceWidth, sourceHeight), replacesPlayback: false },
    exportStill: getExportStillDimensions(sourceWidth, sourceHeight),
  };
}

export function aspectRatio(width: number, height: number): number {
  return width / Math.max(height, 1);
}

export function aspectRatiosMatch(a: ScaledSize, sourceWidth: number, sourceHeight: number, epsilon = 0.01): boolean {
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;
  return Math.abs(aspectRatio(a.width, a.height) - aspectRatio(sourceWidth, sourceHeight)) < epsilon;
}

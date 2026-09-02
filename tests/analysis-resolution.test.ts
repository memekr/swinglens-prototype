import { describe, expect, it } from "vitest";
import {
  aspectRatiosMatch,
  getAnalysisDimensions,
  getExportStillDimensions,
  getThumbnailDimensions,
  planMediaPipeline,
} from "@/lib/analysis-resolution";

describe("getAnalysisDimensions quality mode", () => {
  it("caps 3840 × 2160 at 1280 × 720", () => {
    expect(getAnalysisDimensions(3840, 2160, "quality")).toEqual({
      width: 1280,
      height: 720,
      scale: 1280 / 3840,
    });
  });

  it("caps 1920 × 1080 at 1280 × 720", () => {
    expect(getAnalysisDimensions(1920, 1080, "quality")).toEqual({
      width: 1280,
      height: 720,
      scale: 1280 / 1920,
    });
  });

  it("leaves 1280 × 720 unchanged", () => {
    expect(getAnalysisDimensions(1280, 720, "quality")).toEqual({
      width: 1280,
      height: 720,
      scale: 1,
    });
  });

  it("never upscales 854 × 480", () => {
    expect(getAnalysisDimensions(854, 480, "quality")).toEqual({
      width: 854,
      height: 480,
      scale: 1,
    });
  });

  it("caps portrait 1080 × 1920 at 720 × 1280", () => {
    expect(getAnalysisDimensions(1080, 1920, "quality")).toEqual({
      width: 720,
      height: 1280,
      scale: 1280 / 1920,
    });
  });

  it("keeps source aspect ratio within pixel rounding", () => {
    const cases: Array<[number, number]> = [
      [3840, 2160],
      [1920, 1080],
      [1280, 720],
      [854, 480],
      [1080, 1920],
      [1440, 1080],
    ];
    for (const [width, height] of cases) {
      const size = getAnalysisDimensions(width, height, "quality");
      expect(aspectRatiosMatch(size, width, height)).toBe(true);
      expect(size.scale).toBeLessThanOrEqual(1);
    }
  });
});

describe("planMediaPipeline", () => {
  it("changes inference size with quality mode, not playback size", () => {
    const quality = planMediaPipeline(3840, 2160, "quality");
    const fast = planMediaPipeline(3840, 2160, "fast");
    expect(quality.playback).toEqual({ width: 3840, height: 2160, kind: "original" });
    expect(fast.playback).toEqual(quality.playback);
    expect(quality.analysis).toMatchObject({ width: 1280, height: 720, quality: "quality" });
    expect(fast.analysis).toMatchObject({ width: 720, height: 405, quality: "fast" });
    expect(fast.playback).toEqual(quality.playback);
    expect(fast.analysis.width / fast.analysis.height).toBeCloseTo(3840 / 2160, 5);
  });

  it("does not let the thumbnail replace the review source", () => {
    const plan = planMediaPipeline(3840, 2160, "quality");
    expect(plan.thumbnail.replacesPlayback).toBe(false);
    expect(plan.thumbnail.width).toBe(480);
    expect(plan.thumbnail.height).toBe(270);
    expect(plan.playback.width).toBe(3840);
    expect(plan.exportStill).toEqual({ width: 1280, height: 720, scale: 1280 / 3840 });
  });

  it("never upscales export stills from small sources", () => {
    expect(getExportStillDimensions(854, 480)).toEqual({ width: 854, height: 480, scale: 1 });
    expect(getThumbnailDimensions(854, 480).scale).toBeLessThanOrEqual(1);
  });
});

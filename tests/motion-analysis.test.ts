import { describe, expect, it } from "vitest";
import { analyzeMotion } from "@/lib/motion-analysis";
import { createDemoFrames } from "@/lib/demo";

describe("multisport motion review", () => {
  it("does not expose baseball-specific scoring for another sport", () => {
    const frames = createDemoFrames();
    const summary = analyzeMotion(frames, frames.length, 16 / 9, "tennis", "side", "consistency");
    expect(summary.canReview).toBe(true);
    expect(summary.recommendations[0].steps.join(" ")).not.toContain("bat");
    expect(summary.warnings.join(" ").toLowerCase()).toContain("racket");
  });
  it("withholds recommendations when body coverage is unreliable", () => {
    const frames = createDemoFrames().slice(0, 3);
    const summary = analyzeMotion(frames, 20, 16 / 9, "running", "side", "control");
    expect(summary.canReview).toBe(false);
    expect(summary.recommendations).toHaveLength(0);
    expect(summary.warnings.join(" ")).toContain("Retake");
  });
});

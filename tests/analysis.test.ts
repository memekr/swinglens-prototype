import { describe, expect, it } from "vitest";
import { analyzePoseSequence, detectPhases } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";

describe("swing phase analysis", () => {
  it("orders four evidence frames around peak wrist speed", () => {
    const phases = detectPhases(createDemoFrames());
    expect(phases.map((phase) => phase.key)).toEqual(["setup", "launch", "contact", "follow"]);
    expect(phases[0].frameIndex).toBeLessThan(phases[1].frameIndex);
    expect(phases[1].frameIndex).toBeLessThan(phases[2].frameIndex);
    expect(phases[2].frameIndex).toBeLessThan(phases[3].frameIndex);
  });

  it("produces a phase-specific report for a traceable demo sequence", () => {
    const frames = createDemoFrames();
    const result = analyzePoseSequence(frames, "right", frames.length);
    expect(result.canCoach).toBe(true);
    expect(result.score).toBeTypeOf("number");
    expect(result.phases).toHaveLength(4);
    expect(result.phases.every((phase) => phase.metrics.length === 4)).toBe(true);
    expect(result.quality.every((check) => check.status === "pass")).toBe(true);
  });

  it("abstains instead of inventing a score when evidence is insufficient", () => {
    const frames = createDemoFrames(6);
    const result = analyzePoseSequence(frames, "left", 24);
    expect(result.canCoach).toBe(false);
    expect(result.score).toBeNull();
    expect(result.phases).toEqual([]);
    expect(result.quality.some((check) => check.status === "fail")).toBe(true);
  });

  it("rejects a static pose even when every landmark is visible", () => {
    const source = createDemoFrames(12)[0];
    const frames = Array.from({ length: 12 }, (_, index) => ({
      ...source,
      timestampMs: index * 100,
      landmarks: source.landmarks.map((landmark) => ({ ...landmark })),
    }));
    const result = analyzePoseSequence(frames, "right", frames.length);
    expect(result.canCoach).toBe(false);
    expect(result.score).toBeNull();
    expect(result.quality.find((check) => check.key === "motion")?.status).toBe("fail");
  });
});

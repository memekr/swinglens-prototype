import { describe, expect, it } from "vitest";
import { analyzePoseSequence, detectPhases } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";
import { midpoint } from "@/lib/geometry";
import { mapLandmarkFromSquare } from "@/lib/pose-engine";

describe("swing phase analysis", () => {
  it("orders four evidence frames: trigger, execution, backspace, impact", () => {
    const phases = detectPhases(createDemoFrames(), "right");
    expect(phases.map((phase) => phase.key)).toEqual(["trigger", "execution", "backspace", "impact"]);
    expect(phases[0].frameIndex).toBeLessThan(phases[1].frameIndex);
    expect(phases[1].frameIndex).toBeLessThanOrEqual(phases[2].frameIndex);
    expect(phases[2].frameIndex).toBeLessThanOrEqual(phases[3].frameIndex);
  });

  it("produces a mechanism report for a traceable demo sequence", () => {
    const frames = createDemoFrames();
    const result = analyzePoseSequence(frames, "right", frames.length);
    expect(result.canCoach).toBe(true);
    expect(result.score).toBeTypeOf("number");
    expect(result.phases).toHaveLength(4);
    expect(result.phases.find((phase) => phase.key === "trigger")?.metrics.length).toBe(3);
    expect(result.phases.find((phase) => phase.key === "execution")?.metrics.length).toBe(6);
    expect(result.phases.find((phase) => phase.key === "backspace")?.metrics.length).toBe(2);
    expect(result.quality.every((check) => check.status === "pass")).toBe(true);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.adjustments.length).toBeGreaterThan(0);
  });

  it("states the ball was not found when no baseball is in the stills", () => {
    const frames = createDemoFrames();
    const result = analyzePoseSequence(frames, "right", frames.length);
    const impact = result.phases.find((phase) => phase.key === "impact");
    expect(result.ballDetected).toBe(false);
    expect(impact?.score).toBeNull();
    expect(impact?.metrics[0]?.note).toContain("Ball not detected - no impact can be found");
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
      landmarks: { ...source.landmarks },
    }));
    const result = analyzePoseSequence(frames, "right", frames.length);
    expect(result.canCoach).toBe(false);
    expect(result.score).toBeNull();
    expect(result.quality.find((check) => check.key === "motion")?.status).toBe("fail");
  });

  it("keeps a hand-speed impact candidate below the head when the ball is missing", () => {
    const frames = createDemoFrames(48).map((frame, index, all) => {
      if (index < Math.floor(all.length * 0.72)) return frame;
      const head = frame.landmarks.head;
      const t = (index / all.length - 0.72) / 0.28;
      return {
        ...frame,
        landmarks: {
          ...frame.landmarks,
          leftHand: { ...frame.landmarks.leftHand, x: frame.landmarks.leftHand.x - t * 0.1, y: head.y - 0.02 },
          rightHand: { ...frame.landmarks.rightHand, x: frame.landmarks.rightHand.x - t * 0.12, y: head.y - 0.04 },
        },
      };
    });
    const phases = detectPhases(frames, "right");
    const impact = phases.find((phase) => phase.key === "impact");
    expect(impact).toBeDefined();
    const sample = frames[impact!.frameIndex];
    const hands = midpoint(sample.landmarks.leftHand, sample.landmarks.rightHand);
    expect(hands.y).toBeGreaterThan(sample.landmarks.head.y);
    expect(phases.find((phase) => phase.key === "backspace")!.frameIndex).toBeLessThanOrEqual(impact!.frameIndex);
  });
});

describe("square-pad landmark mapping", () => {
  it("maps letterboxed square coordinates back onto a 16:9 frame", () => {
    const pad = { size: 1600, dx: 0, dy: 350, width: 1600, height: 900 };
    const top = mapLandmarkFromSquare({ x: 0.5, y: 350 / 1600, z: 0, visibility: 1 }, pad);
    const bottom = mapLandmarkFromSquare({ x: 0.5, y: 1250 / 1600, z: 0, visibility: 1 }, pad);
    expect(top.y).toBeCloseTo(0, 5);
    expect(bottom.y).toBeCloseTo(1, 5);
    expect(top.x).toBeCloseTo(0.5, 5);
  });
});

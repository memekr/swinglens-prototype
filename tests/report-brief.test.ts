import { describe, expect, it } from "vitest";
import { analyzePoseSequence } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";
import { CUE_EXPLAINERS } from "@/lib/cue-science";
import { buildReportBrief } from "@/lib/report-brief";

describe("report brief for the hitting coach", () => {
  it("serializes score, checkpoints, and cue names the chat model can read", () => {
    const frames = createDemoFrames();
    const result = analyzePoseSequence(frames, "right", frames.length);
    const brief = buildReportBrief(result);

    expect(result.score).toBeTypeOf("number");
    expect(brief).toContain(`Prototype score: ${result.score}`);
    expect(brief).toContain("Score recipe");
    expect(brief).toContain("Lead-knee angle");
    expect(brief).toContain("Torso lean");
    expect(brief).toContain("Shoulder–hip line gap");
    expect(brief).toContain("Relative head travel");
    expect(brief).toContain("Swing path shape");
    expect(brief).toContain("2D screen-space");
  });

  it("documents every on-screen cue", () => {
    expect(CUE_EXPLAINERS.map((cue) => cue.key)).toEqual([
      "prototypeScore",
      "leadKnee",
      "torsoLean",
      "separation",
      "headMovement",
      "swingPath",
    ]);
  });
});

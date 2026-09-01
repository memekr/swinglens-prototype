import { describe, expect, it } from "vitest";
import { analyzePoseSequence } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";
import { getDrillSuggestions } from "@/lib/drills";

describe("practice suggestions", () => {
  it("maps the weakest 2D cues to Gradum-style drill cards", () => {
    const frames = createDemoFrames();
    const result = analyzePoseSequence(frames, "right", frames.length);
    const drills = getDrillSuggestions(result);
    expect(drills.length).toBeGreaterThanOrEqual(1);
    expect(drills.length).toBeLessThanOrEqual(2);
    expect(drills.every((drill) => drill.steps.length >= 3)).toBe(true);
    expect(drills.every((drill) => drill.title.length > 0)).toBe(true);
  });

  it("returns a capture rehearsal when scoring is withheld", () => {
    const frames = createDemoFrames(5);
    const result = analyzePoseSequence(frames, "right", 20);
    expect(getDrillSuggestions(result)[0].key).toBe("capture");
  });
});

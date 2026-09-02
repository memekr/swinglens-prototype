import type { AnalysisResult, MetricUnit } from "./types";

function formatValue(value: number, unit: MetricUnit, display?: string): string {
  if (display) return display;
  if (unit === "cue") return `${Math.round(value)}`;
  if (unit === "°") return `${Math.round(value)} deg`;
  if (unit === "torso") return `${value.toFixed(2)} torso-lengths`;
  return value.toFixed(2);
}

function formatRange(range: [number, number], unit: MetricUnit): string {
  const suffix = unit === "°" ? " deg" : unit === "torso" ? " torso-lengths" : "";
  return `${range[0]}–${range[1]}${suffix}`;
}

/** Compact report the hitting-coach model can read. No video frames. */
export function buildReportBrief(result: AnalysisResult): string {
  const lines: string[] = [
    `Prototype score: ${result.score ?? "withheld (capture failed)"}`,
    "Score recipe: mechanism cues average into Trigger/Timing, Execution, and Backspace. Impact is omitted from the ring if the baseball is not found.",
    `Capture quality: ${result.quality.map((q) => `${q.label} ${q.status}`).join("; ")}`,
    `Sampled frames: ${result.sampledFrames}`,
    `Baseball detected: ${result.ballDetected ? "yes" : "no"}`,
  ];
  if (result.strengths.length) lines.push(`Keep: ${result.strengths.join(" | ")}`);
  if (result.adjustments.length) lines.push(`Next: ${result.adjustments.join(" | ")}`);
  for (const phase of result.phases) {
    lines.push(`${phase.label} checkpoint score ${phase.score}. ${phase.description}`);
    for (const metric of phase.metrics) {
      lines.push(
        `  - ${metric.label}: ${formatValue(metric.value, metric.unit, metric.display)} `
        + `(range ${formatRange(metric.reference, metric.unit)}, cue score ${metric.score}, ${metric.status}). ${metric.note}`,
      );
    }
  }
  lines.push(
    "Limits: 2D screen-space only. If the baseball is not found, the report states: Ball not detected - no impact can be found. Not bat speed, exit velocity, or 3D hip-shoulder separation.",
  );
  return lines.join("\n");
}

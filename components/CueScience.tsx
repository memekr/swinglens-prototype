"use client";

import { CUE_EXPLAINERS } from "@/lib/cue-science";

export function CueScience({ expanded }: { expanded: boolean }) {
  return (
    <section className="cue-science" id="how-cues" aria-labelledby="cue-science-title">
      <div className="section-minihead">
        <div>
          <p className="eyebrow"><span /> HOW THE NUMBERS WORK</p>
          <h3 id="cue-science-title">What each cue measures, and why it is on the report.</h3>
        </div>
        <p>All of this is 2D screen-space from the on-device skeleton. Units and a high-school “good” band are listed with each cue.</p>
      </div>
      <div className="cue-science-grid" key={expanded ? "coach" : "player"}>
        {CUE_EXPLAINERS.map((cue) => (
          <details key={cue.key} className="cue-science-card" open={expanded}>
            <summary>
              <b>{cue.title}</b>
              <span>{cue.unit}</span>
            </summary>
            <p>{cue.how}</p>
            <p><b>Math.</b> {cue.math}</p>
            <p><b>Where it comes from.</b> {cue.derivedFrom}</p>
            <p><b>Why it matters.</b> {cue.why}</p>
            <p><b>High-school check.</b> {cue.hsGood}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

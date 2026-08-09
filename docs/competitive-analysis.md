# Competitive and open-source feature research

Research was refreshed on 2026-08-09, with the requested July 2026 product horizon as the cutoff for feature selection. Store and repository descriptions establish that a feature is advertised or implemented; they do not prove measurement accuracy.

## Product patterns

| Product or project | Observed pattern | Added to SwingLens | Explicit boundary |
|---|---|---|---|
| [Onform](https://apps.apple.com/us/app/onform-video-analysis-app/id1490334045) | Frame scrubbing, skeleton tracking, side-by-side review, annotation | Frame Lab, overlay toggle, checkpoint compare | No claim of 240 FPS capture or cloud team workflow |
| [Kinovea](https://github.com/Kinovea/Kinovea) | Capture, slow motion, comparison, annotation, measurement | Evidence scrubbing and comparison controls | No arbitrary pixel-to-real-world measurement |
| [Sports2D](https://github.com/davidpagnon/Sports2D) | 2D trajectories and angles, configurable outputs, strong camera-plane warnings | Technical Coach view, range transparency, camera guidance | No OpenSim, inverse kinematics, or metric coordinates |
| [Baseball Swing Analyzer](https://github.com/rainmandr/Swing-Analyzer) | Simple/advanced modes, frame analysis, knowledge/drills, PDF reports | Player/Coach views and print-to-PDF | No cloud LLM, database, or server video upload |
| [BarrelLabs SwingAI](https://github.com/BARRELLABS/barrellabs-swing-app) | Mechanics breakdown, comparisons, top fixes, personalized drills, PDF | Cue-ranked practice cards and short next-rep plan | No unsupported MLB similarity score |
| [Mustard Pitching](https://apps.apple.com/us/app/mustard-pitching/id1526812408) | Automatic key phases, skeletal overlay, personalized drills | Checkpoint evidence and cue-specific drills | No injury or medical inference |
| [Sportsbox 3D Golf](https://apps.apple.com/us/app/sportsbox-3d-golf/id1578921026) | Guided face-on capture and phase comparison | Full-body capture checklist and phase tabs | No single-camera 3D claims |
| [SwingVision](https://apps.apple.com/us/app/swingvision-tennis-pickleball/id989461317) | Single-camera event segmentation and highlights | Wrist-speed checkpoint candidates | Contact candidate is never called confirmed contact |
| [V1 Baseball](https://apps.apple.com/us/app/v1-baseball-swing-analyzer/id1530643098) | Frame playback, reference comparison, drawing tools | Tracked-sample navigation and checkpoint comparison | No account or paid reference library |
| [Pose2Sim](https://github.com/perfanalytics/pose2sim) | Local privacy, multi-camera calibration, research-grade 3D workflow | Local-first principle and documented native roadmap | Multi-camera 3D is deliberately outside this PWA |

## Why these additions were selected

Frame review, comparison, audience-appropriate detail, drills, and portable reports improve the coaching workflow without requiring a new model or unsupported measurements. Multi-camera 3D, generative similarity, ball-contact detection, and absolute speed require data or sensors this prototype does not have, so they remain excluded.

## Differentiation

- Video processing stays in the browser; the server receives zero video bytes.
- A score is withheld when pose, framing, or motion evidence fails.
- Every cue links back to a visible source sample and a labeled prototype range.
- Frame Lab exposes tracked source timestamps and never presents interpolated frames as evidence.
- Testers can open a sample report without an account or personal video.

Competitor branding, copy, layouts, and source code were not copied. Only product patterns were translated into independent requirements.

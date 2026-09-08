# SwingLens Prototype

SwingLens is a local-first multisport movement review app for phone video. The video never uploads to an application server: MediaPipe Pose Landmarker Lite, EfficientDet Lite0, and the analysis pipeline run inside the browser.

Production: <https://swinglens-prototype.vercel.app>

## Run locally

```bash
npm install
npm run dev
```

Hitting-coach chat (RAG + local Gemma) needs a second process and Ollama:

```bash
# from this folder, using the repo venv that already has chromadb + sentence-transformers
../../.venv/bin/python rag/server.py
```

Then keep `npm run dev` running and ask hitting questions in the chat. After a report, the chat sits under the analysis and can explain that clip’s score. Follow-ups stay in the same thread.

Rebuild the copied index after editing notes:

```bash
../../.venv/bin/python rag/rag_ingest.py --rebuild
../../.venv/bin/python rag/rag_eval.py
```

Real-video analysis requires the bundled `public/models/pose_landmarker_lite.task` and `public/wasm/` assets. They are checked into the private repository so the deployed app does not depend on a model CDN at inference time.

## Mobile packaging

The web app now has a Capacitor shell for iOS and Android. The current shell points at the hosted production app, so the same codebase can be opened as an installable mobile app while we keep the web deployment live.

```bash
npm run cap:sync
npm run cap:doctor
npx cap open ios
npx cap open android
```

The shell is ready for native signing and store packaging, but Apple/Google certificates and device-specific validation are still external steps.

## Validate

```bash
npm run lint
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

## Current feature set

- iOS and Android browser recording or video selection
- Sport selection for baseball, softball, tennis, basketball, soccer, volleyball, golf, cricket, badminton, table tennis, running, strength, cycling, swimming, martial arts, and custom other sports
- Local sampling of decoded presentation-timestamp frames (up to 120 fps) from the first 60 seconds
- Separate playback vs analysis resolution: original File/Blob URL for review; MediaPipe frames capped at 1280 / 960 / 720 (never upscaled, never 4K)
- Optional inference-only contrast lift; SVG skeleton overlay on the original video
- On-device 33-landmark pose estimation, mapped to a 17-point body map
- Local EfficientDet Lite0 semantic bat + sports-ball proposals with timestamped online association
- Heatmap-mass center refinement inside neural boxes; 120 Hz display interpolation is clearly labeled and never used as measured evidence
- Local 120 fps blended review export (4-second cap, 720px edge, no audio)
- Sport-aware review gating: unsupported equipment or movement types fall back to body-only guidance instead of fake sport-specific tracking
- Trigger, execution, impact, and follow-through checkpoints (front-foot-plant and hand-speed based)
- 2D lead-knee, torso-lean, shoulder–hip-line, and relative-head-travel cues
- Tracked hand-path visualization through the follow-through, checked against a circular, slightly upward shape
- Capture-quality gates that withhold a mechanics score when evidence is weak or static
- Player and Coach report views
- Frame Lab with sample scrubbing, skeleton toggle, and side-by-side checkpoint comparison
- Cue-specific practice cards, Web Share summary, and print-to-PDF report
- Hitting-coach chat (local RAG + Gemma). After a report, the chat can see this clip’s prototype score and checkpoint numbers. Off-topic replies stay short and do not attach a drill.
- PWA manifest and model/WASM runtime caching

## Important limits

The contact candidate is the highest observed wrist-speed sample, not confirmed ball contact. SwingLens does not measure bat speed, exit velocity, true attack angle, or 3D mechanics from one 2D camera. Spatial resampling does not reconstruct temporal information missing from low-FPS footage. The object detector is COCO-trained (`sports ball`, `baseball bat`), not baseball-specific; no barrel-tip localization or physical speed is inferred. Other sports fall back to body-only guidance when the bundled model cannot support a sport-specific object. Checkpoint ranges are prototype values pending coach and dataset validation.

See [competitive research](./docs/competitive-analysis.md) and [architecture and decision boundaries](./docs/architecture.md).

## License note

MediaPipe Tasks and the Pose Landmarker model remain subject to their upstream terms. Recheck third-party notices and model licensing before a public commercial release.

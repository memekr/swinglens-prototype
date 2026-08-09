# SwingLens Prototype

SwingLens is an installable, mobile-first PWA for reviewing full-body baseball swing evidence from a phone video. The video never uploads to an application server: MediaPipe Pose Landmarker Lite and the analysis pipeline run inside the browser.

Production: <https://swinglens-prototype.vercel.app>

## Run locally

```bash
npm install
npm run dev
```

Real-video analysis requires the bundled `public/models/pose_landmarker_lite.task` and `public/wasm/` assets. They are checked into the private repository so the deployed app does not depend on a model CDN at inference time.

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
- Local sampling of up to 72 real timestamps from the first 12 seconds
- High-quality spatial resampling and conservative contrast normalization
- On-device 33-landmark pose estimation
- Wrist-speed-based setup, launch, contact-candidate, and follow-through checkpoints
- 2D lead-knee, torso-lean, shoulder–hip-line, and relative-head-travel cues
- Capture-quality gates that withhold a mechanics score when evidence is weak or static
- Player and Coach report views
- Frame Lab with sample scrubbing, skeleton toggle, and side-by-side checkpoint comparison
- Cue-specific practice cards, Web Share summary, and print-to-PDF report
- Synthetic landmark demo for testers without a swing video
- PWA manifest and model/WASM runtime caching

## Important limits

The contact candidate is the highest observed wrist-speed sample, not confirmed ball contact. SwingLens does not measure bat speed, exit velocity, true attack angle, or 3D mechanics from one 2D camera. Spatial resampling does not reconstruct temporal information missing from low-FPS footage. Checkpoint ranges are prototype values pending coach and dataset validation.

See [competitive research](./docs/competitive-analysis.md) and [architecture and decision boundaries](./docs/architecture.md).

## License note

MediaPipe Tasks and the Pose Landmarker model remain subject to their upstream terms. Recheck third-party notices and model licensing before a public commercial release.

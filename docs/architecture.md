# Prototype architecture and decision boundaries

## Runtime flow

1. The user records or selects a clip through a file input with `capture="environment"`.
2. The browser `<video>` decoder seeks real timestamps within the first 12 seconds.
3. Each frame is resampled to a 640–720 px long edge and receives conservative contrast normalization.
4. Bundled MediaPipe Pose Landmarker Lite/WASM estimates 33 body landmarks, which are mapped to this
   project's 17-point body-labeling scheme (`Baseball Resources/body-labeling.md`: head, torso,
   center hip, and left/right shoulder, elbow, hand, hip-joint, knee, foot).
5. The pipeline finds four checkpoints in the batting sequence: **Trigger** (first departure from the
   still starting pose), **Execution** (the lead foot's most-planted sample, i.e. the stride landing),
   **Impact** (peak hand-center speed, the bat-ball contact candidate), and **Follow-through**
   (the deceleration window after Impact).
6. Torso-normalized 2D cues are compared with checkpoint-specific prototype ranges. Follow-through
   additionally gets a tracked hand-path polyline from Impact onward, checked against a circular,
   slightly upward reference shape (the honest proxy for bat barrel path — the bat itself isn't tracked).
7. Pose coverage, joint confidence, subject scale, clipping, and actual swing motion act as score gates.
8. The report exposes the evidence through checkpoint tabs, Frame Lab scrubbing, side-by-side comparison, and rule-based practice cards.

Every decoded frame and preview stays in tab memory. Vercel serves application code, WASM, and the pose model; there is no video-receiving API.

## Features added from external pattern research

- Frame scrubbing and side-by-side comparison, abstracted from Kinovea, Onform, and V1 workflows
- Player/Coach detail modes, abstracted from the open-source Baseball Swing Analyzer
- Joint trajectory and camera-plane warnings, adapted from Sports2D without claiming its research outputs
- Cue-specific practice cards, inspired by Mustard and BarrelLabs product patterns
- Client-side share and print-to-PDF instead of server-side report storage

No source code or brand assets were copied from those projects.

## Values intentionally not measured

- Actual bat–ball contact time
- Bat speed, exit velocity, or absolute distance
- True attack angle or 3D joint/rotation angles
- Plausible reconstruction of occluded joints
- Injury risk or medical diagnosis

Low FPS means temporal information is missing. Spatial resampling can prepare a model input but cannot restore an unrecorded moment. If interpolation is tested later, synthetic frames must be visibly distinguished from source frames and must not become event-detection evidence.

## Native mobile path

After prototype validation, a React Native or native Swift/Kotlin shell is preferable to a thin Capacitor wrapper because this product depends on stable camera capture, media decoding, and GPU sessions. The TypeScript geometry, phase, quality-gating, practice-card, and report schemas can remain shared.

- iOS: Vision/MediaPipe Tasks or a Core ML conversion, AVAssetReader, Metal
- Android: MediaPipe Tasks/TFLite, MediaCodec, GPU delegate
- Model updates: bundled baseline model plus signed optional model packs
- Privacy: local processing by default; research telemetry only through explicit opt-in

## Validation still required

The current ranges validate the product flow, not baseball truth. A production release needs camera-angle-specific datasets, independent coach labels, repeatability testing, low-light and occlusion cases, left-handed hitters, youth participants, and real mobile performance profiling.

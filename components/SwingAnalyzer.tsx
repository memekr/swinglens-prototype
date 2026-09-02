"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { analyzePoseSequence } from "@/lib/analysis";
import { DEFAULT_ANALYSIS_QUALITY, type AnalysisQuality } from "@/lib/analysis-resolution";
import { createDemoFrames } from "@/lib/demo";
import { ObjectUrlStore } from "@/lib/object-url";
import { emptyPoseDiagnostics } from "@/lib/pose-diagnostics";
import { PoseEngine } from "@/lib/pose-engine";
import { SKELETON_CONNECTIONS, SKELETON_POINTS } from "@/lib/skeleton";
import type { AnalysisResult, BodyJoint, Handedness } from "@/lib/types";
import { analyzeVideoFile, type VideoAnalysisOutput } from "@/lib/video-analysis";
import { AnalysisReport } from "./AnalysisReport";
import { CoachChat } from "./CoachChat";
import { Icon } from "./Icon";

type RunStatus = "idle" | "processing" | "done" | "error";

// Hand-authored batter-mid-swing pose for the hero illustration, in the same
// 15-point body-labeling.md scheme (lib/skeleton.ts) the real analysis uses —
// not arbitrary decorative path data. Side view, front leg planted, bat up.
const HERO_POSE: Record<BodyJoint, { x: number; y: number }> = {
  head: { x: 235, y: 78 },
  torso: { x: 222, y: 232 },
  centerHip: { x: 213, y: 322 },
  leftShoulder: { x: 185, y: 168 },
  rightShoulder: { x: 270, y: 195 },
  leftElbow: { x: 158, y: 232 },
  rightElbow: { x: 308, y: 162 },
  leftHand: { x: 240, y: 122 },
  rightHand: { x: 258, y: 104 },
  leftHipJoint: { x: 193, y: 317 },
  rightHipJoint: { x: 238, y: 325 },
  leftKnee: { x: 145, y: 400 },
  rightKnee: { x: 292, y: 412 },
  leftFoot: { x: 105, y: 495 },
  rightFoot: { x: 312, y: 500 },
};
const HERO_DOTS = SKELETON_POINTS.filter((joint) => joint !== "head");

export function SwingAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [handedness, setHandedness] = useState<Handedness>("right");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState({ completed: 0, total: 1, stage: "" });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [quality, setQuality] = useState<AnalysisQuality>(DEFAULT_ANALYSIS_QUALITY);
  const [enhanceInference, setEnhanceInference] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const engine = useRef<PoseEngine | null>(null);
  const objectUrls = useRef(new ObjectUrlStore());

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const store = objectUrls.current;
    return () => {
      engine.current?.close();
      store.dispose();
    };
  }, []);

  function resetOutput() {
    setResult(null);
    setVideoMeta(null);
    setStatus("idle");
    setError(null);
    setIsDemo(false);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v)$/i.test(selected.name)) {
      setError("Choose a video file to continue.");
      return;
    }
    if (selected.size > 350 * 1024 * 1024) {
      setError("This prototype accepts videos up to 350 MB.");
      return;
    }
    const nextUrl = objectUrls.current.set(selected);
    setFile(selected);
    setPreviewUrl(nextUrl);
    resetOutput();
    requestAnimationFrame(() => objectUrls.current.releasePrevious());
  }

  async function runAnalysis() {
    if (!file || status === "processing") return;
    setStatus("processing");
    setError(null);
    setResult(null);
    setIsDemo(false);
    try {
      // IMAGE-mode pose: each seeked frame is independent, so a new engine
      // per run is optional. Recreating still drops GPU state between clips.
      engine.current?.close();
      engine.current = new PoseEngine();
      const output = await analyzeVideoFile(
        file,
        engine.current,
        (completed, total, stage) => {
          setProgress({ completed, total, stage });
        },
        handedness,
        { quality, enhanceInference },
      );
      const nextResult = analyzePoseSequence(output.frames, handedness, output.expectedSamples);
      setVideoMeta(output);
      setResult(nextResult);
      setStatus("done");
      requestAnimationFrame(() => document.querySelector("#analysis-result")?.scrollIntoView({ behavior: "smooth" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something unexpected stopped the analysis.");
      setStatus("error");
    }
  }

  function runDemo() {
    const frames = createDemoFrames();
    const nextResult = analyzePoseSequence(frames, handedness, frames.length);
    setResult(nextResult);
    setVideoMeta({
      frames,
      expectedSamples: frames.length,
      durationMs: frames.at(-1)?.timestampMs ?? 0,
      sourceWidth: 1280,
      sourceHeight: 720,
      sourceFps: 30,
      denseFps: 30,
      analyzedWidth: 1280,
      analyzedHeight: 720,
      truncated: false,
      quality: "quality",
      diagnostics: emptyPoseDiagnostics({ sampledFrames: frames.length, averageVisibility: 1 }),
    });
    setIsDemo(true);
    setStatus("done");
    setError(null);
    requestAnimationFrame(() => document.querySelector("#analysis-result")?.scrollIntoView({ behavior: "smooth" }));
  }

  const progressPercent = Math.round((progress.completed / Math.max(progress.total, 1)) * 100);

  return (
    <main>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="SwingLens home">
          <span className="brand-mark">SL</span>
          <span>SwingLens <small>LAB</small></span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a><a href="#analyze">Analyze</a><a href="#coach">Coach</a><a href="#privacy">Privacy</a>
        </div>
        <a className="privacy-pill" href="#privacy"><Icon name="lock" /> Your video stays on your device</a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> ON-DEVICE SWING INTELLIGENCE</p>
          <h1>See the move.<br /><em>Coach the next.</em></h1>
          <p className="hero-lead">Record one swing. Review the body landmarks, key checkpoints, and evidence behind every cue — without uploading your video.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => cameraInput.current?.click()}><Icon name="camera" /> Record a swing</button>
            <button className="button ghost" onClick={() => uploadInput.current?.click()}><Icon name="upload" /> Upload a video</button>
            <button className="button ghost" onClick={runDemo}><Icon name="spark" /> Explore sample report</button>
          </div>
          <p className="microcopy">No account · No video upload · Installable PWA</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="motion-orbit orbit-one" /><div className="motion-orbit orbit-two" />
          <svg viewBox="0 0 420 520" className="hero-skeleton">
            <path className="motion-trail" d="M372 10C336 58 302 88 260 103" />
            <path className="hero-bat" d="M250 114 378 8" />
            {SKELETON_CONNECTIONS.map(([from, to]) => (
              <line key={`${from}-${to}`} x1={HERO_POSE[from].x} y1={HERO_POSE[from].y} x2={HERO_POSE[to].x} y2={HERO_POSE[to].y} />
            ))}
            <circle className="hero-head" cx={HERO_POSE.head.x} cy={HERO_POSE.head.y} r="34" />
            {HERO_DOTS.map((joint) => (
              <circle key={joint} className="hero-joint" cx={HERO_POSE[joint].x} cy={HERO_POSE[joint].y} r="7" />
            ))}
          </svg>
          <div className="visual-chip chip-top"><b>17</b><span>BODY LANDMARKS</span></div>
          <div className="visual-chip chip-bottom"><span>LOCAL MODEL</span><b>READY</b></div>
        </div>
        <div className="hero-proof">
          <span><b>01</b>Frame evidence</span><span><b>02</b>Confidence gates</span><span><b>03</b>Actionable reps</span>
        </div>
      </section>

      <section className="pipeline" id="how" aria-labelledby="pipeline-title">
        <div className="section-heading">
          <p className="eyebrow"><span /> A DEFENSIBLE PIPELINE</p>
          <h2 id="pipeline-title">Three steps. No invented motion.</h2>
          <p>We improve the spatial input for pose tracking, but never pretend low frame rate contains moments the camera did not record.</p>
        </div>
        <div className="pipeline-grid">
          <article><span className="step-number">01</span><div className="step-icon"><Icon name="spark" /></div><h3>Prepare each frame</h3><p>Analysis frames are capped (never upscaled) for pose. The original clip stays at full resolution for review.</p><small>NO SYNTHETIC ACTION</small></article>
          <article><span className="step-number">02</span><div className="step-icon"><Icon name="pose" /></div><h3>Track the body</h3><p>A bundled lightweight vision model finds 33 body landmarks, mapped to our 17-point body map, entirely inside the browser.</p><small>MEDIAPIPE POSE LITE</small></article>
          <article><span className="step-number">03</span><div className="step-icon"><Icon name="compare" /></div><h3>Review checkpoints</h3><p>Transparent 2D cues follow trigger, landing, backspace, then contact if the baseball is seen.</p><small>EVIDENCE BEFORE SCORE</small></article>
        </div>
      </section>

      <section className="review-features" aria-labelledby="review-features-title">
        <div className="feature-intro"><p className="eyebrow light"><span /> BUILT FOR REVIEW</p><h2 id="review-features-title">More than a score.<br />A portable film room.</h2><p>Patterns from leading coaching and open-source motion tools, rebuilt around local-first privacy and honest 2D evidence.</p></div>
        <div className="feature-stack">
          <article><span>01</span><div><h3>Frame Lab</h3><p>Scrub tracked samples, toggle the skeleton, and inspect the exact evidence.</p></div></article>
          <article><span>02</span><div><h3>Checkpoint Compare</h3><p>Place any tracked sample beside Trigger/Timing, Execution, Backspace, or Impact.</p></div></article>
          <article><span>03</span><div><h3>Player / Coach Views</h3><p>Switch between concise cues and technical prototype ranges without rerunning analysis.</p></div></article>
          <article><span>04</span><div><h3>Practice + PDF</h3><p>Turn the weakest 2D cues into short drill cards, then print or share the summary.</p></div></article>
        </div>
      </section>

      <section className="workspace" id="analyze" aria-labelledby="analyze-title">
        <div className="workspace-copy">
          <p className="eyebrow light"><span /> TRY YOUR SWING</p>
          <h2 id="analyze-title">One swing.<br />Full body in frame.</h2>
          <ol className="capture-tips">
            <li><b>Landscape</b><span>Phone at belt height, roughly 10–16 ft (3–5 m) away</span></li>
            <li><b>Full body</b><span>Fill about 65–85% of the frame. Keep the head, both feet, both hands, and the complete bat path visible</span></li>
            <li><b>Stable view</b><span>Use bright light and a fixed side or open-side camera</span></li>
          </ol>
          <div className="analysis-options">
            <div className="stance-fieldset"><span>BATTER</span><div className="segmented" role="group" aria-label="Batter side"><button className={handedness === "right" ? "active" : ""} onClick={() => setHandedness("right")}>Right</button><button className={handedness === "left" ? "active" : ""} onClick={() => setHandedness("left")}>Left</button></div></div>
            <div className="stance-fieldset"><span>POSE</span><div className="segmented" role="group" aria-label="Analysis quality"><button className={quality === "quality" ? "active" : ""} onClick={() => setQuality("quality")}>Quality</button><button className={quality === "balanced" ? "active" : ""} onClick={() => setQuality("balanced")}>Balanced</button><button className={quality === "fast" ? "active" : ""} onClick={() => setQuality("fast")}>Fast</button></div></div>
            <label className="enhance-toggle"><input type="checkbox" checked={enhanceInference} onChange={(event) => setEnhanceInference(event.target.checked)} /> Brighten frames for pose only</label>
          </div>
        </div>

        <div className="workspace-panel">
        <div className="upload-card">
          <input ref={uploadInput} className="visually-hidden" type="file" accept="video/mp4,video/quicktime,video/webm,video/*" onChange={onFile} />
          <input ref={cameraInput} className="visually-hidden" type="file" accept="video/mp4,video/quicktime,video/webm,video/*" capture="environment" onChange={onFile} />
          {previewUrl ? (
            <div className="video-preview"><video src={previewUrl} controls playsInline preload="metadata" /><div className="file-row"><div><b>{file?.name}</b><span>{file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB · processed locally</span></div><div className="row-actions"><button type="button" onClick={() => uploadInput.current?.click()}>Upload another</button><button type="button" onClick={() => cameraInput.current?.click()}>Record instead</button></div></div></div>
          ) : (
            <div className="drop-zone">
              <span className="drop-icon"><Icon name="camera" /></span>
              <b>Record or upload one swing</b>
              <span className="drop-hint">MP4 · MOV · WebM / up to 350 MB · stays on this device</span>
              <div className="capture-choice">
                <button type="button" className="button primary" onClick={() => cameraInput.current?.click()}><Icon name="camera" /> Record</button>
                <button type="button" className="button secondary" onClick={() => uploadInput.current?.click()}><Icon name="upload" /> Upload</button>
              </div>
            </div>
          )}
          {status === "processing" ? (
            <div className="progress-panel" aria-live="polite"><div><b>{progress.stage}</b><span>{progressPercent}%</span></div><div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div><p>Keep this tab open. Frames are processed only in this browser.</p></div>
          ) : <button className="button analyze-button" disabled={!file} onClick={runAnalysis}>Analyze this swing <Icon name="arrow" /></button>}
          {error && <div className="error-box" role="alert"><Icon name="warn" />{error}</div>}
          <div className="local-proof"><Icon name="lock" /><span><b>0 bytes of video uploaded</b>The selected video disappears from memory when this tab closes.</span></div>
        </div>
        </div>
      </section>

      <section className="coach-dock no-print" aria-label="Hitting coach">
        <CoachChat analysis={result} />
      </section>

      {result && <AnalysisReport result={result} videoMeta={videoMeta} videoSrc={isDemo ? null : previewUrl} isDemo={isDemo} onReset={() => { setResult(null); setStatus("idle"); document.querySelector("#analyze")?.scrollIntoView({ behavior: "smooth" }); }} />}

      <section className="privacy-section" id="privacy">
        <div><p className="eyebrow light"><span /> PRIVACY BY DESIGN</p><h2>Your video lives<br />on your device.</h2></div>
        <div className="privacy-flow"><span>Your video</span><i>→</i><span>Browser memory</span><i>→</i><span>Your report</span></div>
        <p>No login, cloud video storage, or ad tracker. The browser downloads the pose model once; your frames and results are computed locally.</p>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark">SL</span><span>SwingLens</span></a><p>Vision-first baseball movement prototype · 2026</p><p>Training reference only · Not medical or injury advice</p></footer>
    </main>
  );
}

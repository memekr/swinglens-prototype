"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { analyzePoseSequence } from "@/lib/analysis";
import { createDemoFrames } from "@/lib/demo";
import { PoseEngine } from "@/lib/pose-engine";
import type { AnalysisResult, Handedness, PhaseKey } from "@/lib/types";
import { analyzeVideoFile, type VideoAnalysisOutput } from "@/lib/video-analysis";
import { SkeletonView } from "./SkeletonView";

type RunStatus = "idle" | "processing" | "done" | "error";

const PHASE_ORDER: PhaseKey[] = ["setup", "launch", "contact", "follow"];

function Icon({ name }: { name: "lock" | "camera" | "spark" | "pose" | "compare" | "check" | "warn" | "arrow" }) {
  const paths = {
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13.5" r="3.5" /></>,
    spark: <><path d="m12 2 1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    pose: <><circle cx="12" cy="4" r="2" /><path d="m12 6 1 6 4 3m-4-3-4 3m3-6-4 2m5-2 4 2m-5 1-1 8m2-8 2 8" /></>,
    compare: <><path d="M4 6h16M4 12h10M4 18h7" /><path d="m17 15 3 3-3 3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    warn: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5m0 3h.01" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function MetricValue({ value, unit }: { value: number; unit: "°" | "몸통" }) {
  return <>{unit === "°" ? Math.round(value) : value.toFixed(2)}{unit === "몸통" ? "×" : unit}</>;
}

export function SwingAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [handedness, setHandedness] = useState<Handedness>("right");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState({ completed: 0, total: 1, stage: "" });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoAnalysisOutput | null>(null);
  const [activePhase, setActivePhase] = useState<PhaseKey>("contact");
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const engine = useRef<PoseEngine | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => () => {
    engine.current?.close();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const selectedPhase = useMemo(
    () => result?.phases.find((phase) => phase.key === activePhase) ?? result?.phases[0],
    [activePhase, result],
  );

  function resetOutput() {
    setResult(null);
    setVideoMeta(null);
    setStatus("idle");
    setError(null);
    setIsDemo(false);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      setError("영상 파일만 선택할 수 있습니다.");
      return;
    }
    if (selected.size > 350 * 1024 * 1024) {
      setError("프로토타입에서는 350MB 이하 영상을 사용해 주세요.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(previewUrlRef.current);
    resetOutput();
  }

  async function runAnalysis() {
    if (!file || status === "processing") return;
    setStatus("processing");
    setError(null);
    setResult(null);
    setIsDemo(false);
    try {
      engine.current ??= new PoseEngine();
      const output = await analyzeVideoFile(file, engine.current, (completed, total, stage) => {
        setProgress({ completed, total, stage });
      });
      const nextResult = analyzePoseSequence(output.frames, handedness, output.expectedSamples);
      setVideoMeta(output);
      setResult(nextResult);
      setActivePhase("contact");
      setStatus("done");
      requestAnimationFrame(() => document.querySelector("#analysis-result")?.scrollIntoView({ behavior: "smooth" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "분석 중 예상하지 못한 오류가 발생했습니다.");
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
      analyzedWidth: 720,
      analyzedHeight: 405,
      truncated: false,
    });
    setIsDemo(true);
    setActivePhase("contact");
    setStatus("done");
    setError(null);
    requestAnimationFrame(() => document.querySelector("#analysis-result")?.scrollIntoView({ behavior: "smooth" }));
  }

  const progressPercent = Math.round((progress.completed / Math.max(progress.total, 1)) * 100);

  return (
    <main>
      <nav className="topbar" aria-label="주요 탐색">
        <a className="brand" href="#top" aria-label="SwingLens 처음으로">
          <span className="brand-mark">SL</span>
          <span>SwingLens <small>LAB</small></span>
        </a>
        <a className="privacy-pill" href="#privacy"><Icon name="lock" /> 영상은 폰 밖으로 나가지 않아요</a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> ON-DEVICE VISION COACH</p>
          <h1>내 스윙을<br /><em>눈에 보이게.</em></h1>
          <p className="hero-lead">휴대폰으로 찍고, 전신 관절과 핵심 동작을 기기 안에서 확인하세요. 숫자의 근거와 한계까지 함께 보여드립니다.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => fileInput.current?.click()}><Icon name="camera" /> 스윙 영상 선택</button>
            <button className="button ghost" onClick={runDemo}><Icon name="spark" /> 샘플 결과 보기</button>
          </div>
          <p className="microcopy">계정 없음 · 업로드 없음 · 설치 선택 가능</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="motion-orbit orbit-one" />
          <div className="motion-orbit orbit-two" />
          <svg viewBox="0 0 420 520" className="hero-skeleton">
            <path className="motion-trail" d="M359 61C289 90 270 154 190 188" />
            <path d="M223 155 174 235l-43 86m43-86 77 57 83 26m-160-83 23 132-62 96m62-96 70 74" />
            <path d="m198 218 67 29 69-74" />
            <circle cx="230" cy="111" r="35" />
            <path className="hero-bat" d="m334 173 69-131" />
            {["223,155","174,235","131,321","251,292","334,318","197,377","135,473","267,451","198,218","265,247","334,173"].map((point) => {
              const [cx, cy] = point.split(",");
              return <circle key={point} className="hero-joint" cx={cx} cy={cy} r="7" />;
            })}
          </svg>
          <div className="visual-chip chip-top"><b>33</b><span>LANDMARKS</span></div>
          <div className="visual-chip chip-bottom"><span>LOCAL MODEL</span><b>ACTIVE</b></div>
        </div>
      </section>

      <section className="pipeline" aria-labelledby="pipeline-title">
        <div className="section-heading">
          <p className="eyebrow"><span /> HOW IT WORKS</p>
          <h2 id="pipeline-title">세 단계로, 과장 없이</h2>
          <p>저프레임 영상의 공간적 선명도는 보완하지만 존재하지 않는 순간을 만들어내지는 않습니다.</p>
        </div>
        <div className="pipeline-grid">
          <article><span className="step-number">01</span><div className="step-icon"><Icon name="spark" /></div><h3>프레임 보정</h3><p>고품질 리샘플링과 약한 명암 보정으로 관절 모델이 읽을 프레임을 정돈합니다.</p><small>새 동작 생성 없음</small></article>
          <article><span className="step-number">02</span><div className="step-icon"><Icon name="pose" /></div><h3>스켈레톤 분석</h3><p>내장된 경량 비전 모델이 매 프레임의 33개 신체 랜드마크를 로컬에서 찾습니다.</p><small>MediaPipe Pose Lite</small></article>
          <article><span className="step-number">03</span><div className="step-icon"><Icon name="compare" /></div><h3>단계별 비교</h3><p>셋업부터 팔로스루까지 2D 지표를 투명한 프로토타입 참고 범위와 비교합니다.</p><small>신뢰도와 근거 표시</small></article>
        </div>
      </section>

      <section className="workspace" id="analyze" aria-labelledby="analyze-title">
        <div className="workspace-copy">
          <p className="eyebrow light"><span /> TRY YOUR SWING</p>
          <h2 id="analyze-title">한 번의 스윙,<br />전신이 보이게.</h2>
          <ol className="capture-tips">
            <li><b>가로로</b><span>카메라는 허리 높이, 선수와 3~5m 거리</span></li>
            <li><b>전신을</b><span>머리와 양발, 배트 궤적까지 프레임 안에</span></li>
            <li><b>고정해서</b><span>밝은 곳에서 측면 또는 오픈사이드 방향</span></li>
          </ol>
          <div className="stance-fieldset">
            <span>타석</span>
            <div className="segmented" role="group" aria-label="타석 선택">
              <button className={handedness === "right" ? "active" : ""} onClick={() => setHandedness("right")}>우타</button>
              <button className={handedness === "left" ? "active" : ""} onClick={() => setHandedness("left")}>좌타</button>
            </div>
          </div>
        </div>

        <div className="upload-card">
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            capture="environment"
            onChange={onFile}
          />
          {previewUrl ? (
            <div className="video-preview">
              <video src={previewUrl} controls playsInline preload="metadata" />
              <div className="file-row"><div><b>{file?.name}</b><span>{file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB</span></div><button onClick={() => fileInput.current?.click()}>바꾸기</button></div>
            </div>
          ) : (
            <button className="drop-zone" onClick={() => fileInput.current?.click()}>
              <span className="drop-icon"><Icon name="camera" /></span>
              <b>촬영하거나 영상 고르기</b>
              <span>MP4 · MOV · WebM / 최대 350MB</span>
            </button>
          )}

          {status === "processing" ? (
            <div className="progress-panel" aria-live="polite">
              <div><b>{progress.stage}</b><span>{progressPercent}%</span></div>
              <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
              <p>브라우저를 닫지 마세요. 프레임은 이 기기 메모리에서만 처리됩니다.</p>
            </div>
          ) : (
            <button className="button analyze-button" disabled={!file} onClick={runAnalysis}>내 스윙 분석하기 <Icon name="arrow" /></button>
          )}
          {error && <div className="error-box" role="alert"><Icon name="warn" />{error}</div>}
          <div className="local-proof"><Icon name="lock" /><span><b>서버 전송 0바이트</b>선택한 영상은 브라우저 탭을 닫으면 메모리에서 사라집니다.</span></div>
        </div>
      </section>

      {result && (
        <section className="results" id="analysis-result" aria-labelledby="result-title">
          <div className="result-head">
            <div>
              <p className="eyebrow"><span /> {isDemo ? "SAMPLE REPORT" : "YOUR REPORT"}</p>
              <h2 id="result-title">{result.canCoach ? "스윙 체크가 끝났어요." : "촬영 조건을 보완해 주세요."}</h2>
              <p>{isDemo ? "합성 스켈레톤으로 만든 기능 데모입니다. 실제 사용자 결과가 아닙니다." : `${result.sampledFrames}개 타임스탬프를 기기 안에서 검사했습니다.`}</p>
            </div>
            <div className={`score-ring ${result.score === null ? "no-score" : ""}`} style={{ "--score": result.score ?? 0 } as React.CSSProperties}>
              <strong>{result.score ?? "—"}</strong><span>{result.score === null ? "재촬영" : "참고 점수"}</span>
            </div>
          </div>

          <div className="quality-grid">
            {result.quality.map((check) => (
              <article key={check.key} className={`quality ${check.status}`}>
                <span className="status-dot"><Icon name={check.status === "pass" ? "check" : "warn"} /></span>
                <div><b>{check.label}</b><p>{check.detail}</p></div>
              </article>
            ))}
          </div>

          {videoMeta?.truncated && <p className="notice"><Icon name="warn" /> 12초를 넘는 영상이라 앞부분 12초만 분석했습니다.</p>}

          {result.canCoach && selectedPhase && (
            <div className="phase-report">
              <div className="phase-tabs" role="tablist" aria-label="스윙 단계">
                {PHASE_ORDER.map((key, index) => {
                  const phase = result.phases.find((item) => item.key === key);
                  return phase ? <button key={key} role="tab" aria-selected={activePhase === key} className={activePhase === key ? "active" : ""} onClick={() => setActivePhase(key)}><span>0{index + 1}</span>{phase.label}</button> : null;
                })}
              </div>
              <div className="phase-grid">
                <SkeletonView frame={selectedPhase.frame} label={selectedPhase.label} />
                <div className="metric-panel">
                  <div className="metric-heading"><div><p>{selectedPhase.description}</p><h3>{selectedPhase.label} 체크</h3></div><strong>{selectedPhase.score}</strong></div>
                  <div className="metric-list">
                    {selectedPhase.metrics.map((metric) => (
                      <article key={metric.key} className={metric.status}>
                        <div className="metric-top"><span>{metric.label}</span><b><MetricValue value={metric.value} unit={metric.unit} /></b></div>
                        <div className="metric-bar"><span style={{ width: `${Math.max(4, metric.score)}%` }} /></div>
                        <p>{metric.note}</p>
                        <small>참고 {metric.reference[0]}–{metric.reference[1]}{metric.unit === "몸통" ? "×" : metric.unit}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="coaching-grid">
            <article className="coach-card strength"><span className="card-kicker">KEEP</span><h3>유지할 점</h3><ul>{result.strengths.length ? result.strengths.map((item) => <li key={item}><Icon name="check" />{item}</li>) : <li>촬영 품질을 먼저 보완하면 강점을 확인할 수 있어요.</li>}</ul></article>
            <article className="coach-card adjustment"><span className="card-kicker">NEXT</span><h3>다음 시도</h3><ul>{result.adjustments.map((item) => <li key={item}><Icon name="arrow" />{item}</li>)}</ul></article>
          </div>

          <div className="evidence-note">
            <Icon name="warn" />
            <div><b>이 결과가 말하지 않는 것</b><p>컨택 후보는 손목 속도 피크이지 실제 공 접촉이 아닙니다. 2D 영상만으로 배트 스피드, 타구 속도, 정확한 어택 앵글, 3D 회전각을 측정하지 않습니다. 단계별 범위는 코치 검증 전 프로토타입 기준입니다.</p></div>
          </div>
          <div className="result-footer"><p>{result.disclaimer}</p><button className="button ghost-dark" onClick={() => { setResult(null); setStatus("idle"); document.querySelector("#analyze")?.scrollIntoView({ behavior: "smooth" }); }}>다른 스윙 확인하기</button></div>
        </section>
      )}

      <section className="privacy-section" id="privacy">
        <div><p className="eyebrow light"><span /> PRIVACY BY DESIGN</p><h2>영상이 머무는 곳은<br />오직 당신의 기기.</h2></div>
        <div className="privacy-flow"><span>내 영상</span><i>→</i><span>브라우저 메모리</span><i>→</i><span>내 결과</span></div>
        <p>로그인도, 클라우드 저장도, 광고 추적기도 넣지 않았습니다. 모델 파일만 처음 한 번 내려받고 분석은 브라우저에서 실행합니다.</p>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark">SL</span><span>SwingLens</span></a><p>Vision-first baseball movement prototype · 2026</p><p>훈련 참고용 · 의료 또는 부상 진단용 아님</p></footer>
    </main>
  );
}

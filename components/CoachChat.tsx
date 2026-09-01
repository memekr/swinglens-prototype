"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { buildReportBrief } from "@/lib/report-brief";
import type { AnalysisResult } from "@/lib/types";
import { Icon } from "./Icon";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function renderCoachText(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const title = heading[2];
      const restLines = lines.slice(1).filter((ln) => ln.trim());
      const numbered = restLines.length > 0 && restLines.every((ln) => /^\s*\d+[.)]\s+/.test(ln));
      const bullets = restLines.length > 0 && restLines.every((ln) => /^\s*[-*]\s+/.test(ln));
      return (
        <div key={i} className="coach-block">
          <h4>{title}</h4>
          {numbered ? (
            <ol>
              {restLines.map((ln, j) => (
                <li key={j}>{linkify(ln.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          ) : bullets ? (
            <ul>
              {restLines.map((ln, j) => (
                <li key={j}>{linkify(ln.replace(/^\s*[-*]\s+/, ""))}</li>
              ))}
            </ul>
          ) : restLines.length ? (
            restLines.map((ln, j) => <p key={j}>{linkify(ln)}</p>)
          ) : null}
        </div>
      );
    }
    if (lines.every((ln) => /^\s*\d+[.)]\s+/.test(ln))) {
      return (
        <ol key={i}>
          {lines.map((ln, j) => (
            <li key={j}>{linkify(ln.replace(/^\s*\d+[.)]\s+/, ""))}</li>
          ))}
        </ol>
      );
    }
    if (lines.every((ln) => /^\s*[-*]\s+/.test(ln))) {
      return (
        <ul key={i}>
          {lines.map((ln, j) => (
            <li key={j}>{linkify(ln.replace(/^\s*[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{linkify(block)}</p>;
  });
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CoachChat({ analysis = null }: { analysis?: AnalysisResult | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const hasReport = Boolean(analysis);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          analysis: analysis ? buildReportBrief(analysis) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Coach request failed (${response.status})`);
      }
      const answer = typeof data.answer === "string" ? data.answer.trim() : "";
      if (!answer) throw new Error("The coach returned an empty reply.");
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach the hitting coach.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="coach-chat" id="coach">
      <div className="coach-head">
        <p className="eyebrow"><span /> HITTING COACH</p>
        <h3>{hasReport ? "Ask about this report." : "Ask about the swing."}</h3>
        <p>
          {hasReport
            ? "This chat can see your prototype score and checkpoint numbers. The video still stays in this browser."
            : "Hitting questions go to the local notes + Gemma. Analyze a clip if you want score questions answered from your report."}
        </p>
      </div>

      <div className="coach-log" ref={logRef} aria-live="polite">
        {messages.length === 0 && !busy && (
          <p className="coach-empty">
            {hasReport
              ? "Try “Why did I receive this prototype score?” or “What does lead-knee angle mean on this clip?”"
              : "Try “How do I hit the outside pitch?” then a follow-up like “What if I keep rolling over?”"}
          </p>
        )}
        {messages.map((msg, i) => (
          <article key={i} className={`coach-bubble ${msg.role}`}>
            <span>{msg.role === "user" ? "You" : "Coach"}</span>
            {msg.role === "assistant" ? renderCoachText(msg.content) : <p>{msg.content}</p>}
          </article>
        ))}
        {busy && <p className="coach-waiting">Looking up notes and writing a reply…</p>}
      </div>

      {error && (
        <div className="error-box" role="alert">
          <Icon name="warn" />
          {error}
        </div>
      )}

      <form className="coach-form" onSubmit={send}>
        <label className="visually-hidden" htmlFor="coach-input">Hitting question</label>
        <textarea
          id="coach-input"
          rows={2}
          value={draft}
          disabled={busy}
          placeholder={
            messages.length
              ? "Ask a follow-up…"
              : hasReport
                ? "Why did I receive this prototype score?"
                : "How do I hit the outside pitch?"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button className="button primary" type="submit" disabled={busy || !draft.trim()}>
          {messages.length ? "Follow up" : "Ask"} <Icon name="arrow" />
        </button>
      </form>
    </div>
  );
}

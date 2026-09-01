"""
Local hitting-coach HTTP server for SwingLens.

Loads Chroma + BM25 once, then answers chat turns with rag_answer.py (Ollama).

    python rag/server.py
    # default http://127.0.0.1:8765
"""
from __future__ import annotations

import json
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAG_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(RAG_DIR))

from rag_answer import answer_question  # noqa: E402

HOST = "127.0.0.1"
PORT = 8765
_retriever = None


def get_retriever():
    global _retriever
    if _retriever is None:
        from rag_ingest import Retriever
        print("Loading RAG retriever (Chroma + BM25) ...", flush=True)
        _retriever = Retriever()
        print("Retriever ready.", flush=True)
    return _retriever


def cors(handler: BaseHTTPRequestHandler, status: int = 200):
    handler.send_response(status)
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Type", "application/json; charset=utf-8")


def handler_end(handler: BaseHTTPRequestHandler):
    handler.end_headers()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_OPTIONS(self):
        cors(self, 204)
        handler_end(self)

    def do_GET(self):
        if self.path.rstrip("/") == "/health":
            cors(self)
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "retriever": _retriever is not None}).encode())
            return
        cors(self, 404)
        self.end_headers()
        self.wfile.write(b'{"error":"not found"}')

    def do_POST(self):
        if self.path.rstrip("/") not in ("/chat", "/api/rag/chat"):
            cors(self, 404)
            self.end_headers()
            self.wfile.write(b'{"error":"not found"}')
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            cors(self, 400)
            self.end_headers()
            self.wfile.write(b'{"error":"invalid json"}')
            return

        messages = body.get("messages") or []
        if not isinstance(messages, list) or not messages:
            cors(self, 400)
            self.end_headers()
            self.wfile.write(b'{"error":"messages must be a non-empty list"}')
            return

        last = messages[-1]
        if not isinstance(last, dict) or last.get("role") != "user":
            cors(self, 400)
            self.end_headers()
            self.wfile.write(b'{"error":"last message must be a user turn"}')
            return

        question = (last.get("content") or "").strip()
        if not question:
            cors(self, 400)
            self.end_headers()
            self.wfile.write(b'{"error":"empty question"}')
            return

        history = [m for m in messages[:-1] if isinstance(m, dict) and m.get("content")]
        raw_analysis = body.get("analysis")
        analysis = raw_analysis.strip() if isinstance(raw_analysis, str) else None
        try:
            res = answer_question(
                question,
                retriever=get_retriever(),
                history=history,
                analysis=analysis,
            )
        except Exception as exc:
            traceback.print_exc()
            cors(self, 500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
            return

        cors(self)
        self.end_headers()
        self.wfile.write(json.dumps({
            "answer": res.get("answer", ""),
            "abstained": bool(res.get("abstained")),
            "score": res.get("score"),
        }).encode("utf-8"))


if __name__ == "__main__":
    get_retriever()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Hitting coach listening on http://{HOST}:{PORT}/chat", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)

const RAG_URL = process.env.RAG_SERVER_URL || "http://127.0.0.1:8765/chat";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const upstream = await fetch(RAG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Hitting coach is not running. In another terminal: python rag/server.py (Ollama must be on).",
      },
      { status: 503 },
    );
  }
}

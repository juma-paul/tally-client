/**
 * Streaming proxy for the chat SSE endpoint.
 *
 * Next.js rewrites buffer the response body before forwarding it, which
 * means SSE chunks never reach the browser until the stream is fully closed.
 * A Route Handler returns the ReadableStream directly, bypassing that buffer.
 */

const TALLY_URL = process.env.TALLY_URL ?? "http://127.0.0.1:8001";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    // Forward the browser's cookies so the backend auth middleware sees them.
    const cookieHeader = request.headers.get("cookie") ?? "";

    const upstream = await fetch(`${TALLY_URL}/api/v1/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body,
    });

    if (!upstream.ok) {
      return new Response("upstream error", { status: upstream.status });
    }

    // Forward awaiting headers — set before any body bytes arrive so the
    // client can read them the moment `await fetch()` resolves.
    const awaitingHeader = upstream.headers.get("x-tally-awaiting");
    const contextHeader = upstream.headers.get("x-tally-context");

    const responseHeaders: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };
    if (awaitingHeader) responseHeaders["X-Tally-Awaiting"] = awaitingHeader;
    if (contextHeader) responseHeaders["X-Tally-Context"] = contextHeader;

    // Explicit TransformStream pump — more reliable than `new Response(upstream.body)`
    // in Next.js dev server which may wrap or buffer the body reference.
    const { readable, writable } = new TransformStream();
    upstream.body?.pipeTo(writable).catch(() => {});
    return new Response(readable, { headers: responseHeaders });
  } catch {
    return new Response("internal error", { status: 500 });
  }
}

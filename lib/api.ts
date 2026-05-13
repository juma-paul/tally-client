/**
 * Tally API client — wraps tallyApi (axios with cookie auth).
 *
 * Auth functions (login, register, getMe) are removed — handled by
 * AuthProvider via authApi in lib/axios.ts.
 *
 * SSE streaming uses native fetch with credentials: "include" since
 * axios does not support server-sent events.
 */

import { tallyApi } from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Conversation = {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type UserSettings = {
  id: number;
  user_id: number;
  theme: "light" | "dark" | "system";
  voice_enabled: boolean;
  notifications: boolean;
};

// ─── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await tallyApi.get<Conversation[]>("/conversations");
  return data;
}

export async function createConversation(title?: string): Promise<Conversation> {
  const { data } = await tallyApi.post<Conversation>("/conversations", {
    title: title || "New Chat",
  });
  return data;
}

export async function getConversation(
  id: number
): Promise<{ conversation: Conversation; messages: Message[] }> {
  const { data } = await tallyApi.get<{ conversation: Conversation; messages: Message[] }>(
    `/conversations/${id}`
  );
  return data;
}

export async function updateConversation(id: number, title: string): Promise<Conversation> {
  const { data } = await tallyApi.patch<Conversation>(`/conversations/${id}`, { title });
  return data;
}

export async function deleteConversation(id: number): Promise<void> {
  await tallyApi.delete(`/conversations/${id}`);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  const { data } = await tallyApi.get<UserSettings>("/settings");
  return data;
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const { data } = await tallyApi.patch<UserSettings>("/settings", settings);
  return data;
}

export async function updateMyName(name: string): Promise<void> {
  await tallyApi.patch("/users/me", { name });
}

export async function getWsToken(): Promise<string> {
  const { data } = await tallyApi.get<{ token: string }>("/users/me/ws-token");
  return data.token;
}

// ─── Chat (SSE streaming) ─────────────────────────────────────────────────────
// Uses native fetch — axios doesn't support SSE (ReadableStream).
// credentials: "include" sends httpOnly cookies automatically.

export type StreamEvent =
  | { type: "chunk"; text: string }
  | { type: "meta"; data: Record<string, unknown> };

export async function* chatStreamWithConversation(
  message: string,
  conversationId?: number,
  awaiting?: string | null,
  context?: Record<string, unknown> | null
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = { message, conversation_id: conversationId };
  if (awaiting) body.awaiting = awaiting;
  if (context) body.context = context;

  const res = await fetch("/api/chat/stream", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = new Error("Stream request failed") as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  // Read awaiting state from headers — available before any body bytes arrive.
  const awaitingHeader = res.headers.get("x-tally-awaiting");
  const contextHeader = res.headers.get("x-tally-context");
  if (awaitingHeader) {
    try {
      yield {
        type: "meta" as const,
        data: contextHeader
          ? (JSON.parse(contextHeader) as Record<string, unknown>)
          : { awaiting: awaitingHeader },
      };
    } catch {
      /* ignore malformed context */
    }
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // Normalize CRLF → LF so the \n\n split works regardless of server line endings.
    // Do this after appending so cross-chunk \r\n pairs are handled correctly.
    buffer = buffer.replace(/\r\n/g, "\n");

    // SSE events are terminated by a blank line (\n\n).
    // Splitting on \n\n gives complete events; the last entry may be partial.
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      if (!event.trim()) continue;

      // Collect every "data: ..." line within this event and rejoin with \n
      // so that multi-line content (e.g. markdown tables) keeps its newlines.
      const dataLines = event
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.replace(/^data: ?/, "")); // strip "data: " prefix

      if (dataLines.length === 0) continue;

      const data = dataLines.join("\n");

      // [DONE] terminates the stream — break out of both loops immediately.
      if (data === "[DONE]") { streamDone = true; break; }
      if (data.trim() === "") continue;

      if (data.startsWith("__META__")) {
        try {
          yield { type: "meta", data: JSON.parse(data.slice(8)) as Record<string, unknown> };
        } catch (err) {
          console.error("[SSE] Failed to parse __META__ payload:", data.slice(8), err);
        }
      } else {
        yield { type: "chunk", text: data };
      }
    }
  }

  // Release the reader lock so the browser can garbage-collect the connection.
  reader.cancel().catch(() => {});
}

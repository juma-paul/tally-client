"use client";

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  Suspense,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getConversation,
  createConversation,
  chatStreamWithConversation,
  Message,
} from "@/lib/api";
import { authApi } from "@/lib/axios";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import ChatMessage from "@/components/chat-message";
import SettingsModal from "@/components/settings-modal";
import HelpModal from "@/components/help-modal";
import VoiceBar from "@/components/voice-bar";

type LocalMessage = {
  role: "user" | "assistant";
  content: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFirstName(name?: string | null, email?: string | null): string {
  const display = name?.trim() || (email ? email.split("@")[0] : "");
  if (!display) return "";
  const first = display.split(/[.\s_-]+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12
    ? "Good morning"
    : hour >= 12 && hour < 17
      ? "Good afternoon"
      : "Good evening";
}

// ── Main component ────────────────────────────────────────────────────────────

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, logout } = useAuth();

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceStreaming, setIsVoiceStreaming] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Refs hold awaiting context — read in handleSubmit to avoid stale closures.
  const pendingAwaitingRef = useRef<string | null>(null);
  const pendingContextRef = useRef<Record<string, unknown> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasStreamingRef = useRef(false);

  const hasMessages = messages.length > 0;

  // ── Auth guard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
  }, [user, isLoading, router]);

  // ── Load conversation from URL ───────────────────────────────────────────────
  useEffect(() => {
    if (isInitialized) return;
    const convId = searchParams.get("c");
    if (convId) {
      const id = parseInt(convId, 10);
      if (!isNaN(id)) {
        getConversation(id)
          .then((data) => {
            setCurrentConversationId(id);
            setMessages(
              data.messages.map((m: Message) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            );
          })
          .catch(() => router.replace("/chat"));
      }
    }
    setIsInitialized(true);
  }, [searchParams, router, isInitialized]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Re-focus input after streaming ends ─────────────────────────────────────
  useEffect(() => {
    if (!isStreaming && wasStreamingRef.current) {
      inputRef.current?.focus();
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // ── Textarea auto-resize ─────────────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // ── Conversation helpers ─────────────────────────────────────────────────────
  const handleSelectConversation = useCallback(async (id: number) => {
    try {
      const data = await getConversation(id);
      setCurrentConversationId(id);
      setMessages(
        data.messages.map((m: Message) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
      pendingAwaitingRef.current = null;
      pendingContextRef.current = null;
      window.history.replaceState(null, "", `/chat?c=${id}`);
    } catch {
      console.error("Failed to load conversation");
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    pendingAwaitingRef.current = null;
    pendingContextRef.current = null;
    setIsVoiceActive(false);
    window.history.replaceState(null, "", "/chat");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // ── Voice message callbacks ─────────────────────────────────────────────────
  // These fire from VoiceBar and add messages directly to the thread.
  const isFirstVoiceMessageRef = useRef(true);

  const handleVoiceConversationCreated = useCallback((id: number) => {
    setCurrentConversationId(id);
    window.history.replaceState(null, "", `/chat?c=${id}`);
  }, []);

  const handleVoiceTranscript = useCallback((text: string) => {
    setMessages((prev) => {
      const isFirst = prev.length === 0;
      isFirstVoiceMessageRef.current = isFirst;
      return [...prev, { role: "user", content: text }];
    });
  }, []);

  const handleVoiceResponseStart = useCallback(() => {
    setIsVoiceStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
  }, []);

  const handleVoiceChunk = useCallback((text: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: "assistant",
        content: updated[updated.length - 1].content + text,
      };
      return updated;
    });
  }, []);

  const handleVoiceComplete = useCallback(() => {
    setIsVoiceStreaming(false);
    if (isFirstVoiceMessageRef.current) {
      setSidebarRefresh((prev) => prev + 1);
      isFirstVoiceMessageRef.current = false;
    }
  }, []);

  async function ensureConversation(): Promise<number> {
    if (currentConversationId) return currentConversationId;
    const conv = await createConversation();
    setCurrentConversationId(conv.id);
    window.history.replaceState(null, "", `/chat?c=${conv.id}`);
    return conv.id;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(overrideMessage?: string) {
    const userMessage = (overrideMessage ?? input).trim();
    if (!userMessage || isStreaming) return;

    const isFirstMessage = messages.length === 0;
    setInput("");

    // Read awaiting context from refs — guaranteed current regardless of render cycle.
    const sentAwaiting = pendingAwaitingRef.current;
    const sentContext = pendingContextRef.current;
    pendingAwaitingRef.current = null;
    pendingContextRef.current = null;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);
    // Add empty assistant bubble — shows thinking dots until response arrives.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Extract stream iteration so it can be retried after a token refresh.
    async function runStream(
      msg: string,
      cid: number,
      aw: string | null,
      ctx: Record<string, unknown> | null,
    ) {
      for await (const event of chatStreamWithConversation(msg, cid, aw, ctx)) {
        if (event.type === "meta") {
          const nextAwaiting = event.data?.awaiting as string | undefined;
          if (nextAwaiting) {
            pendingAwaitingRef.current = nextAwaiting;
            pendingContextRef.current = event.data as Record<string, unknown>;
          }
        } else if (event.type === "chunk") {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: updated[updated.length - 1].content + event.text,
            };
            return updated;
          });
        }
      }
    }

    try {
      const convId = await ensureConversation();
      await runStream(userMessage, convId, sentAwaiting, sentContext);
      if (isFirstMessage) setSidebarRefresh((prev) => prev + 1);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 401) {
        // Session expired — refresh token once then retry.
        try {
          await authApi.post("/auth/refresh");
          const convId = currentConversationId ?? (await ensureConversation());
          await runStream(userMessage, convId, sentAwaiting, sentContext);
          if (isFirstMessage) setSidebarRefresh((prev) => prev + 1);
          return;
        } catch {
          router.push("/login?reason=session_expired");
          return;
        }
      }
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── Input box (shared between centered and footer layouts) ───────────────────
  const inputBox = (
    <div
      className={cn(
        "relative rounded-2xl border bg-background transition-colors duration-150",
        "border-border focus-within:border-indigo-400",
        !hasMessages && "shadow-sm",
      )}
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          hasMessages
            ? "Message Tally..."
            : "What habit do you want to build today?"
        }
        rows={1}
        disabled={isStreaming}
        className={cn(
          "w-full resize-none bg-transparent px-4 pb-12 text-[15px] leading-relaxed",
          "placeholder:text-muted-foreground focus:outline-none disabled:opacity-50",
          !hasMessages ? "min-h-[72px] pt-4" : "min-h-[52px] pt-3",
        )}
        style={{ maxHeight: 200 }}
      />

      {/* Toolbar row inside input */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3">
        {/* Voice button */}
        <button
          type="button"
          onClick={() => setIsVoiceActive(true)}
          disabled={isStreaming}
          title="Voice mode"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-indigo-50 hover:text-indigo-500 disabled:opacity-40"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        {/* Right: hint + send */}
        <div className="flex items-center gap-2">
          {!hasMessages && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              ⏎ to send
            </span>
          )}
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
              input.trim() && !isStreaming
                ? "bg-indigo-500 text-white hover:bg-indigo-600"
                : "bg-muted text-muted-foreground opacity-40",
            )}
          >
            {isStreaming ? (
              <svg
                className="h-3.5 w-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        refreshTrigger={sidebarRefresh}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main pane */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              title="Open menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span
              className="text-[1.45rem] font-bold text-foreground leading-none"
              style={{ letterSpacing: "0.04em" }}
            >
              Ta<span className="text-indigo-500">ll</span>y
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hidden rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:block"
              title="Settings"
            >
              <svg
                className="h-4.5 w-4.5 h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              onClick={logout}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* ── EMPTY STATE — centered input ── */}
        {!hasMessages ? (
          <main className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-8">
            <div className="w-full max-w-2xl">
              {/* Greeting */}
              <div className="mb-8 text-center animate-fade-up">
                <h2 className="text-3xl font-medium tracking-tight">
                  {getGreetingPrefix()}
                  {", "}
                  {getFirstName(user?.name, user?.email) && (
                    <span className="text-[#6366f1]">
                      {getFirstName(user?.name, user?.email)}
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  How can I help with your habits today?
                </p>
              </div>

              {/* Input or VoiceBar */}
              <div className="animate-fade-up">
                {isVoiceActive ? (
                  <VoiceBar
                    conversationId={currentConversationId}
                    onConversationCreated={handleVoiceConversationCreated}
                    onTranscript={handleVoiceTranscript}
                    onResponseStart={handleVoiceResponseStart}
                    onResponseChunk={handleVoiceChunk}
                    onResponseComplete={handleVoiceComplete}
                    onClose={() => {
                      setIsVoiceActive(false);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                  />
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    {inputBox}
                  </form>
                )}
              </div>

              {/* Suggestions — only shown when not in voice mode */}
              <div
                className={`mt-4 flex flex-wrap justify-center gap-2 animate-fade-up ${isVoiceActive ? "invisible" : ""}`}
              >
                {[
                  "Track my workout",
                  "Show my habits",
                  "How am I doing?",
                  "Create a new habit",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </main>
        ) : (
          /* ── CHAT STATE — messages + bottom input ── */
          <>
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 sm:px-4 sm:py-8">
                {messages.map((msg, i) => {
                  const isCurrentlyStreaming =
                    (isStreaming || isVoiceStreaming) &&
                    i === messages.length - 1 &&
                    msg.role === "assistant";
                  return (
                    <div key={i} className="animate-message">
                      <ChatMessage
                        role={msg.role}
                        content={msg.content}
                        isStreaming={isCurrentlyStreaming}
                      />
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </main>

            <footer className="shrink-0 border-t border-border px-3 py-3 sm:px-4 sm:py-4">
              <div className="mx-auto max-w-3xl">
                {isVoiceActive ? (
                  <VoiceBar
                    conversationId={currentConversationId}
                    onConversationCreated={handleVoiceConversationCreated}
                    onTranscript={handleVoiceTranscript}
                    onResponseStart={handleVoiceResponseStart}
                    onResponseChunk={handleVoiceChunk}
                    onResponseComplete={handleVoiceComplete}
                    onClose={() => {
                      setIsVoiceActive(false);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                  />
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    {inputBox}
                  </form>
                )}
                {!isVoiceActive && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Enter to send · Shift+Enter for new line
                  </p>
                )}
              </div>
            </footer>
          </>
        )}
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
          Loading...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

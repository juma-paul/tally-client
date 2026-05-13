"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VoiceClient, VoiceState } from "@/lib/websocket";
import { getWsToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const BAR_COUNT = 22;
const IDLE_HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, i) => 2 + 3 * Math.abs(Math.sin((i / BAR_COUNT) * Math.PI))
);

type MicPermission = "pending" | "granted" | "denied";

type VoiceBarProps = {
  conversationId: number | null;
  onConversationCreated: (id: number) => void;
  onTranscript: (text: string) => void;
  onResponseStart: () => void;
  onResponseChunk: (text: string) => void;
  onResponseComplete: () => void;
  onClose: () => void;
};

export default function VoiceBar({
  conversationId,
  onConversationCreated,
  onTranscript,
  onResponseStart,
  onResponseChunk,
  onResponseComplete,
  onClose,
}: VoiceBarProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [micPermission, setMicPermission] = useState<MicPermission>("pending");
  const [error, setError] = useState("");
  const [barHeights, setBarHeights] = useState<number[]>(IDLE_HEIGHTS);
  const volumeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const clientRef = useRef<VoiceClient | null>(null);

  // ── Animated waveform ───────────────────────────────────────────────────────
  const animateWaveform = useCallback(() => {
    const vol = volumeRef.current;
    setBarHeights((prev) =>
      prev.map((h, i) => {
        if (vol < 0.02) {
          return h + (IDLE_HEIGHTS[i] - h) * 0.12;
        }
        const phase = (Date.now() / 90 + i * 0.6) % (Math.PI * 2);
        const wave = 0.5 + 0.5 * Math.sin(phase);
        const target = 2 + vol * 22 * wave * (0.5 + 0.5 * Math.sin(i * 0.85));
        return h + (target - h) * 0.3;
      })
    );
    rafRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  // ── Mount: request mic permission, then connect ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    rafRef.current = requestAnimationFrame(animateWaveform);

    // Request mic permission and fetch WS auth token in parallel
    Promise.all([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      getWsToken(),
    ])
      .then(([stream, token]) => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled) return;

        setMicPermission("granted");

        const client = new VoiceClient(
          {
            onStateChange: setVoiceState,
            onTranscript,
            onResponseStart,
            onResponseChunk,
            onResponseComplete,
            onConversationCreated,
            onError: (msg) => {
              setError(msg);
              setTimeout(() => setError(""), 4000);
            },
            onVolume: (vol) => { volumeRef.current = vol; },
            onAudioComplete: () => {},
          },
          { conversationId, token }
        );

        clientRef.current = client;

        client.connect().then((connected) => {
          if (cancelled) { client.disconnect(); return; }
          setIsConnected(connected);
          if (connected) client.startListening();
          else setError("Could not connect to voice server");
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // Distinguish mic denial from token fetch failure
        if (err instanceof Error && err.name === "NotAllowedError") {
          setMicPermission("denied");
          setError("Microphone access is required");
        } else {
          setMicPermission("denied");
          setError("Could not authenticate voice session");
        }
      });

    return () => {
      cancelled = true;
      clientRef.current?.disconnect();
      clientRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    clientRef.current?.disconnect();
    clientRef.current = null;
    onClose();
  }

  function handleTap() {
    const c = clientRef.current;
    if (!c) return;
    if (voiceState === "speaking") c.stopAudio();
    else if (voiceState === "idle" && isConnected) c.startListening();
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const isBusy = voiceState === "processing" || voiceState === "responding";

  const statusLabel =
    error ||
    (micPermission === "pending" ? "Requesting mic…" :
     micPermission === "denied"  ? "Microphone access denied" :
     !isConnected ? "Connecting…" :
     voiceState === "listening"  ? "Listening" :
     voiceState === "processing" ? "Processing…" :
     voiceState === "responding" ? "Thinking…" :
     voiceState === "speaking"   ? "Speaking" :
     "Ready");

  // Bar colour — all states use indigo family
  const barColor =
    voiceState === "listening"  ? "#6366f1"  // indigo-500
    : voiceState === "speaking" ? "#a5b4fc"  // indigo-300
    : voiceState === "processing" || voiceState === "responding" ? "#c7d2fe"  // indigo-200
    : "#e0e7ff";  // indigo-100 idle

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background px-5 py-3.5 shadow-sm">

      {/* Waveform — tappable, takes up remaining space */}
      <button
        onClick={handleTap}
        disabled={isBusy || !isConnected || micPermission !== "granted"}
        aria-label={statusLabel}
        className="flex min-w-0 flex-1 items-end gap-[2px] disabled:cursor-default"
        style={{ height: 28 }}
      >
        {barHeights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${Math.max(1, Math.round(h))}px`,
              backgroundColor: micPermission === "denied" ? "#f87171" : barColor,
              opacity: isBusy ? 0.25 : micPermission === "pending" ? 0.35 : 1,
              transition: "height 45ms linear, background-color 500ms ease, opacity 300ms ease",
            }}
          />
        ))}
      </button>

      {/* Status label */}
      <span
        className={cn(
          "shrink-0 text-[13px] tabular-nums tracking-tight transition-colors duration-300",
          error ? "text-rose-400" : "text-muted-foreground"
        )}
      >
        {statusLabel}
      </span>

      {/* End Voice button — phone hang-up icon in a red circle */}
      <button
        onClick={handleClose}
        title="End voice conversation"
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-all duration-150 hover:bg-rose-600 hover:shadow-md active:scale-95"
      >
        {/* Phone hang-up icon */}
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19.59 7c.42.78.65 1.64.65 2.53C20.24 14.45 16.59 18 12 18s-8.24-3.55-8.24-8.47c0-.89.23-1.75.65-2.53L2 5.5C1.04 7.04.5 8.85.5 10.75.5 17.1 5.68 22 12 22s11.5-4.9 11.5-11.25c0-1.9-.54-3.71-1.5-5.25L19.59 7z"/>
        </svg>
      </button>
    </div>
  );
}

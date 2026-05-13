/**
 * WebSocket client for real-time voice conversation.
 *
 * VAD: Silero (via @ricky0123/vad-web) — ML-based voice activity detection.
 * Replaces the energy-based threshold approach that fired on background noise,
 * fans, keyboard clicks, and TV audio. Silero detects the shape of human speech,
 * not just volume. First model load ~500ms (one-time); subsequent sessions instant.
 *
 * Audio capture: Silero gives us a Float32Array of the detected speech segment.
 * We encode it as WAV and send it as a single binary message, then "process".
 * No streaming chunks or race conditions — the whole segment arrives atomically.
 */

import type { MicVAD as MicVADInstance } from "@ricky0123/vad-web";

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "responding"
  | "speaking"
  | "error";

export type VoiceMessage =
  | { type: "transcript"; text: string }
  | { type: "response_start" }
  | { type: "response_chunk"; text: string }
  | { type: "response_end"; full_text: string }
  | { type: "audio_start"; format?: string }
  | { type: "audio_chunk"; data: string; sentence_index?: number }
  | { type: "audio_end" }
  | { type: "error"; message: string }
  | { type: "pong" }
  | { type: "conversation_id"; id: number };

export type VoiceCallbacks = {
  onStateChange?: (state: VoiceState) => void;
  onTranscript?: (text: string) => void;
  onResponseStart?: () => void;
  onResponseChunk?: (text: string) => void;
  onResponseComplete?: (text: string) => void;
  onAudioChunk?: (data: ArrayBuffer) => void;
  onAudioComplete?: () => void;
  onError?: (message: string) => void;
  onConversationCreated?: (id: number) => void;
  /** Normalised volume 0–1, fired every ~50 ms while listening */
  onVolume?: (volume: number) => void;
};

export type VoiceClientOptions = {
  conversationId?: number | null;
  /** JWT token for auth — required when cookies don't cross ports (dev mode) */
  token?: string;
};

// WebSocket connects directly to the Tally backend.
// Next.js rewrites don't support WS upgrades, so we bypass the proxy.
// Set NEXT_PUBLIC_WS_URL in .env.local for production (e.g. wss://api.yourapp.com).
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8001";

// ── WAV encoder ────────────────────────────────────────────────────────────────
// Silero gives us Float32 PCM at 16 kHz.  Encode as standard WAV so any STT
// provider (Groq, Whisper, ElevenLabs Scribe) can consume it without issues.

function encodeWav(samples: Float32Array, sampleRate = 16_000): Uint8Array {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i));
  };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true);
  s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true);                   // PCM chunk size
  v.setUint16(20, 1, true);                    // PCM format
  v.setUint16(22, 1, true);                    // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);       // byte rate
  v.setUint16(32, 2, true);                    // block align
  v.setUint16(34, 16, true);                   // 16-bit
  s(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32_767, true);
  }
  return new Uint8Array(buf);
}

// ── VoiceClient ────────────────────────────────────────────────────────────────

export class VoiceClient {
  private ws: WebSocket | null = null;

  // Mic + volume display
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private vadInterval: ReturnType<typeof setInterval> | null = null;

  // Silero VAD — created once, paused/resumed between turns
  private micVAD: MicVADInstance | null = null;

  private conversationId: number | null;
  private token: string | undefined;

  // Web Audio API playback — gapless scheduling via AudioContext timeline.
  // PCM format (pcm_24000) avoids MP3 encoder delay (~26 ms gap per chunk).
  private playbackCtx: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private pendingSourceCount: number = 0;
  private audioFormat: string = "pcm_24000";
  // Set to true when server sends audio_end — completion fires only when
  // pendingSourceCount also reaches 0 so we don't restart the mic mid-sentence.
  private audioStreamComplete: boolean = false;

  private state: VoiceState = "idle";
  private callbacks: VoiceCallbacks = {};
  // Set to true on disconnect() — prevents any pending setTimeout from re-opening
  // the mic after the user has explicitly ended the voice session.
  private disconnected = false;

  // Volume display constant
  private readonly SILENCE_THRESHOLD = 25;  // dB — used for volume normalisation

  constructor(callbacks: VoiceCallbacks = {}, options: VoiceClientOptions = {}) {
    this.callbacks = callbacks;
    this.conversationId = options.conversationId ?? null;
    this.token = options.token;
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  getState(): VoiceState {
    return this.state;
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const params = new URLSearchParams();
        if (this.conversationId) params.set("conversation_id", String(this.conversationId));
        if (this.token) params.set("token", this.token);
        const qs = params.size ? `?${params.toString()}` : "";
        this.ws = new WebSocket(`${WS_BASE}/api/v1/ws/voice${qs}`);

        this.ws.onopen = () => {
          this.setState("idle");
          resolve(true);
        };

        this.ws.onclose = () => {
          this.setState("idle");
          this.cleanup();
        };

        this.ws.onerror = () => {
          this.callbacks.onError?.("WebSocket connection failed");
          this.setState("error");
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data) as VoiceMessage);
        };
      } catch {
        this.callbacks.onError?.("Failed to connect");
        resolve(false);
      }
    });
  }

  disconnect() {
    this.disconnected = true;
    this.stopListening();
    this.stopAudio();
    this.destroyVAD();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("idle");
  }

  private handleMessage(msg: VoiceMessage) {
    switch (msg.type) {
      case "transcript":
        this.callbacks.onTranscript?.(msg.text);
        break;

      case "response_start":
        this.setState("responding");
        this.callbacks.onResponseStart?.();
        break;

      case "response_chunk":
        this.callbacks.onResponseChunk?.(msg.text);
        break;

      case "response_end":
        this.callbacks.onResponseComplete?.(msg.full_text);
        break;

      case "audio_start":
        this.setState("speaking");
        this.audioStreamComplete = false;
        this.pendingSourceCount = 0;
        // Record format so scheduleAudioBuffer knows how to decode.
        // "pcm_24000" = 16-bit signed LE mono @ 24 kHz — no encoder delay.
        this.audioFormat = msg.format ?? "pcm_24000";
        if (this.playbackCtx) {
          this.playbackCtx.close();
          this.playbackCtx = null;
        }
        this.nextPlayTime = 0;
        break;

      case "audio_chunk": {
        try {
          const bytes = Uint8Array.from(atob(msg.data), (c) => c.charCodeAt(0));
          this.scheduleAudioBuffer(bytes.buffer.slice(0) as ArrayBuffer);
        } catch (e) {
          console.error("Failed to decode audio chunk:", e);
        }
        break;
      }

      case "audio_end":
        this.audioStreamComplete = true;
        this.checkAudioComplete();
        break;

      case "conversation_id":
        this.conversationId = msg.id;
        this.callbacks.onConversationCreated?.(msg.id);
        break;

      case "error":
        this.callbacks.onError?.(msg.message);
        this.setState("idle");
        setTimeout(() => {
          if (!this.disconnected && this.ws?.readyState === WebSocket.OPEN && this.state === "idle") {
            this.startListening();
          }
        }, 2000);
        break;

      case "pong":
        break;
    }
  }

  // ── Playback ─────────────────────────────────────────────────────────────────

  private getPlaybackCtx(): AudioContext {
    if (!this.playbackCtx || this.playbackCtx.state === "closed") {
      this.playbackCtx = new AudioContext();
      this.nextPlayTime = 0;
    }
    return this.playbackCtx;
  }

  /**
   * Schedule an audio chunk on the Web Audio timeline immediately after the
   * previous chunk — zero gap between chunks.
   *
   * PCM path (default): raw 16-bit signed LE mono bytes are converted directly
   * to an AudioBuffer without decodeAudioData.  No encoder delay, no gaps.
   *
   * MP3 fallback: kept for compatibility if the server sends a non-PCM format.
   */
  private async scheduleAudioBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    const ctx = this.getPlaybackCtx();
    try {
      if (ctx.state === "suspended") await ctx.resume();

      let audioBuffer: AudioBuffer;

      if (this.audioFormat.startsWith("pcm_")) {
        // Parse sample rate: "pcm_24000" → 24000
        const sampleRate = parseInt(this.audioFormat.slice(4), 10);
        const int16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32_768.0;  // signed 16-bit → float [-1, 1]
        }
        audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
        audioBuffer.copyToChannel(float32, 0);
      } else {
        // MP3/AAC fallback — has encoder delay gaps, but kept for compatibility
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime, this.nextPlayTime);
      source.start(startAt);
      this.nextPlayTime = startAt + audioBuffer.duration;
      this.pendingSourceCount++;

      source.onended = () => {
        this.pendingSourceCount--;
        this.checkAudioComplete();
      };
    } catch (e) {
      console.error("Failed to schedule audio buffer:", e);
      this.checkAudioComplete();
    }
  }

  private checkAudioComplete() {
    if (this.audioStreamComplete && this.pendingSourceCount <= 0) {
      this.setState("idle");
      this.callbacks.onAudioComplete?.();
      setTimeout(() => { if (!this.disconnected) this.startListening(); }, 300);
    }
  }

  // ── Silero VAD + microphone ───────────────────────────────────────────────────

  /**
   * Start listening for speech using Silero VAD.
   *
   * First call: acquires the microphone, loads the Silero ONNX model (~500 ms,
   * one-time), and creates the MicVAD instance.
   * Subsequent calls: resumes the already-loaded instance instantly.
   */
  async startListening(): Promise<boolean> {
    if (this.disconnected) return false;
    if (this.state !== "idle") return false;

    try {
      // ── Acquire mic stream (once per session) ──
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // AnalyserNode feeds the volume waveform animation only — VAD is handled
        // by Silero, not by frequency energy.
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
        const src = this.audioContext.createMediaStreamSource(this.mediaStream);
        src.connect(this.analyser);
      }

      // ── Create Silero MicVAD (once; reuse on subsequent turns) ──
      if (!this.micVAD) {
        // Dynamic import keeps this out of SSR bundles.
        const { MicVAD } = await import("@ricky0123/vad-web");

        const capturedStream = this.mediaStream!;

        this.micVAD = await MicVAD.new({
          // ── Asset paths — files copied to public/ at build time ──
          // Default baseAssetPath is "./" which resolves relative to the
          // Next.js chunk URL (/_next/static/chunks/) and 404s.
          baseAssetPath: "/",
          onnxWASMBasePath: "/",

          // ── Stream management — reuse our stream, don't prompt twice ──
          getStream: async () => capturedStream,
          pauseStream: async () => { /* we own the stream — never stop tracks */ },
          resumeStream: async () => capturedStream,

          // ── Silero thresholds (all durations in milliseconds) ──
          positiveSpeechThreshold: 0.6,
          negativeSpeechThreshold: 0.4,
          minSpeechMs: 250,          // ignore sounds shorter than 250 ms
          preSpeechPadMs: 300,       // prepend 300 ms before detected speech start
          redemptionMs: 800,         // 800 ms silence before declaring speech end

          onSpeechEnd: (audio: Float32Array) => {
            if (this.state === "listening" && this.ws?.readyState === WebSocket.OPEN) {
              this.processVADAudio(audio);
            }
          },

          onVADMisfire: () => {
            // Sound too short to be speech — keyboard click, door slam, etc. Ignore.
          },
        });
      }

      await this.micVAD.start();
      this.setState("listening");
      this.startVolumeMonitor();
      return true;
    } catch {
      this.callbacks.onError?.("Microphone access denied");
      this.setState("error");
      return false;
    }
  }

  /**
   * Process a speech segment detected by Silero.
   * Encodes Float32 PCM (16 kHz, mono) as a WAV file and sends it to the server
   * as a single binary message followed by a "process" control message.
   * No streaming chunks, no race conditions — the full segment arrives atomically.
   */
  private processVADAudio(audio: Float32Array): void {
    if (this.state !== "listening" || !this.ws) return;

    this.setState("processing");
    void this.micVAD?.pause();  // async but fire-and-forget — called from sync callback
    this.stopVolumeMonitor();

    if (this.ws.readyState === WebSocket.OPEN) {
      const wav = encodeWav(audio, 16_000);
      this.ws.send(wav);
      this.ws.send(JSON.stringify({ type: "process", content_type: "audio/wav" }));
    }
  }

  /** Volume-display loop — reads from AnalyserNode every 50 ms. */
  private startVolumeMonitor() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.vadInterval = setInterval(() => {
      if (!this.analyser || this.state !== "listening") return;
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);
      const volume = 20 * Math.log10(rms / 255 + 0.0001);
      const normalized = Math.min(1, Math.max(0, (volume + this.SILENCE_THRESHOLD) / this.SILENCE_THRESHOLD));
      this.callbacks.onVolume?.(normalized);
    }, 50);
  }

  private stopVolumeMonitor() {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    this.callbacks.onVolume?.(0);
  }

  stopListening() {
    this.stopVolumeMonitor();
    void this.micVAD?.pause();

    if (this.state === "listening") {
      this.setState("idle");
    }
  }

  private destroyVAD() {
    if (this.micVAD) {
      void this.micVAD.destroy();  // async — fire-and-forget on disconnect/cleanup
      this.micVAD = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  stopAudio() {
    this.audioStreamComplete = false;
    this.pendingSourceCount = 0;
    this.nextPlayTime = 0;
    if (this.playbackCtx) {
      this.playbackCtx.close();
      this.playbackCtx = null;
    }
    if (this.state === "speaking") {
      this.setState("idle");
    }
  }

  private cleanup() {
    this.stopListening();
    this.stopAudio();
    this.destroyVAD();
  }
}

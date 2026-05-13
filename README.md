# Tally — Conversational Habit Tracker

Next.js 15 frontend for [Tally](https://github.com/juma-paul/tally) — a conversational habit tracker you talk to.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Stack

| What | How |
|------|-----|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS — White + Indigo palette |
| Auth | AuthKit (self-hosted JWT, httpOnly cookies) |
| Voice | Silero VAD (browser) · Web Audio API · WebSocket PCM stream |
| Fonts | Geist (sans + mono) |

## Design

White background, zinc-900 text, indigo-500 (`#6366f1`) as the single accent color.
The "ll" in every Tally logo is indigo. Everything else is neutral.

- Input focus → indigo ring
- Send button → indigo when active
- Active sidebar item → indigo-50 background
- Voice waveform → indigo-500 (listening), indigo-300 (speaking), indigo-200 (processing)

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page — marketing, hero, demo conversation |
| `/login` | Sign in |
| `/signup` | Create account |
| `/chat` | Main conversation interface |

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in: AUTHKIT_URL, TALLY_URL, NEXT_PUBLIC_WS_URL

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AUTHKIT_URL` | AuthKit backend URL |
| `TALLY_URL` | Tally backend URL (for SSR proxy) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for voice pipeline |

## Voice Pipeline

Tally's voice mode runs entirely in the browser until audio needs to leave:

1. **Silero VAD** — tiny neural network detects when you stop speaking (no button press needed)
2. **AudioWorklet** — captures PCM at 16kHz, sends over WebSocket
3. **WebSocket** — backend receives audio → Groq Whisper → agent → ElevenLabs TTS → PCM back
4. **Web Audio API** — schedules returned PCM chunks gap-free (no MP3 encoder delay)

## Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Space` (hold) | Record voice |
| `Esc` | Cancel recording |

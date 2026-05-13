"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

function TallyLogo({ className }: { className?: string }) {
  return (
    <span className={className} style={{ letterSpacing: "0.04em" }}>
      Ta<span className="text-[#6366f1]">ll</span>y
    </span>
  );
}

const features = [
  {
    title: "Natural language input",
    body: "Log progress in plain English. 'I walked 8000 steps today' or 'create a running habit for 5km daily' — Tally parses intent and executes the right action.",
  },
  {
    title: "Voice-first responses",
    body: "Query your progress and receive spoken responses in real time. Tally streams audio as it replies — no charts, no dashboards, just answers.",
  },
  {
    title: "Stateful conversation",
    body: "Context is maintained across turns. Confirmations, follow-ups, and corrections all resolve naturally — 'remove the one from yesterday' is understood.",
  },
];

const demo = [
  { role: "user", text: "I finished my run — 6km." },
  { role: "tally", text: "Logged. That's your third run this week." },
  { role: "user", text: "How's my water habit looking?" },
  { role: "tally", text: "5 of 7 days this week. One more to hit your weekly target." },
];

const year = new Date().getFullYear();

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">

      {/* Nav — always shows Sign in + Get started regardless of auth state */}
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-8 py-5">
        <TallyLogo className="text-2xl font-bold text-zinc-900" />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-14 text-center">
        <TallyLogo className="text-8xl font-bold text-zinc-900 leading-none" />
        <p className="mt-7 text-[1.75rem] font-semibold text-zinc-800 leading-snug tracking-tight">
          Habit tracking through natural conversation.
        </p>
        <p className="mt-4 text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Log progress, query your stats, and receive spoken responses — entirely
          through voice or text. No forms, no manual input.
        </p>
        <div className="mt-9 flex items-center justify-center gap-4">
          {user ? (
            <>
              <Link
                href="/chat"
                className="bg-indigo-500 text-white px-7 py-3 rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
              >
                Open Tally
              </Link>
              <Link
                href="/chat"
                className="text-sm text-zinc-400 hover:text-zinc-700 px-4 py-3 transition-colors"
              >
                Go to app →
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="bg-indigo-500 text-white px-7 py-3 rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="text-sm text-zinc-400 hover:text-zinc-700 px-4 py-3 transition-colors"
              >
                Log in →
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Conversation demo */}
      <section className="max-w-md mx-auto px-8 pb-24">
        <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-zinc-200" />
              <div className="w-2 h-2 rounded-full bg-zinc-200" />
              <div className="w-2 h-2 rounded-full bg-zinc-200" />
            </div>
            <span className="text-[11px] text-zinc-400 font-mono ml-1 tracking-wide">
              ta<span className="text-indigo-400">ll</span>y
            </span>
          </div>
          <div className="p-5 space-y-3 bg-white">
            {demo.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "tally" && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "rgba(99,102,241,0.1)" }}
                  >
                    <span className="text-[8px] text-indigo-500 font-bold">T</span>
                  </div>
                )}
                <p
                  className={`text-sm px-3.5 py-2 rounded-2xl max-w-[260px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-zinc-100 text-zinc-800 rounded-br-sm"
                      : "bg-white text-zinc-600 rounded-bl-sm border border-zinc-100"
                  }`}
                >
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {features.map((f, i) => (
            <div key={i}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(99,102,241,0.08)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-2 tracking-wide uppercase" style={{ letterSpacing: "0.06em" }}>
                {f.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <TallyLogo className="text-sm font-semibold text-zinc-400" />
          <p className="text-xs text-zinc-300">
            © {year} Tally — Conversational Habit Tracker.
          </p>
        </div>
      </footer>

    </div>
  );
}

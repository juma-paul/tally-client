"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, tallyApi } from "@/lib/axios";
import { useAuth } from "@/providers/AuthProvider";
import { extractErrorMessage } from "@/lib/errors";

function TallyLogo() {
  return (
    <Link href="/" className="text-2xl font-bold text-zinc-900 tracking-[0.04em] hover:opacity-80 transition-opacity">
      Ta<span className="text-indigo-500">ll</span>y
    </Link>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetchUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const justVerified = searchParams.get("verified") === "true";

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      await authApi.post("/auth/login", { email, password });

      const pendingName = localStorage.getItem("pending_name");
      if (pendingName) {
        try {
          await tallyApi.patch("/users/me", { name: pendingName });
        } catch {
          // Non-critical
        }
        localStorage.removeItem("pending_name");
      }

      await refetchUser();
      router.push("/chat");
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, "Login failed");
      if (msg.toLowerCase().includes("verify your email")) {
        setError(msg + " — check your inbox or ");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <TallyLogo />
        </div>

        <h1 className="text-center text-xl font-semibold tracking-tight text-zinc-900">
          Welcome back
        </h1>
        <p className="mt-1.5 text-center text-sm text-zinc-400">
          Sign in to continue
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="mt-7 space-y-3.5"
        >
          {justVerified && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-center text-sm text-indigo-600">
              Email verified — you can now sign in.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
              {error.endsWith("— check your inbox or ") && (
                <Link
                  href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                  className="underline"
                >
                  resend verification
                </Link>
              )}
            </p>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white" />}>
      <LoginContent />
    </Suspense>
  );
}

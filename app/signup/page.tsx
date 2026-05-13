"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/axios";
import { extractErrorMessage } from "@/lib/errors";

function TallyLogo() {
  return (
    <Link href="/" className="text-2xl font-bold text-zinc-900 tracking-[0.04em] hover:opacity-80 transition-opacity">
      Ta<span className="text-indigo-500">ll</span>y
    </Link>
  );
}

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authApi.post("/auth/register", { email, password, confirmPassword, termsAccepted: true });

      if (name.trim()) {
        sessionStorage.setItem("pending_name", name.trim());
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <TallyLogo />
        </div>

        <h1 className="text-center text-xl font-semibold tracking-tight text-zinc-900">
          Create your account
        </h1>
        <p className="mt-1.5 text-center text-sm text-zinc-400">
          Start tracking your habits with AI
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="mt-7 space-y-3.5"
        >
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Name"
            required
            className={inputClass}
          />

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email"
            required
            className={inputClass}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            required
            minLength={6}
            className={inputClass}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            minLength={6}
            className={inputClass}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

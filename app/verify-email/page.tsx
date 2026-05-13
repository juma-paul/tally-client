"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/axios";
import { extractErrorMessage } from "@/lib/errors";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"pending" | "verifying" | "success" | "error">(
    token ? "verifying" : "pending"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Auto-verify when token is present in URL
  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        await authApi.post("/auth/verify-email", { token });
        setStatus("success");
        // Redirect to login after a short delay
        setTimeout(() => router.replace("/login?verified=true"), 2000);
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(extractErrorMessage(err, "Verification failed. The link may have expired."));
      }
    }

    verify();
  }, [token, router]);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    setResent(false);

    try {
      await authApi.post("/auth/resend-verification", { email });
      setResent(true);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err, "Failed to resend email"));
    } finally {
      setResending(false);
    }
  }

  // ── Verifying state ──────────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-5 w-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h1 className="text-xl font-medium">Verifying your email...</h1>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-medium">Email verified!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting you to sign in...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-medium">Verification failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <div className="mt-6 space-y-3">
            {email && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            )}
            <Link
              href="/login"
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending state (no token — just registered) ───────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-center text-2xl font-medium tracking-tight">Check your email</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          We sent a verification link to{" "}
          {email ? <strong className="text-foreground">{email}</strong> : "your email address"}.
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Click the link to verify your account, then sign in.
        </p>

        <div className="mt-8 space-y-3">
          {resent && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-center text-sm text-green-600">
              Verification email sent again.
            </p>
          )}

          {errorMessage && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          {email && (
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full rounded-lg border border-border py-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend email"}
            </button>
          )}

          <Link
            href="/login"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Already verified? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

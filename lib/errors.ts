/**
 * Extracts a human-readable error message from any thrown value.
 *
 * Handles three backend response shapes:
 *   AuthKit  → { error: { message: "..." } }
 *   FastAPI  → { detail: "..." }
 *   Generic  → { message: "..." }
 *
 * Falls back to the axios generic message, then to `fallback`.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;

  const e = err as {
    response?: {
      data?: {
        error?: { message?: string };
        detail?: string | { msg: string }[];
        message?: string;
      };
    };
    message?: string;
  };

  const data = e.response?.data;

  // AuthKit: { success: false, error: { code, message } }
  if (data?.error?.message) return data.error.message;

  // FastAPI validation: { detail: [{ msg, loc, ... }] }
  if (Array.isArray(data?.detail)) {
    const first = (data.detail as { msg: string }[])[0];
    if (first?.msg) return first.msg;
  }

  // FastAPI string detail: { detail: "Not found" }
  if (typeof data?.detail === "string") return data.detail;

  // Generic: { message: "..." }
  if (data?.message) return data.message;

  // Axios message (e.g. "Network Error") — but skip the useless status string
  if (e.message && !e.message.startsWith("Request failed with status code")) {
    return e.message;
  }

  return fallback;
}

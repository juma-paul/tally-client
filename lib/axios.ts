/**
 * Axios instances for Tally.
 *
 * authApi   → /auth-api/* → AuthKit (register, login, logout, refresh)
 * tallyApi → /api/*     → Tally backend (all other endpoints)
 *
 * Both use withCredentials: true so the browser sends httpOnly cookies
 * automatically. No token storage in JS — the browser manages cookies.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ─── AuthKit client ──────────────────────────────────────────────────────────
export const authApi = axios.create({
  baseURL: "/auth-api",
  withCredentials: true,
  headers: {
    "X-API-Key": process.env.NEXT_PUBLIC_AUTHKIT_API_KEY ?? "",
  },
});

// ─── Tally backend client ───────────────────────────────────────────────────
export const tallyApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ─── Refresh client (no interceptors — prevents infinite retry loops) ─────────
const refreshClient = axios.create({
  baseURL: "/auth-api",
  withCredentials: true,
  headers: {
    "X-API-Key": process.env.NEXT_PUBLIC_AUTHKIT_API_KEY ?? "",
  },
});

// ─── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false;

type QueueItem = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
}

// ─── 401 interceptor on tallyApi ────────────────────────────────────────────
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

tallyApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (!original) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      // Queue concurrent requests while refresh is in progress
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(tallyApi(original)),
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Refresh token — AuthKit sets new accessToken cookie
        await refreshClient.post("/auth/refresh");
        processQueue(null);
        return tallyApi(original);
      } catch (refreshError) {
        processQueue(refreshError);
        // Both tokens expired — redirect to login only from protected pages
        if (typeof window !== "undefined") {
          const p = window.location.pathname;
          const isPublic =
            p === "/" ||
            p.startsWith("/login") ||
            p.startsWith("/signup") ||
            p.startsWith("/verify-email");
          if (!isPublic) {
            window.location.replace("/login?reason=session_expired");
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

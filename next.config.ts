import type { NextConfig } from "next";

const AUTHKIT_URL =
  process.env.AUTHKIT_URL ?? "http://127.0.0.1:3002";

const TALLY_URL =
  process.env.TALLY_URL ?? "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // AuthKit — register, login, logout, refresh, profile
      {
        source: "/auth-api/:path*",
        destination: `${AUTHKIT_URL}/api/v1/:path*`,
      },
      // Habit Tracker backend — chat, habits, conversations, settings
      {
        source: "/api/:path*",
        destination: `${TALLY_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

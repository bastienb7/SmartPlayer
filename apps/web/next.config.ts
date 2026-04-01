import type { NextConfig } from "next";

// Server-side env var (not exposed to browser) used for Next.js rewrites
// Local dev: http://localhost:3014 (or whatever port the API runs on)
// VPS: handled by nginx directly, so rewrites are a no-op there
const API_URL = process.env.API_URL || "http://localhost:3014";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@smartplayer/shared"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/analytics/:path*", destination: `${API_URL}/analytics/:path*` },
      { source: "/embed/:path*", destination: `${API_URL}/embed/:path*` },
      { source: "/player/:path*", destination: `${API_URL}/player/:path*` },
    ];
  },
};

export default nextConfig;

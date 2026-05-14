import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable PWA features via next-pwa (to be added in a later task)
  // Progressive Web App configuration will be wired here

  // Allow cross-origin requests to the backend during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

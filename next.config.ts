import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Temporary: serves the Flutter mobile app's static web build for local
  // testing. Removed again once verification is done.
  async rewrites() {
    return [
      { source: "/mobile-app", destination: "/mobile-app/index.html" },
      { source: "/mobile-app/", destination: "/mobile-app/index.html" },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Traces only the files each route actually needs into .next/standalone —
  // the Docker image copies that instead of the full node_modules tree.
  output: "standalone",
};

export default nextConfig;

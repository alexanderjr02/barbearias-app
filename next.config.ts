import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  // Traces only the files each route actually needs into .next/standalone —
  // the Docker image copies that instead of the full node_modules tree.
  //
  // Só no build do Docker: a Vercel monta o deploy do seu jeito e o modo
  // standalone atrapalha lá. DOCKER_BUILD=1 fica no Dockerfile.
  ...(process.env.DOCKER_BUILD === "1" && { output: "standalone" as const }),
};

export default nextConfig;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/health — used by Docker's healthcheck and any future orchestrator
// (Kubernetes, load balancer, uptime monitor). Confirms the process is up
// AND the database is actually reachable, not just that Next.js booted.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}

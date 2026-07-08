import { randomBytes, createHash } from "crypto";
import { REFRESH_TOKEN_TTL } from "./auth";

// Uses Node's crypto module — only import this from Route Handlers
// (Node.js runtime), never from Middleware (Edge runtime).
export function generateRefreshToken() {
  const token = randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);
  return { token, tokenHash, expiresAt };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

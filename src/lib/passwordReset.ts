import { randomBytes } from "crypto";
import { hashToken } from "./refreshToken";

// 1 hour — long enough to check email and click, short enough to limit the
// window if the link is ever intercepted.
export const PASSWORD_RESET_TTL = 60 * 60; // seconds

// Only the hash is ever stored; the raw token lives solely in the emailed
// link. Node crypto → import only from Route Handlers (Node.js runtime).
export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL * 1000);
  return { token, tokenHash, expiresAt };
}

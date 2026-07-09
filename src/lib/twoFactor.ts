import { generateSecret as otpGenerateSecret, generateURI, verify as otpVerify } from "otplib";

// Opt-in TOTP 2FA for SUPER_ADMIN logins. No QR-rendering library is used —
// the otpauth:// URI and raw secret are shown as text for manual entry into
// any authenticator app (Google Authenticator, Authy, 1Password, etc).
export function generateSecret() {
  return otpGenerateSecret();
}

export function buildOtpAuthUri(email: string, secret: string) {
  return generateURI({ issuer: "CORTIX Admin", label: email, secret });
}

export async function verifyCode(secret: string, code: string): Promise<boolean> {
  try {
    const result = await otpVerify({ secret, token: code });
    return result.valid;
  } catch {
    return false;
  }
}

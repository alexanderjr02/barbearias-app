import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema, firstFieldError } from "@/lib/validation";
import { generatePasswordResetToken } from "@/lib/passwordReset";
import { sendMail, passwordResetEmail } from "@/lib/mailer";

// POST /api/auth/forgot-password — kicks off the reset flow.
//
// Always responds 200 with the same body whether or not the e-mail exists:
// revealing "this e-mail has no account" would let anyone enumerate who's
// registered. Real work (token + email) happens only for a valid, password
// account; Google-only accounts have no password to reset.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.password) {
      // Invalidate any earlier unused links for this user, then mint a fresh one.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      const { token, tokenHash, expiresAt } = generatePasswordResetToken();
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

      const baseUrl = process.env.APP_URL || request.nextUrl.origin;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const { subject, html, text } = passwordResetEmail(user.name, resetUrl);
      await sendMail({ to: user.email, subject, html, text });
    }
  } catch (error) {
    console.error("[forgot-password]", error);
    // Still return the generic success below — we don't want to leak whether
    // the failure was "no account" or "email provider down".
  }

  return NextResponse.json({
    success: true,
    message: "Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.",
  });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetPasswordSchema, firstFieldError } from "@/lib/validation";
import { hashToken } from "@/lib/refreshToken";

// POST /api/auth/reset-password — consumes the emailed token and sets a new
// password. The token is single-use (usedAt) and short-lived (expiresAt); we
// look it up by hash, never by the raw value.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { token, password } = parsed.data;

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Link inválido ou expirado. Solicite uma nova redefinição." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // One transaction: set the new password, burn the token, and revoke every
    // active session so a stolen refresh token can't outlive the reset.
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ error: "Erro ao redefinir a senha" }, { status: 500 });
  }
}

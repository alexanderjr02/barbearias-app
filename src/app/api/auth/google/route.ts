import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { isRole } from "@/lib/roles";
import { completeLogin } from "@/lib/completeLogin";
import { getClientIp } from "@/lib/requestIp";
import { googleAuthSchema, firstFieldError } from "@/lib/validation";

// Verifies a Google Identity Services ID token (sent by the web button or
// the mobile app's google_sign_in package) and either logs in an existing
// account or creates a brand-new CLIENT one. Deliberately *not* used for
// OWNER signup — creating a barbershop needs a form Google can't fill in
// for us, so a new owner still goes through /api/auth/register.
export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Login com Google não está configurado neste ambiente" },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = googleAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }

  try {
    const oauthClient = new OAuth2Client(clientId);
    const ticket = await oauthClient.verifyIdToken({ idToken: parsed.data.idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json({ error: "Não foi possível confirmar sua conta Google" }, { status: 401 });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name ?? email.split("@")[0];
    const avatar = payload.picture ?? null;

    let user = await prisma.user.findUnique({
      where: { googleId },
      include: { barbershop: true, staffProfile: { include: { barbershop: true } } },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
        include: { barbershop: true, staffProfile: { include: { barbershop: true } } },
      });

      if (existingByEmail) {
        // Same person, first time using the Google button — link it.
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId, avatar: existingByEmail.avatar ?? avatar },
          include: { barbershop: true, staffProfile: { include: { barbershop: true } } },
        });
      } else {
        // Brand new account. Google can't hand us a barbershop, so this is
        // always a CLIENT — owners still sign up through the full form.
        user = await prisma.user.create({
          data: { name, email, googleId, avatar, role: "CLIENT" },
          include: { barbershop: true, staffProfile: { include: { barbershop: true } } },
        });
      }
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Esta conta foi desativada" }, { status: 403 });
    }

    const resolvedBarbershop = user.barbershop ?? user.staffProfile?.barbershop ?? null;
    if (resolvedBarbershop && !resolvedBarbershop.isActive) {
      return NextResponse.json({ error: "Esta barbearia está suspensa" }, { status: 403 });
    }

    const role = isRole(user.role) ? user.role : "CLIENT";
    const barbershopId = resolvedBarbershop?.id ?? null;

    return await completeLogin({ sub: user.id, role, name: user.name, email: user.email, barbershopId }, getClientIp(request));
  } catch (error) {
    console.error("[auth/google]", error);
    return NextResponse.json({ error: "Não foi possível entrar com o Google" }, { status: 401 });
  }
}

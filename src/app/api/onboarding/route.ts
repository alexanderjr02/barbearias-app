import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { getOnboardingStatus } from "@/lib/onboarding";

// GET /api/onboarding — the "primeiros passos" checklist for this barbershop.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const status = await getOnboardingStatus(session.barbershopId);
  return NextResponse.json(status);
}

// PATCH /api/onboarding — the gestor can hide the checklist manually before
// all steps are done.
export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.dismissed !== true) {
    return NextResponse.json({ error: "Ação não permitida" }, { status: 400 });
  }

  await prisma.barbershop.update({ where: { id: session.barbershopId }, data: { onboardingDismissed: true } });
  return NextResponse.json({ ok: true });
}

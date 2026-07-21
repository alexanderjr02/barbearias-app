import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { runWeekFillCampaign } from "@/lib/copilot/autopilot";

// POST /api/marketing/fill-week — dispara a campanha "encher a semana" na hora
// (o botão "Enviar" do modo Sugerir). manual: true pula a trava de nível e a de
// frequência de 6 dias (é decisão consciente do gestor), mas MANTÉM
// consentimento, público ativo e o corte de 7 dias por cliente.
export async function POST() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const shop = await prisma.barbershop.findUnique({
    where: { id: session.barbershopId },
    select: { name: true, plan: true, autopilotLevel: true },
  });

  const res = await runWeekFillCampaign(session.barbershopId, shop?.name ?? "sua barbearia", shop?.plan, shop?.autopilotLevel, { manual: true });

  if (res.sent > 0) {
    return NextResponse.json({ ok: true, sent: res.sent, message: `Convite enviado para ${res.sent} cliente(s).` });
  }
  const why: Record<string, string> = {
    plan: "O Copiloto de marketing faz parte do plano Pro.",
    "no-slots": "Sua semana já está cheia — não há horário vago pra oferecer.",
    "no-audience": "Ninguém elegível agora (só quem aceitou receber e não foi avisado nos últimos 7 dias).",
  };
  return NextResponse.json({ ok: false, sent: 0, message: why[res.reason ?? ""] ?? "Nada enviado agora." });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { loyaltyConfig } from "@/lib/loyalty/engine";

// GET/PATCH /api/loyalty/config — o gestor desenha o próprio programa:
// pontos por real, faixas, cartão de selos e indicação. Nada é regra fixa.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json(await loyaltyConfig(session.barbershopId));
}

export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);

  for (const [key, val] of [
    ["loyaltyEnabled", bool(body.loyaltyEnabled)], ["pointsPerReal", num(body.pointsPerReal)],
    ["silverThreshold", num(body.silverThreshold)], ["goldThreshold", num(body.goldThreshold)],
    ["silverDiscount", num(body.silverDiscount)], ["goldDiscount", num(body.goldDiscount)],
    ["stampEnabled", bool(body.stampEnabled)], ["stampGoal", num(body.stampGoal)],
    ["stampRewardLabel", text(body.stampRewardLabel)],
    ["referralEnabled", bool(body.referralEnabled)],
    ["referralReferrerReward", text(body.referralReferrerReward)],
    ["referralFriendReward", text(body.referralFriendReward)],
  ] as const) {
    if (val !== undefined) data[key] = val;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });

  // Ouro abaixo de Prata deixaria o cliente "subir" para uma faixa menor.
  const silver = (data.silverThreshold as number | undefined) ?? undefined;
  const gold = (data.goldThreshold as number | undefined) ?? undefined;
  if (silver !== undefined && gold !== undefined && gold <= silver) {
    return NextResponse.json({ error: "A faixa Ouro precisa ser maior que a Prata." }, { status: 400 });
  }
  // Cartela de 0 selos daria prêmio infinito a cada atendimento.
  if (data.stampGoal !== undefined && (data.stampGoal as number) < 1) {
    return NextResponse.json({ error: "O cartão precisa de pelo menos 1 selo." }, { status: 400 });
  }

  await prisma.barbershop.update({ where: { id: session.barbershopId }, data });
  return NextResponse.json(await loyaltyConfig(session.barbershopId));
}

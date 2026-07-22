import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { PLANS, type PlatformPlan } from "@/lib/billing";

// GET/POST /api/admin/coupons — os códigos que dão acesso sem passar pela
// tela de pagamento.
//
// "Vitalício" aqui é só `durationDays: null`. Modelar como DURAÇÃO e não como
// um sim/não de vitalício é o que permite dar 30 dias de teste, 12 meses de
// cortesia e acesso permanente com a mesma peça — e é o que impede o
// vitalício de virar a única opção por falta de alternativa. Cortesia sem
// prazo nem controle é dinheiro saindo sem ninguém ver: seis meses depois não
// se sabe quantos foram dados nem para quem.

/** Sem 0/O/1/I/L: o código vai ser ditado e digitado por gente. */
function gerarCodigo(): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alfabeto[bytes[i] % alfabeto.length];
    if (i === 3) out += "-";
  }
  return out;
}

export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      redemptions: {
        select: { createdAt: true, barbershop: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({ coupons });
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

  const plan: PlatformPlan = PLANS.includes(body.plan) ? body.plan : "ENTERPRISE";

  // null = vitalício. Aceita só número positivo; qualquer outra coisa vira
  // vitalício explícito, nunca por acidente de tipo.
  const durationDays =
    body.durationDays === null || body.durationDays === undefined
      ? null
      : Number.isInteger(body.durationDays) && body.durationDays > 0
        ? body.durationDays
        : null;

  const maxUses =
    body.maxUses === null || body.maxUses === undefined
      ? null
      : Number.isInteger(body.maxUses) && body.maxUses > 0
        ? body.maxUses
        : null;

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === "string" && body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Validade inválida" }, { status: 400 });
    expiresAt = d;
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;

  // Colisão de código é praticamente impossível, mas "praticamente" não é
  // "nunca" e o campo é único — tentar de novo custa menos que um erro 500.
  let coupon = null;
  for (let tentativa = 0; tentativa < 5 && !coupon; tentativa++) {
    const code = gerarCodigo();
    const existe = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (existe) continue;
    coupon = await prisma.coupon.create({
      data: { code, plan, durationDays, maxUses, expiresAt, note, createdById: session.sub },
    });
  }
  if (!coupon) return NextResponse.json({ error: "Não consegui gerar um código único. Tente de novo." }, { status: 500 });

  await logAdminAction({
    actorId: session.sub,
    action: "coupon.created",
    targetType: "Coupon",
    targetId: coupon.id,
    metadata: { code: coupon.code, plan, durationDays, maxUses, note },
  });

  return NextResponse.json({ ok: true, coupon }, { status: 201 });
}

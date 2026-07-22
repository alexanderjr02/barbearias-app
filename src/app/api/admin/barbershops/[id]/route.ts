import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { recordPlanChangeInvoice, PLANS, type PlatformPlan } from "@/lib/billing";
import { getBarbershopHealth } from "@/lib/health";
import { notify } from "@/lib/notifications";
import { cnpjSchema, slugSchema, optionalStateSchema } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true, createdAt: true, lastLoginAt: true, isActive: true } },
      _count: { select: { staff: true, services: true, appointments: true, clients: true } },
      platformInvoices: { orderBy: { createdAt: "desc" }, take: 20 },
      whiteLabelRequest: true,
    },
  });

  if (!barbershop) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const [revenue, health] = await Promise.all([
    prisma.appointment.aggregate({ where: { barbershopId: id, status: "COMPLETED" }, _sum: { totalPrice: true } }),
    getBarbershopHealth(id),
  ]);

  return NextResponse.json({ ...barbershop, lifetimeRevenue: revenue._sum.totalPrice ?? 0, health });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const existing = await prisma.barbershop.findUnique({ where: { id }, select: { plan: true, isActive: true } });
  if (!existing) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.plan === "string" && PLANS.includes(body.plan as PlatformPlan)) {
    data.plan = body.plan;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  // Edição do cadastro. Antes só dava para trocar plano e ativar/suspender —
  // um nome errado ou um CNPJ trocado exigiam ir no banco. Cada campo é
  // validado com o MESMO schema do cadastro público: regra de dado que muda
  // conforme a porta de entrada não é regra, é sugestão.
  const textos: [string, string, number][] = [
    ["name", "name", 120],
    ["city", "city", 80],
    ["address", "address", 160],
    ["phone", "phone", 20],
    ["whatsapp", "whatsapp", 20],
  ];
  for (const [campo, destino, max] of textos) {
    if (typeof body[campo] === "string") {
      const v = body[campo].trim();
      if (v.length > max) return NextResponse.json({ error: `Campo ${campo} muito longo` }, { status: 400 });
      data[destino] = v || null;
    }
  }
  if (typeof body.state === "string") {
    const parsed = optionalStateSchema.safeParse(body.state);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "UF inválida" }, { status: 400 });
    data.state = parsed.data || null;
  }
  if (typeof body.cnpj === "string" && body.cnpj.trim()) {
    const parsed = cnpjSchema.safeParse(body.cnpj);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "CNPJ inválido" }, { status: 400 });
    const dono = await prisma.barbershop.findFirst({ where: { cnpj: parsed.data, id: { not: id } }, select: { id: true } });
    if (dono) return NextResponse.json({ error: "Outra barbearia já usa esse CNPJ" }, { status: 409 });
    data.cnpj = parsed.data;
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    const parsed = slugSchema.safeParse(body.slug);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Link inválido" }, { status: 400 });
    const usado = await prisma.barbershop.findFirst({ where: { slug: parsed.data, id: { not: id } }, select: { id: true } });
    if (usado) return NextResponse.json({ error: "Esse link já está em uso" }, { status: 409 });
    data.slug = parsed.data;
  }

  // Cortesia e validade do plano — o que o cupom concede, editável à mão.
  if (typeof body.isComplimentary === "boolean") data.isComplimentary = body.isComplimentary;
  if (typeof body.compReason === "string") data.compReason = body.compReason.trim() || null;
  if (body.planExpiresAt === null) data.planExpiresAt = null;
  else if (typeof body.planExpiresAt === "string" && body.planExpiresAt) {
    const d = new Date(body.planExpiresAt);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Data de validade inválida" }, { status: 400 });
    data.planExpiresAt = d;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const barbershop = await prisma.barbershop.update({ where: { id }, data });

  if (data.plan && data.plan !== existing.plan) {
    await recordPlanChangeInvoice(id, data.plan as PlatformPlan, existing.plan);
    await logAdminAction({
      actorId: session.sub,
      action: "barbershop.plan_changed",
      targetType: "Barbershop",
      targetId: id,
      metadata: { from: existing.plan, to: data.plan },
    });
  }
  if (typeof data.isActive === "boolean" && data.isActive !== existing.isActive) {
    await logAdminAction({
      actorId: session.sub,
      action: data.isActive ? "barbershop.reactivated" : "barbershop.suspended",
      targetType: "Barbershop",
      targetId: id,
    });
    if (!data.isActive) {
      await notify("BARBERSHOP_SUSPENDED", `Barbearia suspensa: ${barbershop.name}`, `A barbearia "${barbershop.name}" foi suspensa.`, { barbershopId: id });
    }
  }

  return NextResponse.json(barbershop);
}

// DELETE /api/admin/barbershops/[id] — apaga a barbearia e tudo que pende
// dela (agendamentos, clientes, financeiro) via cascade do banco.
//
// Irreversível e sem lixeira, então tem duas travas:
//  1. exige ?confirm=<slug> na URL. Digitar o link da barbearia é o mesmo
//     padrão do GitHub para apagar repositório — obriga a ler o que se está
//     apagando em vez de confirmar no automático;
//  2. recusa barbearia ATIVA. Para apagar, suspenda antes. Assim nenhuma
//     operação em funcionamento some com um clique errado.
//
// O DONO não é apagado junto: ele é um User, pode ter outras barbearias, e
// apagar pessoa por tabela errada é como se perde histórico.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();
  const { id } = await params;

  const shop = await prisma.barbershop.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, isActive: true, _count: { select: { appointments: true } } },
  });
  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  if (shop.isActive) {
    return NextResponse.json({ error: "Suspenda a barbearia antes de apagar — é a trava que impede apagar operação em funcionamento." }, { status: 409 });
  }
  if (request.nextUrl.searchParams.get("confirm") !== shop.slug) {
    return NextResponse.json({ error: `Confirme digitando o link da barbearia: ${shop.slug}` }, { status: 400 });
  }

  // Registra ANTES de apagar: depois do delete não há mais o que descrever.
  await logAdminAction({
    actorId: session.sub,
    action: "barbershop.deleted",
    targetType: "Barbershop",
    targetId: id,
    metadata: { name: shop.name, slug: shop.slug, agendamentos: shop._count.appointments },
  });

  try {
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Os agendamentos saem PRIMEIRO, e isso não é detalhe: Appointment
      // aponta para Staff e Service SEM cascade (Restrict, o padrão do
      // Prisma). Ao apagar a barbearia, o banco tenta remover barbeiros,
      // serviços e agendamentos de uma vez — se o barbeiro sair antes do
      // agendamento que o referencia, o Restrict barra tudo e a exclusão
      // falha inteira.
      //
      // Foi exatamente por isso que uma barbearia recém-criada apagava e uma
      // com histórico não: a primeira não tinha agendamento nenhum para
      // disparar o bloqueio. Review e Tip penduram no Appointment com
      // cascade, então somem junto.
      await tx.appointment.deleteMany({ where: { barbershopId: id } });
      await tx.barbershop.delete({ where: { id } });
    });
  } catch (error) {
    // Sem este bloco a rota estourava um 500 sem corpo, e a tela mostrava só
    // "Erro na requisição" — que não diz nada a quem está tentando resolver.
    console.error("[barbershop.delete]", error);
    return NextResponse.json(
      { error: "Não consegui apagar: algum registro ainda depende desta barbearia. O erro foi registrado no log do servidor." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: `"${shop.name}" foi apagada.` });
}

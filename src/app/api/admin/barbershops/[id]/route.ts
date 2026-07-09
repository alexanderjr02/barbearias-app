import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { recordPlanChangeInvoice, PLANS, type PlatformPlan } from "@/lib/billing";
import { getBarbershopHealth } from "@/lib/health";
import { notify } from "@/lib/notifications";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
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
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
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

  const data: { plan?: string; isActive?: boolean } = {};
  if (typeof body.plan === "string" && PLANS.includes(body.plan as PlatformPlan)) {
    data.plan = body.plan;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
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

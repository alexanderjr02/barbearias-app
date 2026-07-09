import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { recordPlanChangeInvoice, PLANS, type PlatformPlan } from "@/lib/billing";

// GET /api/barbershop?slug=xxx (public) or GET /api/barbershop (own shop, session-based)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (!slug) {
      const session = await requireBarbershopSession();
      if (!session) {
        return NextResponse.json({ error: "slug is required" }, { status: 400 });
      }
      const barbershop = await prisma.barbershop.findUnique({
        where: { id: session.barbershopId },
        include: { workingHours: true },
      });
      return NextResponse.json(barbershop);
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { slug },
      include: {
        staff: { where: { isActive: true } },
        services: { where: { isActive: true } },
        workingHours: true,
      },
    });

    if (!barbershop || !barbershop.isActive) {
      return NextResponse.json({ error: "Barbershop not found" }, { status: 404 });
    }

    return NextResponse.json(barbershop);
  } catch {
    return NextResponse.json({ error: "Error fetching barbershop" }, { status: 500 });
  }
}

const PROFILE_FIELDS = [
  "name",
  "description",
  "logo",
  "coverImage",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zipCode",
  "primaryColor",
  "secondaryColor",
  "instagram",
  "whatsapp",
] as const;

// PATCH /api/barbershop — updates the caller's own barbershop profile/branding/hours,
// and (demo/self-service) plan changes triggered from the Upgrade modal.
export async function PATCH(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const data: Record<string, string | number> = {};
  for (const field of PROFILE_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  if (typeof body.plan === "string" && PLANS.includes(body.plan as PlatformPlan)) {
    data.plan = body.plan;
  }
  if (typeof body.pointsPerReal === "number" && body.pointsPerReal >= 0) {
    data.pointsPerReal = body.pointsPerReal;
  }

  const previous = await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { plan: true } });

  const barbershop = await prisma.barbershop.update({
    where: { id: session.barbershopId },
    data,
  });

  if (typeof data.plan === "string" && previous) {
    await recordPlanChangeInvoice(session.barbershopId, data.plan as PlatformPlan, previous.plan);
  }

  if (Array.isArray(body.workingHours)) {
    await Promise.all(
      body.workingHours.map((h: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }) =>
        prisma.workingHour.upsert({
          where: { barbershopId_dayOfWeek: { barbershopId: session.barbershopId, dayOfWeek: h.dayOfWeek } },
          create: {
            barbershopId: session.barbershopId,
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            openTime: h.openTime,
            closeTime: h.closeTime,
          },
          update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        })
      )
    );
  }

  return NextResponse.json(barbershop);
}

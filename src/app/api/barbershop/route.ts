import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { recordPlanChangeInvoice, PLANS, type PlatformPlan } from "@/lib/billing";
import { isPaymentProvider } from "@/lib/payments";
import { isFiscalProvider } from "@/lib/fiscal";

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
      if (!barbershop) return NextResponse.json(null);
      // Never expose the raw payment credential — just whether it's connected.
      const { paymentApiKey, fiscalApiKey, ...safe } = barbershop;
      return NextResponse.json({ ...safe, paymentConnected: Boolean(paymentApiKey), fiscalConnected: Boolean(fiscalApiKey) });
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

    const { paymentApiKey: _key, fiscalApiKey: _fkey, ...safe } = barbershop;
    void _key;
    void _fkey;
    return NextResponse.json(safe);
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
  "themePreset",
  "themeMode",
  "appTagline",
  "bgType",
  "bgVideo",
  "bgEffect",
  "instagram",
  "whatsapp",
  "pixKey",
  "faqText",
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

  const data: Record<string, string | number | boolean | null> = {};
  for (const field of PROFILE_FIELDS) {
    if (typeof body[field] === "string") data[field] = body[field];
  }
  // Connecting/disconnecting a payment provider is money-sensitive — owner only.
  if (session.role === "OWNER" && typeof body.paymentApiKey === "string") {
    const key = body.paymentApiKey.trim();
    data.paymentApiKey = key || null;
    data.paymentProvider = key && isPaymentProvider(body.paymentProvider) ? body.paymentProvider : null;
  }
  // Fiscal (NFS-e) config — owner only (fiscal identity + credential).
  if (session.role === "OWNER") {
    if (typeof body.fiscalApiKey === "string") {
      const fkey = body.fiscalApiKey.trim();
      data.fiscalApiKey = fkey || null;
      data.fiscalProvider = fkey && isFiscalProvider(body.fiscalProvider) ? body.fiscalProvider : null;
    }
    if (typeof body.cnpj === "string") data.cnpj = body.cnpj.trim() || null;
    if (typeof body.municipalServiceCode === "string") data.municipalServiceCode = body.municipalServiceCode.trim() || null;
    if (typeof body.taxRegime === "string") data.taxRegime = body.taxRegime.trim() || null;
    if (typeof body.issRate === "number" && body.issRate >= 0) data.issRate = body.issRate;
  }
  if (typeof body.plan === "string" && PLANS.includes(body.plan as PlatformPlan)) {
    data.plan = body.plan;
  }
  if (typeof body.pointsPerReal === "number" && body.pointsPerReal >= 0) {
    data.pointsPerReal = body.pointsPerReal;
  }
  for (const nf of ["bgDim", "bgBlur"] as const) {
    if (typeof body[nf] === "number" && body[nf] >= 0) data[nf] = body[nf];
  }
  if (typeof body.bgGradient === "boolean") data.bgGradient = body.bgGradient;
  // Auto-piloto (automações).
  if (typeof body.autoConfirm === "boolean") data.autoConfirm = body.autoConfirm;
  if (typeof body.autoBirthday === "boolean") data.autoBirthday = body.autoBirthday;
  if ("autoWinbackDays" in body) {
    data.autoWinbackDays = typeof body.autoWinbackDays === "number" && body.autoWinbackDays > 0 ? Math.round(body.autoWinbackDays) : null;
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

  const { paymentApiKey: _k, fiscalApiKey: _fk, ...safe } = barbershop;
  return NextResponse.json({ ...safe, paymentConnected: Boolean(_k), fiscalConnected: Boolean(_fk) });
}

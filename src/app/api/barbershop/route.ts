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
  "chatbotName",
  "chatbotWelcome",
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
  // Logo e capa: string vazia significa "remover" (o botão Restaurar padrão da
  // aparência). Guardar "" deixaria o app tentando carregar uma imagem vazia e
  // mostrando ícone quebrado — null some limpo.
  if (typeof body.logo === "string") data.logo = body.logo.trim() || null;
  if (typeof body.coverImage === "string") data.coverImage = body.coverImage.trim() || null;

  // Blindagem dos campos de APARÊNCIA. O loop acima aceita qualquer string;
  // aqui a gente garante que o que chega no app é sempre válido, senão uma
  // cor inventada ou um bgType errado vira app quebrado (e o manifesto do PWA
  // com cor invalida). Valor ruim é ignorado, não salvo.
  if (typeof body.primaryColor === "string") {
    const c = body.primaryColor.trim();
    if (/^#[0-9a-fA-F]{3}$/.test(c) || /^#[0-9a-fA-F]{6}$/.test(c)) data.primaryColor = c.toUpperCase();
    else delete data.primaryColor;
  }
  if (typeof body.secondaryColor === "string") {
    const c = body.secondaryColor.trim();
    if (!(/^#[0-9a-fA-F]{3}$/.test(c) || /^#[0-9a-fA-F]{6}$/.test(c))) delete data.secondaryColor;
  }
  if ("bgType" in body && !["gradient", "image", "video"].includes(body.bgType)) delete data.bgType;
  if ("bgEffect" in body && !["none", "zoom", "pulse"].includes(body.bgEffect)) delete data.bgEffect;
  if ("themeMode" in body && !["light", "dark"].includes(body.themeMode)) delete data.themeMode;
  // Nome nunca pode ficar vazio (o app mostraria uma barra em branco); teto
  // pra não estourar layout.
  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length < 1 || n.length > 120) delete data.name;
    else data.name = n;
  }
  if (typeof body.appTagline === "string") data.appTagline = body.appTagline.trim().slice(0, 140) || null;
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
  // Escurecer e desfoque com teto: um bgBlur gigante (ex.: 9999) borra o fundo
  // até virar um borrão só, e um bgDim > 100 apaga a tela. Trava no que o
  // editor oferece.
  for (const [nf, max] of [["bgDim", 80], ["bgBlur", 16]] as const) {
    if (typeof body[nf] === "number" && body[nf] >= 0) data[nf] = Math.min(Math.round(body[nf]), max);
  }
  if (typeof body.bgGradient === "boolean") data.bgGradient = body.bgGradient;
  // Auto-piloto (automações).
  if (typeof body.autopilotLevel === "string" && ["off", "suggest", "auto"].includes(body.autopilotLevel)) data.autopilotLevel = body.autopilotLevel;
  if (typeof body.chatbotEnabled === "boolean") data.chatbotEnabled = body.chatbotEnabled;
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

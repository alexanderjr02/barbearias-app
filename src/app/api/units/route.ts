import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { listUnits, primaryBarbershopId } from "@/lib/units";
import { slugify } from "@/lib/utils";

// GET /api/units — as unidades da rede do dono logado.
// POST /api/units { name, city? } — abre uma nova unidade.
//
// Multi-unidade é do plano White Label: a unidade primária carrega o preço
// base e cada unidade extra é cobrada à parte.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const units = await listUnits(session.sub, session.barbershopId);
  return NextResponse.json({ units, canAddUnit: await canAddUnit(session.sub) });
}

/** Só o White Label abre unidades — checa o plano da unidade primária. */
async function canAddUnit(ownerId: string): Promise<boolean> {
  const primaryId = await primaryBarbershopId(ownerId);
  if (!primaryId) return false;
  const primary = await prisma.barbershop.findUnique({ where: { id: primaryId }, select: { plan: true } });
  return primary?.plan === "ENTERPRISE";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const primaryId = await primaryBarbershopId(session.sub);
  if (!primaryId) return NextResponse.json({ error: "Você ainda não tem uma barbearia." }, { status: 400 });

  const primary = await prisma.barbershop.findUnique({
    where: { id: primaryId },
    select: { plan: true, primaryColor: true, secondaryColor: true, themePreset: true, themeMode: true },
  });
  if (primary?.plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Abrir novas unidades faz parte do plano White Label.", locked: true }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const city = body?.city ? String(body.city).trim().slice(0, 80) : null;
  if (name.length < 2) return NextResponse.json({ error: "Dê um nome para a unidade." }, { status: 400 });

  // Slug único: a página pública de agendamento de cada unidade é separada.
  const base = slugify(name) || "unidade";
  let slug = base;
  for (let i = 2; await prisma.barbershop.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }

  const unit = await prisma.barbershop.create({
    data: {
      name,
      slug,
      city,
      ownerId: session.sub,
      // A unidade nova herda o plano e a identidade visual da rede — senão ela
      // nasceria no Essencial e o dono perderia a IA e a marca dentro da
      // própria rede que ele já paga.
      plan: primary.plan,
      primaryColor: primary.primaryColor,
      secondaryColor: primary.secondaryColor,
      themePreset: primary.themePreset,
      themeMode: primary.themeMode,
    },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ unit }, { status: 201 });
}

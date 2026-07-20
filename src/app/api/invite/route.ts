import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { loyaltyConfig } from "@/lib/loyalty/engine";

// GET /api/invite — tudo que a tela de divulgação precisa:
// o link de instalação da barbearia e a lista de clientes para convidar,
// cada um com o progresso do cartão de selos.
//
// O progresso vem junto de propósito: "instale nosso app" converte mal;
// "você já tem 3 de 10 selos" converte, porque a pessoa já tem algo a
// perder. É o cartão de fidelidade fazendo o trabalho de distribuição.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const shop = await prisma.barbershop.findUnique({
    where: { id: session.barbershopId },
    select: { name: true, slug: true, logo: true, primaryColor: true, plan: true },
  });
  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  const cfg = await loyaltyConfig(session.barbershopId);

  const [links, cards, staff] = await Promise.all([
    prisma.barbershopClient.findMany({
      where: { barbershopId: session.barbershopId, status: { not: "BLOCKED" } },
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.stampCard.findMany({
      where: { barbershopId: session.barbershopId },
      select: { userId: true, stamps: true },
    }),
    prisma.staff.findMany({
      where: { barbershopId: session.barbershopId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  type CardRow = (typeof cards)[number];
  type LinkRow = (typeof links)[number];
  const stampsByUser = new Map<string, number>((cards as CardRow[]).map((c: CardRow) => [c.userId, c.stamps]));

  const clients = (links as LinkRow[])
    // Sem telefone não há como mandar no WhatsApp — some da lista em vez de
    // virar uma linha com botão que não funciona.
    .filter((l: LinkRow) => (l.user.phone ?? "").replace(/\D/g, "").length >= 10)
    .map((l: LinkRow) => ({
      id: l.user.id,
      name: l.user.name,
      phone: (l.user.phone ?? "").replace(/\D/g, ""),
      stamps: stampsByUser.get(l.user.id) ?? 0,
    }))
    .sort((a, b) => b.stamps - a.stamps);

  return NextResponse.json({
    shop: { name: shop.name, slug: shop.slug, logo: shop.logo, primaryColor: shop.primaryColor, plan: shop.plan },
    loyalty: {
      stampEnabled: cfg?.stampEnabled ?? false,
      stampGoal: cfg?.stampGoal ?? 0,
      stampRewardLabel: cfg?.stampRewardLabel ?? "",
    },
    staff,
    clients,
  });
}

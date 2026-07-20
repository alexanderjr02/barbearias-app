import { prisma } from "./db";

// Rede de unidades. Um dono (OWNER) pode ter várias barbearias; a sessão
// carrega UMA delas por vez — a "unidade atual" do painel. Este módulo é a
// única fonte de verdade sobre qual é essa unidade, para que login, refresh e
// troca de unidade nunca discordem entre si.
//
// A rede é implícita: "as barbearias com o mesmo ownerId". Não há um modelo
// Network separado de propósito — as 72 rotas já filtram por barbershopId, e
// um modelo a mais só adicionaria migração e risco sem mudar o comportamento.

/** A unidade primária de um dono: a mais antiga. Carrega o preço-base do
 * plano; as demais contam como unidades extras na fatura. */
export async function primaryBarbershopId(ownerId: string): Promise<string | null> {
  const first = await prisma.barbershop.findFirst({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}

/**
 * Resolve a unidade que a sessão deve usar para um dono.
 *
 * Sempre revalida que a unidade escolhida ainda pertence a ele — assim uma
 * unidade removida (ou um activeBarbershopId adulterado) cai de volta para a
 * primária em vez de vazar dados de outra rede.
 */
export async function resolveActiveBarbershopId(ownerId: string, activeBarbershopId: string | null): Promise<string | null> {
  if (activeBarbershopId) {
    const owned = await prisma.barbershop.findFirst({
      where: { id: activeBarbershopId, ownerId },
      select: { id: true },
    });
    if (owned) return owned.id;
  }
  return primaryBarbershopId(ownerId);
}

export interface UnitSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isPrimary: boolean;
  isCurrent: boolean;
}

/** As unidades do dono, com qual é a primária e qual está selecionada. */
export async function listUnits(ownerId: string, currentBarbershopId: string | null): Promise<UnitSummary[]> {
  const shops = await prisma.barbershop.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, city: true },
  });
  type S = { id: string; name: string; slug: string; city: string | null };
  return (shops as S[]).map((s, i) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    isPrimary: i === 0,
    isCurrent: s.id === currentBarbershopId,
  }));
}

/** Quantas unidades o dono tem — base da cobrança por unidade adicional. */
export async function countUnits(ownerId: string): Promise<number> {
  return prisma.barbershop.count({ where: { ownerId } });
}

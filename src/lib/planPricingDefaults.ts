// FONTE DA VERDADE dos preços de plano. Fica num módulo sem dependência de
// banco justamente para que billing.ts (runtime) e prisma/seed.ts (semente)
// importem o MESMO valor.
//
// Por que isso existe: os preços ficam gravados em PlatformSetting (para o
// admin poder editar em /admin/settings), e o valor do banco SOBREPÕE o do
// código. Já aconteceu de o código dizer R$897 e o banco continuar em R$399 —
// a plataforma faturava o preço velho em silêncio. Manter os dois lados
// apontando para cá reduz a chance de a semente reintroduzir preço antigo.
//
// ATENÇÃO: alterar aqui NÃO muda uma instalação que já rodou o seed — as
// linhas de PlatformSetting existentes continuam valendo. Para valer, edite
// em /admin/settings ou atualize as linhas do banco.
export type PlanPricingDefaults = { price: number; appointmentsLimit: number | null; staffLimit: number | null };

export const DEFAULT_PLAN_PRICING: Record<"FREE" | "PRO" | "ENTERPRISE", PlanPricingDefaults> = {
  FREE: { price: 50, appointmentsLimit: null, staffLimit: 3 },
  PRO: { price: 250, appointmentsLimit: null, staffLimit: 10 },
  ENTERPRISE: { price: 897, appointmentsLimit: null, staffLimit: null },
};

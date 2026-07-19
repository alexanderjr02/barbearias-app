import { prisma } from "@/lib/db";
import { startOfUtcDay, startOfUtcMonth } from "@/lib/dateRange";

// AI margin guardrail. Two jobs:
//   1) MEASURE — record every model call's tokens + estimated R$ cost, so the
//      platform can see spend per shop and never be surprised by a bill.
//   2) CAP — bound how much AI a single shop can use per day by plan, so one
//      heavy user (or an abuse loop) can't torch your margin. Over the cap the
//      chat falls back to the FREE simulated mode instead of calling the model.
//
// Tune with env without a redeploy: AI_DAILY_CAP_PRO / AI_DAILY_CAP_ENTERPRISE
// (number of AI turns/day) and USD_BRL (FX for the cost estimate).

// USD price per 1M tokens, per model (from the Anthropic price list).
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-opus-4-7": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

const USD_BRL = Number(process.env.USD_BRL) || 6;

// Prompt-caching multipliers on the INPUT price: a cache write costs 1.25x,
// a cache read only ~0.1x. That 10x gap is the whole margin story.
const CACHE_WRITE_MULT = 1.25;
const CACHE_READ_MULT = 0.1;

export function estimateCostCents(model: string, inTok: number, outTok: number, cacheWrite = 0, cacheRead = 0): number {
  const p = PRICES[model] ?? PRICES["claude-opus-4-8"];
  const usd =
    (inTok / 1_000_000) * p.in +
    (outTok / 1_000_000) * p.out +
    (cacheWrite / 1_000_000) * p.in * CACHE_WRITE_MULT +
    (cacheRead / 1_000_000) * p.in * CACHE_READ_MULT;
  return Math.round(usd * USD_BRL * 100);
}

// How many AI turns/day each plan gets. Sized against MEASURED cost: with
// prompt caching a Copiloto turn costs ~R$0,16 on Opus, so 40/dia caps a
// single shop's worst case near the plan price instead of 8x past it (the old
// 250/dia default would have burned ~R$1.200/mês on one heavy user).
// A typical gestor asks a handful of questions a day and never sees the cap.
// FREE has no AI at all.
export function dailyCap(plan: string | null | undefined): number {
  if (plan === "ENTERPRISE") return Number(process.env.AI_DAILY_CAP_ENTERPRISE) || 120;
  if (plan === "PRO") return Number(process.env.AI_DAILY_CAP_PRO) || 40;
  return 0;
}

export interface AiQuota {
  allowed: boolean;
  used: number;
  cap: number;
}

/** Checks the shop's AI turns used today against its plan cap. Fails OPEN (allows)
 * on any error so a metering hiccup never blocks a paying customer's chat. */
export async function aiQuota(barbershopId: string, plan: string | null | undefined): Promise<AiQuota> {
  const cap = dailyCap(plan);
  if (cap <= 0) return { allowed: false, used: 0, cap: 0 };
  try {
    const used = await prisma.aiUsage.count({ where: { barbershopId, createdAt: { gte: startOfUtcDay(new Date()) } } });
    return { allowed: used < cap, used, cap };
  } catch {
    return { allowed: true, used: 0, cap };
  }
}

/** Records one AI call. Never throws — metering must not break the chat. */
export async function recordAiUsage(
  barbershopId: string,
  feature: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens = 0,
  cacheReadTokens = 0,
): Promise<void> {
  try {
    const inTok = inputTokens || 0;
    const outTok = outputTokens || 0;
    const cw = cacheWriteTokens || 0;
    const cr = cacheReadTokens || 0;
    await prisma.aiUsage.create({
      data: { barbershopId, feature, model, inputTokens: inTok, outputTokens: outTok, cacheWriteTokens: cw, cacheReadTokens: cr, costCents: estimateCostCents(model, inTok, outTok, cw, cr) },
    });
  } catch {
    // non-critical
  }
}

/** Month-to-date spend + volume for a shop — powers the cost dashboard. */
export async function aiSpendThisMonth(barbershopId: string) {
  const since = startOfUtcMonth(new Date());
  const rows = await prisma.aiUsage.findMany({ where: { barbershopId, createdAt: { gte: since } }, select: { costCents: true, inputTokens: true, outputTokens: true, cacheWriteTokens: true, cacheReadTokens: true, feature: true } });
  type R = { costCents: number; inputTokens: number; outputTokens: number; cacheWriteTokens: number; cacheReadTokens: number; feature: string };
  const list = rows as R[];
  const costCents = list.reduce((s, r) => s + r.costCents, 0);
  const byFeature: Record<string, { calls: number; costCents: number }> = {};
  for (const r of list) {
    const f = (byFeature[r.feature] ??= { calls: 0, costCents: 0 });
    f.calls += 1;
    f.costCents += r.costCents;
  }
  const cacheRead = list.reduce((s, r) => s + r.cacheReadTokens, 0);
  const cacheWrite = list.reduce((s, r) => s + r.cacheWriteTokens, 0);
  const rawInput = list.reduce((s, r) => s + r.inputTokens, 0);
  const totalPrompt = rawInput + cacheRead + cacheWrite;
  return {
    calls: list.length,
    costCents,
    costBRL: Math.round(costCents) / 100,
    inputTokens: rawInput,
    outputTokens: list.reduce((s, r) => s + r.outputTokens, 0),
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    // % do prompt servido pelo cache (a ~10% do preço) — quanto maior, melhor a margem.
    cacheHitPercent: totalPrompt > 0 ? Math.round((cacheRead / totalPrompt) * 100) : 0,
    byFeature,
  };
}

import { prisma } from "@/lib/db";
import { startOfUtcDay, addUtcDays } from "@/lib/dateRange";
import { buildDaySlots, shopNow, timeToMinutes } from "@/lib/scheduling";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CHATBOT_MODEL || "claude-opus-4-8";

// The client's "personal style agent" brain — the part that makes the bot
// ANTECIPATE instead of just answer. It learns the client's rhythm (how often
// they cut, with whom, at what time) and, when they're due, proposes the next
// slot before they ask. Deterministic core (zero AI); the opener text is
// AI-polished when a key is set.

export interface ClientRhythm {
  visits: number;
  lastVisit: string | null;
  daysSince: number | null;
  avgCadenceDays: number | null;
  due: boolean;
  usualService: { id: string; name: string; duration: number } | null;
  usualStaff: { id: string; name: string } | null;
  usualHour: number | null;
}

function mode<T>(items: T[]): T | null {
  if (!items.length) return null;
  const counts = new Map<T, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function clientRhythm(barbershopId: string, clientId: string): Promise<ClientRhythm> {
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, clientId, status: "COMPLETED" },
    orderBy: { date: "asc" },
    select: { date: true, startTime: true, serviceId: true, staffId: true, service: { select: { id: true, name: true, duration: true } }, staff: { select: { id: true, name: true } } },
  });
  type A = { date: Date; startTime: string; serviceId: string; staffId: string; service: { id: string; name: string; duration: number } | null; staff: { id: string; name: string } | null };
  const list = appts as A[];
  const visits = list.length;
  if (!visits) return { visits: 0, lastVisit: null, daysSince: null, avgCadenceDays: null, due: false, usualService: null, usualStaff: null, usualHour: null };

  const startToday = startOfUtcDay(new Date());
  const last = list[list.length - 1].date;
  const daysSince = Math.floor((startToday.getTime() - last.getTime()) / 86400000);

  let avgCadence: number | null = null;
  if (visits >= 2) {
    let sum = 0;
    for (let i = 1; i < list.length; i++) sum += (list[i].date.getTime() - list[i - 1].date.getTime()) / 86400000;
    avgCadence = Math.round(sum / (list.length - 1));
    if (avgCadence <= 0) avgCadence = null;
  }
  // "Due" = passou pelo menos 90% da cadência habitual. Com 1 visita só, usa 25 dias como palpite.
  const threshold = avgCadence ?? 25;
  const due = daysSince >= Math.round(threshold * 0.9);

  const svc = list.map((a) => a.service).filter((s): s is { id: string; name: string; duration: number } => !!s);
  const stf = list.map((a) => a.staff).filter((s): s is { id: string; name: string } => !!s);
  const usualServiceId = mode(svc.map((s) => s.id));
  const usualStaffId = mode(stf.map((s) => s.id));
  const usualService = svc.find((s) => s.id === usualServiceId) ?? null;
  const usualStaff = stf.find((s) => s.id === usualStaffId) ?? null;
  const usualHour = mode(list.map((a) => parseInt(a.startTime.slice(0, 2), 10)).filter((h) => !Number.isNaN(h)));

  return { visits, lastVisit: last.toISOString().slice(0, 10), daysSince, avgCadenceDays: avgCadence, due, usualService, usualStaff, usualHour };
}

/** Earliest real free slot for a staff+duration over the next `days`, preferring
 * one at/after the client's usual hour. Returns null if nothing is open. */
export async function suggestNextSlot(barbershopId: string, staffId: string, durationMinutes: number, preferHour: number | null, days = 10): Promise<{ dateKey: string; time: string } | null> {
  const today = startOfUtcDay(new Date());
  const preferMin = preferHour != null ? preferHour * 60 : null;
  for (let d = 1; d <= days; d++) {
    const dateKey = addUtcDays(today, d).toISOString().slice(0, 10);
    const { slots } = await buildDaySlots({ barbershopId, staffId, dateKey, durationMinutes });
    const free = slots.filter((s) => s.status === "available").map((s) => s.time);
    if (!free.length) continue;
    if (preferMin == null) return { dateKey, time: free[0] };
    const atOrAfter = free.find((t) => timeToMinutes(t) >= preferMin);
    return { dateKey, time: atOrAfter ?? free[0] };
  }
  return null;
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
function prettyDate(dateKey: string): string {
  const d = new Date(dateKey);
  return `${WEEKDAYS[d.getUTCDay()]} (${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")})`;
}

export interface ProactiveOpener {
  greeting: string;
  proactive: boolean;
  suggestion: { dateKey: string; time: string; service: string; staff: string } | null;
}

/** The proactive opener shown when the client opens the chat with no history —
 * "seu cabelo já tá na hora, sexta 15h com o Thalles igual sempre?". */
export async function clientProactiveOpener(barbershopId: string, clientId: string, firstName: string): Promise<ProactiveOpener> {
  const rhythm = await clientRhythm(barbershopId, clientId);
  const hi = firstName ? `, ${firstName}` : "";

  let suggestion: ProactiveOpener["suggestion"] = null;
  let fallback: string;
  let facts: string;

  if (rhythm.due && rhythm.usualService && rhythm.usualStaff) {
    const slot = await suggestNextSlot(barbershopId, rhythm.usualStaff.id, rhythm.usualService.duration, rhythm.usualHour);
    if (slot) {
      suggestion = { dateKey: slot.dateKey, time: slot.time, service: rhythm.usualService.name, staff: rhythm.usualStaff.name };
      facts = `O cliente costuma cortar a cada ${rhythm.avgCadenceDays ?? "≈25"} dias e já faz ${rhythm.daysSince} dias desde o último. O de sempre: ${rhythm.usualService.name} com ${rhythm.usualStaff.name}. Próximo horário livre parecido: ${prettyDate(slot.dateKey)} às ${slot.time}.`;
      fallback = `Opa${hi}! 👋 Já faz ${rhythm.daysSince} dias do seu último corte — tá quase na hora. Achei ${prettyDate(slot.dateKey)} às ${slot.time} com o ${rhythm.usualStaff.name.split(" ")[0]}, no seu ${rhythm.usualService.name} de sempre. Quer que eu marque?`;
    } else {
      facts = `Cliente está na hora do corte (${rhythm.daysSince} dias), mas não achei horário livre nos próximos dias com ${rhythm.usualStaff.name}.`;
      fallback = `Opa${hi}! 👋 Tá na hora do corte (${rhythm.daysSince} dias). A agenda do ${rhythm.usualStaff.name.split(" ")[0]} tá cheia nos próximos dias — quer que eu procure outro dia ou outro barbeiro?`;
    }
  } else if (rhythm.visits > 0) {
    facts = `Cliente com ${rhythm.visits} visita(s), última há ${rhythm.daysSince} dias. Ainda não está na hora do corte.`;
    fallback = `Oi${hi}! 👋 Tô aqui pra quando precisar marcar, ver seus horários ou tirar dúvida. É só chamar. 😉`;
  } else {
    facts = "Cliente novo, sem histórico ainda.";
    fallback = `Oi${hi}! 👋 Sou seu assistente. Posso marcar seu horário, indicar um corte ou tirar dúvidas. Bora começar?`;
  }

  if (!assistantEnabled()) return { greeting: fallback, proactive: !!suggestion, suggestion };

  try {
    const client = getAnthropic();
    const sys = `Você é o assistente pessoal de estilo de uma barbearia, falando com um cliente por chat. Escreva UMA mensagem de abertura curta (1 a 2 frases), calorosa e natural em português do Brasil, começando por "Oi${hi}" ou "Opa${hi}". Se houver um horário sugerido, proponha ele de forma concreta e termine perguntando se quer que marque. Texto limpo, SEM markdown. No máximo 1 emoji. Responda só com a mensagem.`;
    const msg = await client.messages.create({ model: MODEL, max_tokens: 160, system: sys, messages: [{ role: "user", content: facts }] });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
    return { greeting: text || fallback, proactive: !!suggestion, suggestion };
  } catch {
    return { greeting: fallback, proactive: !!suggestion, suggestion };
  }
}

/** A compact line describing the client's rhythm + the suggested slot, injected
 * into the chat's clientContext so a simple "sim, pode marcar" books it without
 * re-asking. */
export async function rhythmContextLine(barbershopId: string, clientId: string): Promise<string> {
  const rhythm = await clientRhythm(barbershopId, clientId);
  if (!rhythm.usualService || !rhythm.usualStaff) return "";
  const bits = [`Costuma fazer ${rhythm.usualService.name} com ${rhythm.usualStaff.name}${rhythm.usualHour != null ? ` por volta das ${rhythm.usualHour}h` : ""}`];
  if (rhythm.avgCadenceDays) bits.push(`a cada ~${rhythm.avgCadenceDays} dias`);
  if (rhythm.due) {
    const slot = await suggestNextSlot(barbershopId, rhythm.usualStaff.id, rhythm.usualService.duration, rhythm.usualHour);
    if (slot) bits.push(`está na hora do corte; um horário livre no padrão dele é ${prettyDate(slot.dateKey)} às ${slot.time} (use isto se ele pedir "o de sempre" ou disser "pode marcar")`);
  }
  return `Ritmo: ${bits.join(", ")}.`;
}

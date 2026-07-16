import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { startOfUtcMonth, startOfUtcDay, addUtcDays } from "@/lib/dateRange";
import { assistantEnabled } from "./assistant";
import {
  revenueSummary,
  churnedClients,
  emptySlotsToday,
  topClients,
  barberLeaderboard,
  lowStock,
  tomorrowAppointments,
} from "@/lib/copilot/insights";

const MODEL = process.env.CHATBOT_MODEL || "claude-opus-4-8";

export type CopilotRole = "GESTOR" | "BARBER";
export type ChatTurn = { role: "user" | "assistant"; content: string };

const money = (n: number) => `R$ ${n.toFixed(2)}`;

// ---- Barber-personal helpers (scoped to one staff member) ----

async function barberEarnings(staffId: string) {
  const startMonth = startOfUtcMonth(new Date());
  const [staff, appts, tips] = await Promise.all([
    prisma.staff.findUnique({ where: { id: staffId }, select: { commissionRate: true } }),
    prisma.appointment.findMany({ where: { staffId, status: "COMPLETED", date: { gte: startMonth } }, select: { totalPrice: true } }),
    prisma.tip.findMany({ where: { staffId, createdAt: { gte: startMonth } }, select: { amount: true } }),
  ]);
  type A = { totalPrice: number };
  const revenue = appts.reduce((s: number, a: A) => s + a.totalPrice, 0);
  const rate = staff?.commissionRate ?? 0;
  const tipTotal = tips.reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  return { revenue, commission: revenue * rate, completed: appts.length, tips: tipTotal, rate };
}

async function nextClient(staffId: string) {
  const now = startOfUtcDay(new Date());
  const appt = await prisma.appointment.findFirst({
    where: { staffId, date: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: { clientId: true, clientName: true, startTime: true, service: { select: { name: true } } },
  });
  if (!appt) return null;
  let prefs = null;
  let recipe = null;
  if (appt.clientId) {
    prefs = await prisma.clientPreferences.findUnique({ where: { clientId: appt.clientId } });
    recipe = await prisma.appointment.findFirst({
      where: { clientId: appt.clientId, OR: [{ recipeMachine: { not: null } }, { recipeFinish: { not: null } }, { recipeProducts: { not: null } }] },
      orderBy: { date: "desc" },
      select: { recipeMachine: true, recipeFinish: true, recipeProducts: true },
    });
  }
  return { name: appt.clientName, time: appt.startTime, service: appt.service?.name, prefs, recipe };
}

// ---- Tools (AI mode) ----

function toolsFor(role: CopilotRole): Anthropic.Tool[] {
  const read: Anthropic.Tool[] = [
    { name: "get_revenue", description: "Faturamento (hoje, últimos 7 dias vs semana anterior, mês, ticket médio).", input_schema: { type: "object", properties: {} } },
    { name: "get_churned_clients", description: "Clientes que sumiram (não voltam há X dias).", input_schema: { type: "object", properties: { days: { type: "number" } } } },
    { name: "get_empty_slots_today", description: "Horários livres de hoje por barbeiro.", input_schema: { type: "object", properties: {} } },
    { name: "get_top_clients", description: "Melhores clientes por gasto/visitas.", input_schema: { type: "object", properties: {} } },
    { name: "get_barber_leaderboard", description: "Desempenho dos barbeiros no mês (faturamento, avaliação).", input_schema: { type: "object", properties: {} } },
    { name: "get_low_stock", description: "Produtos acabando (estoque no mínimo).", input_schema: { type: "object", properties: {} } },
    { name: "get_tomorrow", description: "Agendamentos de amanhã e quantos ainda não foram confirmados.", input_schema: { type: "object", properties: {} } },
  ];
  const gestorActions: Anthropic.Tool[] = [
    { name: "confirm_tomorrow", description: "Confirma todos os agendamentos de amanhã que estão só agendados (reduz falta).", input_schema: { type: "object", properties: {} } },
    { name: "winback_churned", description: "Manda mensagem de retorno pros clientes sumidos que têm conta.", input_schema: { type: "object", properties: {} } },
    { name: "notify_waitlist", description: "Avisa a fila de espera que abriu horário.", input_schema: { type: "object", properties: {} } },
  ];
  const gestorAdmin: Anthropic.Tool[] = [
    {
      name: "create_service",
      description: "Cadastra um novo serviço na barbearia. Confirme nome, duração e preço com o gestor antes.",
      input_schema: { type: "object", properties: { name: { type: "string" }, durationMinutes: { type: "number" }, price: { type: "number" } }, required: ["name", "durationMinutes", "price"] },
    },
    {
      name: "update_service_price",
      description: "Atualiza o preço de um serviço existente (pelo nome).",
      input_schema: { type: "object", properties: { serviceName: { type: "string" }, price: { type: "number" } }, required: ["serviceName", "price"] },
    },
    {
      name: "set_day_off",
      description: "Marca uma folga (dia sem atender) para um barbeiro numa data.",
      input_schema: { type: "object", properties: { staffName: { type: "string" }, dateKey: { type: "string", description: "AAAA-MM-DD" }, reason: { type: "string" } }, required: ["staffName", "dateKey"] },
    },
  ];
  const barberTools: Anthropic.Tool[] = [
    { name: "get_my_earnings", description: "Meus ganhos do mês: comissão, atendimentos, gorjetas.", input_schema: { type: "object", properties: {} } },
    { name: "get_next_client", description: "Meu próximo cliente com preferências e a receita do último corte.", input_schema: { type: "object", properties: {} } },
  ];
  if (role === "BARBER") return [...barberTools, ...read.filter((t) => ["get_churned_clients"].includes(t.name))];
  return [...read, ...gestorActions, ...gestorAdmin];
}

async function resolveShopService(barbershopId: string, name: string) {
  const services: { id: string; name: string }[] = await prisma.service.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
  const n = name.trim().toLowerCase();
  return services.find((s) => s.name.toLowerCase() === n) ?? services.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) ?? null;
}

async function resolveShopStaff(barbershopId: string, name: string) {
  const staff: { id: string; name: string }[] = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
  const n = name.trim().toLowerCase();
  return staff.find((s) => s.name.toLowerCase() === n) ?? staff.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) ?? null;
}

async function runCopilotTool(role: CopilotRole, barbershopId: string, staffId: string | null, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_revenue":
      return JSON.stringify(await revenueSummary(barbershopId));
    case "get_churned_clients":
      return JSON.stringify(await churnedClients(barbershopId, typeof input.days === "number" ? input.days : 45));
    case "get_empty_slots_today":
      return JSON.stringify(await emptySlotsToday(barbershopId));
    case "get_top_clients":
      return JSON.stringify(await topClients(barbershopId));
    case "get_barber_leaderboard":
      return JSON.stringify(await barberLeaderboard(barbershopId));
    case "get_low_stock":
      return JSON.stringify(await lowStock(barbershopId));
    case "get_tomorrow":
      return JSON.stringify(await tomorrowAppointments(barbershopId));
    case "get_my_earnings":
      return staffId ? JSON.stringify(await barberEarnings(staffId)) : "Sem perfil de barbeiro.";
    case "get_next_client":
      return staffId ? JSON.stringify((await nextClient(staffId)) ?? "Nenhum cliente na agenda.") : "Sem perfil de barbeiro.";
    case "confirm_tomorrow":
    case "winback_churned":
    case "notify_waitlist":
      return "AÇÃO: peça pro usuário confirmar tocando no botão da ação (não execute direto no chat).";
    case "create_service": {
      const name = String(input.name ?? "").trim();
      const duration = Number(input.durationMinutes);
      const price = Number(input.price);
      if (!name || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(price) || price < 0) return "Dados incompletos: preciso de nome, duração (min) e preço.";
      const created = await prisma.service.create({ data: { barbershopId, name, duration: Math.round(duration), price } });
      return `Serviço criado: ${created.name}, ${created.duration}min, R$ ${created.price.toFixed(2)}.`;
    }
    case "update_service_price": {
      const svc = await resolveShopService(barbershopId, String(input.serviceName ?? ""));
      if (!svc) return "Serviço não encontrado.";
      const price = Number(input.price);
      if (!Number.isFinite(price) || price < 0) return "Preço inválido.";
      await prisma.service.update({ where: { id: svc.id }, data: { price } });
      return `Preço de ${svc.name} atualizado para R$ ${price.toFixed(2)}.`;
    }
    case "set_day_off": {
      const st = await resolveShopStaff(barbershopId, String(input.staffName ?? ""));
      if (!st) return "Barbeiro não encontrado.";
      const dateKey = String(input.dateKey ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "Data inválida (use AAAA-MM-DD).";
      const reason = input.reason ? String(input.reason) : null;
      await prisma.staffTimeOff.upsert({
        where: { staffId_date: { staffId: st.id, date: new Date(dateKey) } },
        update: { reason },
        create: { staffId: st.id, date: new Date(dateKey), reason },
      });
      return `Folga de ${st.name} marcada para ${dateKey}.`;
    }
    default:
      return "Ferramenta desconhecida.";
  }
}

/** Runs the AI copilot loop. Only call when assistantEnabled(). */
export async function runCopilot(role: CopilotRole, barbershopId: string, staffId: string | null, history: ChatTurn[]): Promise<string> {
  const client = new Anthropic();
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });

  const who = role === "BARBER" ? "o barbeiro" : "o dono/gestor";
  const adminNote =
    role === "GESTOR"
      ? `\nVocê também administra por conversa: pode CADASTRAR serviço (create_service), MUDAR preço (update_service_price) e MARCAR folga de barbeiro (set_day_off). Antes de executar essas ações de escrita, confirme os dados com o gestor numa frase curta ("Confirma: Corte+Barba, 60min, R$55?") e só chame a ferramenta após o "sim".`
      : "";
  const system = `Você é o Copiloto da barbearia "${shop?.name ?? "nossa barbearia"}", um assistente de negócio que ajuda ${who}. Fale português do Brasil, direto e prático.
Use as ferramentas para dados reais — nunca invente números. Quando fizer sentido uma ação de aviso (confirmar amanhã, chamar sumidos, avisar fila), NÃO execute: diga ao usuário para tocar no botão correspondente no painel.${adminNote} Respostas curtas, com números e, quando útil, uma recomendação objetiva.`;

  const messages: Anthropic.MessageParam[] = history.slice(-16).map((m) => ({ role: m.role, content: m.content }));
  const tools = toolsFor(role);

  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({ model: MODEL, max_tokens: 1024, system, tools, messages });
    if (response.stop_reason !== "tool_use") {
      return response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim() || "Pode reformular?";
    }
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        let out: string;
        try {
          out = await runCopilotTool(role, barbershopId, staffId, block.name, block.input as Record<string, unknown>);
        } catch (e) {
          out = `Erro: ${e instanceof Error ? e.message : String(e)}`;
        }
        results.push({ type: "tool_result", tool_use_id: block.id, content: out });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return "Não consegui concluir agora. Pode tentar de novo?";
}

// ---- Simulated responder (no API key) ----
// Keyword-matches the question to a deterministic insight so the Copiloto is
// fully demonstrable before any Anthropic key is configured.

export async function simulatedReply(role: CopilotRole, barbershopId: string, staffId: string | null, message: string): Promise<string> {
  const q = message.toLowerCase();
  const has = (...w: string[]) => w.some((x) => q.includes(x));

  if (role === "BARBER") {
    if (has("ganho", "comiss", "receber", "meta", "quanto")) {
      if (!staffId) return "Não achei seu perfil de barbeiro.";
      const e = await barberEarnings(staffId);
      return `Este mês: ${e.completed} atendimentos, ${money(e.revenue)} gerados → sua comissão é ${money(e.commission)} (${(e.rate * 100).toFixed(0)}%). Gorjetas: ${money(e.tips)}.`;
    }
    if (has("próximo", "proximo", "cliente", "agora")) {
      if (!staffId) return "Não achei seu perfil de barbeiro.";
      const n = await nextClient(staffId);
      if (!n) return "Você não tem próximo cliente na agenda.";
      const bits = [`Próximo: ${n.name} às ${n.time} (${n.service ?? "serviço"}).`];
      if (n.recipe?.recipeMachine || n.recipe?.recipeFinish) bits.push(`Última receita: ${[n.recipe.recipeMachine, n.recipe.recipeFinish, n.recipe.recipeProducts].filter(Boolean).join(" · ")}.`);
      return bits.join(" ");
    }
    return "Sou seu copiloto. Pergunte: \"quanto vou receber esse mês?\" ou \"quem é meu próximo cliente?\".";
  }

  if (has("fatur", "receita", "ganhei", "faturamento", "vendas", "quanto")) {
    const r = await revenueSummary(barbershopId);
    const d = r.weekDeltaPercent == null ? "" : ` (${r.weekDeltaPercent >= 0 ? "+" : ""}${r.weekDeltaPercent.toFixed(0)}% vs semana passada)`;
    return `Últimos 7 dias: ${money(r.thisWeek)}${d}. No mês: ${money(r.monthRevenue)} em ${r.monthCount} atendimentos (ticket médio ${money(r.avgTicket)}).`;
  }
  if (has("sumi", "sumido", "não volta", "nao volta", "perdi", "churn", "inativ")) {
    const c = await churnedClients(barbershopId);
    if (!c.length) return "Boa notícia: nenhum cliente sumido há mais de 45 dias. 👏";
    const top = c.slice(0, 5).map((x) => `${x.name} (${x.daysSince}d)`).join(", ");
    return `${c.length} clientes sumidos (+45 dias). Top: ${top}. Toque em "Chamar de volta" no painel pra avisar quem tem conta.`;
  }
  if (has("vazio", "livre", "buraco", "horário", "horario", "agenda")) {
    const e = await emptySlotsToday(barbershopId);
    if (!e.totalFree) return "Sua agenda de hoje está cheia. 🔥";
    return `${e.totalFree} horários livres hoje: ${e.perStaff.map((s) => `${s.name.split(" ")[0]} (${s.free.slice(0, 4).join(", ")})`).join("; ")}.`;
  }
  if (has("melhor cliente", "top cliente", "fiel", "melhores clientes")) {
    const t = await topClients(barbershopId, 5);
    if (!t.length) return "Ainda não há atendimentos concluídos pra ranquear.";
    return "Melhores clientes: " + t.map((c, i) => `${i + 1}) ${c.name} — ${money(c.spent)} (${c.visits}x)`).join("; ");
  }
  if (has("barbeiro", "equipe", "ranking", "profissional")) {
    const b = await barberLeaderboard(barbershopId);
    if (!b.length) return "Nenhum barbeiro com atendimento no mês ainda.";
    return "No mês: " + b.map((x) => `${x.name} — ${money(x.revenue)} (${x.count}x${x.avgRating ? `, ⭐${x.avgRating.toFixed(1)}` : ""})`).join("; ");
  }
  if (has("estoque", "produto", "acabando", "repor")) {
    const s = await lowStock(barbershopId);
    if (!s.length) return "Estoque ok — nada no limite mínimo.";
    return "Acabando: " + s.map((p) => `${p.name} (${p.quantity})`).join(", ") + ".";
  }
  if (has("amanhã", "amanha", "confirmar", "confirmação")) {
    const t = await tomorrowAppointments(barbershopId);
    return `Amanhã: ${t.total} agendamentos, ${t.unconfirmed} sem confirmar. Toque em "Confirmar todos" pra reduzir falta.`;
  }
  return "Sou o Copiloto da sua barbearia. Pergunte, por exemplo: \"quanto faturei essa semana?\", \"quais clientes sumiram?\", \"tenho horário vazio hoje?\", \"como estão meus barbeiros?\" ou \"tem produto acabando?\".";
}

export function copilotSuggestions(role: CopilotRole): string[] {
  if (role === "BARBER") return ["Quanto vou receber esse mês?", "Quem é meu próximo cliente?", "Meus clientes sumidos"];
  return ["Quanto faturei essa semana?", "Quais clientes sumiram?", "Tenho horário vazio hoje?", "Como estão meus barbeiros?", "Tem produto acabando?"];
}

export function unavailableAiNote(): string {
  return assistantEnabled() ? "" : "Modo simulado (respostas prontas). Ative a IA para conversa livre.";
}

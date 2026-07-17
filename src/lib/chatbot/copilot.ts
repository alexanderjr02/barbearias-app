import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropicClient";
import { prisma } from "@/lib/db";
import { startOfUtcMonth, startOfUtcDay, addUtcDays } from "@/lib/dateRange";
import { assistantEnabled } from "./assistant";
import { buildDaySlots, validateRequestedSlot, timeToMinutes, minutesToTime, shopNow, OCCUPYING_STATUSES } from "@/lib/scheduling";
import { appointmentLimitError } from "@/lib/planLimits";
import { notifyClient } from "@/lib/gestorNotifications";
import { onSlotOpened } from "@/lib/copilot/autopilot";
import {
  revenueSummary,
  churnedClients,
  emptySlotsToday,
  topClients,
  barberLeaderboard,
  lowStock,
  tomorrowAppointments,
  buildBriefing,
  noShowRisk,
  churnRisk,
  busyDays,
  diagnose,
  goalProgress,
} from "@/lib/copilot/insights";
import { revenueLeak, closeMonth, agendaGaps, simulateDecision, suggestSchedule, closeCashbox, reputationSummary } from "@/lib/copilot/analytics";

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
    {
      name: "remember",
      description: "Guarda na memória de longo prazo um fato ou decisão importante do negócio (ex: 'o gestor quer focar nas terças', 'meta de faturamento é R$20mil/mês', 'não gosta de dar desconto'). Use quando o gestor tomar uma decisão, definir uma meta ou informar uma preferência que valha lembrar nas próximas conversas.",
      input_schema: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
    },
  ];
  const barberTools: Anthropic.Tool[] = [
    { name: "get_my_earnings", description: "Meus ganhos do mês: comissão, atendimentos, gorjetas.", input_schema: { type: "object", properties: {} } },
    { name: "get_next_client", description: "Meu próximo cliente com preferências e a receita do último corte.", input_schema: { type: "object", properties: {} } },
  ];
  const clientTools: Anthropic.Tool[] = [
    {
      name: "lookup_client",
      description: "Busca um cliente pelo nome e traz tudo que sabemos dele: preferências, receita do último corte, nº de visitas, quanto gasta, última visita e recados salvos. Use quando perguntarem sobre um cliente específico.",
      input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
    {
      name: "remember_client",
      description: "Salva um recado/observação sobre um cliente específico (ex: 'alérgico a tal produto', 'não gosta de conversa', 'sempre atrasa'). Busca o cliente pelo nome.",
      input_schema: { type: "object", properties: { name: { type: "string" }, note: { type: "string" } }, required: ["name", "note"] },
    },
  ];
  const gestorOps: Anthropic.Tool[] = [
    {
      name: "check_availability",
      description: "Consulta horários REALMENTE livres de um dia (por barbeiro). Use antes de agendar ou de sugerir horários.",
      input_schema: { type: "object", properties: { dateKey: { type: "string", description: "AAAA-MM-DD" }, serviceName: { type: "string" }, staffName: { type: "string", description: "opcional" } }, required: ["dateKey", "serviceName"] },
    },
    {
      name: "book_appointment",
      description: "Agenda um horário de verdade para um cliente. Só chame depois de ter nome, telefone, serviço, barbeiro, data e horário. Confirme com o gestor antes.",
      input_schema: { type: "object", properties: { clientName: { type: "string" }, clientPhone: { type: "string" }, serviceName: { type: "string" }, staffName: { type: "string" }, dateKey: { type: "string", description: "AAAA-MM-DD" }, time: { type: "string", description: "HH:MM" } }, required: ["clientName", "clientPhone", "serviceName", "staffName", "dateKey", "time"] },
    },
    {
      name: "find_appointments",
      description: "Lista próximos agendamentos (por telefone ou nome do cliente). Use antes de cancelar ou remarcar pra pegar o id.",
      input_schema: { type: "object", properties: { clientPhone: { type: "string" }, clientName: { type: "string" } } },
    },
    {
      name: "cancel_appointment",
      description: "Cancela um agendamento pelo id (obtido em find_appointments). Confirme antes.",
      input_schema: { type: "object", properties: { appointmentId: { type: "string" } }, required: ["appointmentId"] },
    },
    {
      name: "reschedule_appointment",
      description: "Remarca um agendamento existente (id) para nova data/horário. Confirme antes.",
      input_schema: { type: "object", properties: { appointmentId: { type: "string" }, dateKey: { type: "string", description: "AAAA-MM-DD" }, time: { type: "string", description: "HH:MM" } }, required: ["appointmentId", "dateKey", "time"] },
    },
    {
      name: "close_agenda",
      description: "Fecha a agenda (bloqueia atendimentos) num dia — para um barbeiro específico ou para a equipe toda. Confirme antes.",
      input_schema: { type: "object", properties: { dateKey: { type: "string", description: "AAAA-MM-DD" }, staffName: { type: "string", description: "opcional; se omitido, fecha pra todos" } }, required: ["dateKey"] },
    },
    {
      name: "add_transaction",
      description: "Lança uma receita ou despesa no financeiro. Confirme antes.",
      input_schema: { type: "object", properties: { type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "INCOME=receita, EXPENSE=despesa" }, amount: { type: "number" }, description: { type: "string" }, category: { type: "string" }, dateKey: { type: "string", description: "AAAA-MM-DD (opcional, padrão hoje)" } }, required: ["type", "amount"] },
    },
    {
      name: "restock_product",
      description: "Atualiza o estoque de um produto. mode 'add' soma à quantidade atual, 'set' define o total.",
      input_schema: { type: "object", properties: { productName: { type: "string" }, quantity: { type: "number" }, mode: { type: "string", enum: ["add", "set"] } }, required: ["productName", "quantity"] },
    },
    {
      name: "send_promo",
      description: "Envia uma mensagem de promoção (notificação no app) para um grupo de clientes. Confirme o texto e o público antes.",
      input_schema: { type: "object", properties: { message: { type: "string" }, segment: { type: "string", enum: ["all", "churned"], description: "all=todos com conta, churned=clientes sumidos" } }, required: ["message"] },
    },
  ];
  const gestorSmart: Anthropic.Tool[] = [
    { name: "get_no_show_risk", description: "Clientes com risco de FALTAR amanhã (têm histórico de no-show).", input_schema: { type: "object", properties: {} } },
    { name: "get_churn_risk", description: "Clientes prestes a sumir — atrasados em relação à própria frequência de visita (aja antes de perdê-los).", input_schema: { type: "object", properties: {} } },
    { name: "get_busy_days", description: "Dias da semana mais cheios e mais vazios (últimos 90 dias) — pra escalar equipe e promoções.", input_schema: { type: "object", properties: {} } },
    { name: "get_diagnosis", description: "Diagnóstico do negócio: compara os últimos 7 dias com os 7 anteriores e aponta a causa da queda/alta (barbeiro, no-show, folgas).", input_schema: { type: "object", properties: {} } },
    { name: "get_goal_progress", description: "Progresso da meta de faturamento do mês e quanto falta por dia.", input_schema: { type: "object", properties: {} } },
    { name: "set_goal", description: "Define a meta de faturamento do mês.", input_schema: { type: "object", properties: { amount: { type: "number" } }, required: ["amount"] } },
    { name: "set_automation", description: "Liga/desliga automações do auto-piloto. rule: 'confirm' (confirmar agendamentos), 'birthday' (msg de aniversário), 'winback' (chamar sumidos). Use enabled=false para desligar; para winback, days define há quantos dias.", input_schema: { type: "object", properties: { rule: { type: "string", enum: ["confirm", "birthday", "winback"] }, enabled: { type: "boolean" }, days: { type: "number" } }, required: ["rule"] } },
  ];
  // "10 segundos que valem horas ou dias" — análises pesadas que substituem
  // planilha, consultor e contador.
  const gestorPower: Anthropic.Tool[] = [
    { name: "get_revenue_leak", description: "AUDITORIA DE DINHEIRO PERDIDO: junta num relatório só onde o negócio está vazando R$ — clientes sumidos, no-shows do mês, horários vazios de hoje e estoque parado, com um total estimado. Use quando perguntarem 'onde estou perdendo dinheiro?', 'como faturar mais?' ou pra abrir os olhos do gestor.", input_schema: { type: "object", properties: {} } },
    { name: "close_month", description: "FECHA O MÊS: fechamento financeiro completo — faturamento, comissão de CADA barbeiro, receitas/despesas lançadas, gorjetas, imposto (ISS) estimado e o LUCRO. Use para 'fecha meu mês', 'quanto lucrei', 'quanto pagar de comissão'. monthOffset=-1 para o mês passado.", input_schema: { type: "object", properties: { monthOffset: { type: "number", description: "0=mês atual, -1=mês passado" } } } },
    { name: "get_agenda_gaps", description: "OTIMIZA A AGENDA: acha os buracos (tempo morto) entre atendimentos de cada barbeiro num dia e estima quanto isso custa. Use para 'otimiza minha agenda', 'onde tem tempo morto hoje'.", input_schema: { type: "object", properties: { dateKey: { type: "string", description: "AAAA-MM-DD (padrão hoje)" } } } },
    { name: "simulate", description: "SIMULADOR DE DECISÃO ('e se...?'): projeta o impacto ANTES de arriscar. type 'price' com pct (e serviceName opcional) simula mudar preço em %; type 'hire' simula contratar mais 1 barbeiro. Use para 'e se eu subir 10%?', 'vale a pena contratar?'.", input_schema: { type: "object", properties: { type: { type: "string", enum: ["price", "hire"] }, pct: { type: "number" }, serviceName: { type: "string" } }, required: ["type"] } },
    { name: "suggest_schedule", description: "MONTA A ESCALA DA SEMANA: recomenda quantos barbeiros por dia com base na demanda real dos últimos 90 dias. Use para 'monta a escala', 'como escalar a equipe'.", input_schema: { type: "object", properties: {} } },
    { name: "close_cashbox", description: "FECHA O CAIXA DO DIA: bate os valores informados (dinheiro/cartão/pix) com o que os atendimentos concluídos hoje somam e aponta sobra/falta. Use quando o gestor disser quanto fechou (ex: 'fechei com 840 em dinheiro e 1200 no cartão').", input_schema: { type: "object", properties: { cash: { type: "number" }, card: { type: "number" }, pix: { type: "number" } } } },
    { name: "get_reviews", description: "REPUTAÇÃO: nota média, distribuição de estrelas e as avaliações recentes com comentário. Use para 'como está minha reputação', 'me ajuda a responder as avaliações' — aí você redige a resposta de cada uma na voz da barbearia.", input_schema: { type: "object", properties: {} } },
  ];
  if (role === "BARBER") return [...barberTools, ...clientTools, ...read.filter((t) => ["get_churned_clients"].includes(t.name))];
  return [...read, ...clientTools, ...gestorActions, ...gestorAdmin, ...gestorOps, ...gestorSmart, ...gestorPower];
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

// ---- Per-client lookup + notes ----

async function resolveClient(barbershopId: string, name: string): Promise<{ id: string; name: string } | null> {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const appts = await prisma.appointment.findMany({
    where: { barbershopId, clientId: { not: null } },
    select: { clientId: true, clientName: true },
    orderBy: { date: "desc" },
    take: 400,
  });
  const seen = new Map<string, string>();
  for (const a of appts) if (a.clientId && !seen.has(a.clientId)) seen.set(a.clientId, a.clientName);
  const list = [...seen.entries()].map(([id, nm]) => ({ id, name: nm }));
  return (
    list.find((c) => c.name.toLowerCase() === n) ??
    list.find((c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())) ??
    null
  );
}

async function clientDossier(barbershopId: string, clientId: string, name: string) {
  const [prefs, recipe, appts, notes] = await Promise.all([
    prisma.clientPreferences.findUnique({ where: { clientId } }),
    prisma.appointment.findFirst({
      where: { clientId, barbershopId, OR: [{ recipeMachine: { not: null } }, { recipeFinish: { not: null } }, { recipeProducts: { not: null } }] },
      orderBy: { date: "desc" },
      select: { recipeMachine: true, recipeFinish: true, recipeProducts: true, recipeNotes: true },
    }),
    prisma.appointment.findMany({
      where: { clientId, barbershopId, status: "COMPLETED" },
      orderBy: { date: "desc" },
      select: { totalPrice: true, date: true, service: { select: { name: true } }, staff: { select: { name: true } } },
    }),
    prisma.copilotMemory.findMany({ where: { barbershopId, clientId }, orderBy: { createdAt: "desc" }, take: 10, select: { content: true } }),
  ]);
  type A = { totalPrice: number };
  const spent = appts.reduce((s: number, a: A) => s + a.totalPrice, 0);
  const last = appts[0];
  return {
    name,
    visits: appts.length,
    totalSpent: spent,
    lastVisit: last ? { date: last.date.toISOString().slice(0, 10), service: last.service?.name, staff: last.staff?.name } : null,
    preferences: prefs ? { machine: prefs.machine, products: prefs.products, allergies: prefs.allergies, drink: prefs.drink, chat: prefs.chat, notes: prefs.notes } : null,
    lastRecipe: recipe,
    notes: notes.map((n: { content: string }) => n.content),
  };
}

// ---- Long-term memory ----

async function rememberFact(barbershopId: string, content: string, source: string): Promise<void> {
  const c = content.trim().slice(0, 300);
  if (!c) return;
  const dup = await prisma.copilotMemory.findFirst({ where: { barbershopId, content: c } });
  if (dup) return; // don't pile up duplicates
  await prisma.copilotMemory.create({ data: { barbershopId, content: c, source } });
}

async function loadMemoryBlock(barbershopId: string): Promise<string> {
  const mems: { content: string }[] = await prisma.copilotMemory.findMany({
    where: { barbershopId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { content: true },
  });
  if (!mems.length) return "";
  return `\n\nO QUE VOCÊ JÁ SABE SOBRE ESTE NEGÓCIO (memória de conversas e decisões anteriores — leve em conta quando for relevante, sem repetir de propósito):\n${mems.reverse().map((m) => `• ${m.content}`).join("\n")}`;
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
      await rememberFact(barbershopId, `Serviço criado: ${created.name} (${created.duration}min, R$ ${created.price.toFixed(2)}).`, "action");
      return `Serviço criado: ${created.name}, ${created.duration}min, R$ ${created.price.toFixed(2)}.`;
    }
    case "update_service_price": {
      const svc = await resolveShopService(barbershopId, String(input.serviceName ?? ""));
      if (!svc) return "Serviço não encontrado.";
      const price = Number(input.price);
      if (!Number.isFinite(price) || price < 0) return "Preço inválido.";
      await prisma.service.update({ where: { id: svc.id }, data: { price } });
      await rememberFact(barbershopId, `Preço de ${svc.name} alterado para R$ ${price.toFixed(2)}.`, "action");
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
      await rememberFact(barbershopId, `Folga de ${st.name} marcada para ${dateKey}${reason ? ` (${reason})` : ""}.`, "action");
      return `Folga de ${st.name} marcada para ${dateKey}.`;
    }
    case "remember": {
      const note = String(input.note ?? "").trim();
      if (!note) return "Nada pra lembrar.";
      await rememberFact(barbershopId, note, "chat");
      return "Anotado na memória. Vou lembrar disso nas próximas conversas.";
    }
    case "lookup_client": {
      const client = await resolveClient(barbershopId, String(input.name ?? ""));
      if (!client) return "Não achei esse cliente na barbearia.";
      return JSON.stringify(await clientDossier(barbershopId, client.id, client.name));
    }
    case "remember_client": {
      const client = await resolveClient(barbershopId, String(input.name ?? ""));
      if (!client) return "Não achei esse cliente na barbearia.";
      const note = String(input.note ?? "").trim().slice(0, 300);
      if (!note) return "Nada pra anotar.";
      await prisma.copilotMemory.create({ data: { barbershopId, clientId: client.id, content: note, source: "chat" } });
      return `Anotado sobre ${client.name}: "${note}". Vou lembrar quando falarem dele.`;
    }
    case "check_availability": {
      const svc = await resolveShopService(barbershopId, String(input.serviceName ?? ""));
      if (!svc) return "Serviço não encontrado.";
      const service = await prisma.service.findUnique({ where: { id: svc.id }, select: { duration: true } });
      const dur = service?.duration ?? 30;
      const dateKey = String(input.dateKey ?? "");
      const staffList = input.staffName
        ? [await resolveShopStaff(barbershopId, String(input.staffName))].filter((s): s is { id: string; name: string } => !!s)
        : await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
      if (!staffList.length) return "Nenhum barbeiro disponível.";
      const lines: string[] = [];
      for (const st of staffList) {
        const { slots } = await buildDaySlots({ barbershopId, staffId: st.id, dateKey, durationMinutes: dur });
        const free = slots.filter((s) => s.status === "available").map((s) => s.time);
        lines.push(`${st.name}: ${free.length ? free.join(", ") : "sem horários"}`);
      }
      return `Disponibilidade em ${dateKey} para ${svc.name} (${dur}min):\n${lines.join("\n")}`;
    }
    case "book_appointment": {
      const svc = await resolveShopService(barbershopId, String(input.serviceName ?? ""));
      if (!svc) return "Serviço não encontrado.";
      const service = await prisma.service.findUnique({ where: { id: svc.id }, select: { duration: true, price: true } });
      const staff = await resolveShopStaff(barbershopId, String(input.staffName ?? ""));
      if (!staff) return "Barbeiro não encontrado.";
      const dateKey = String(input.dateKey ?? "");
      const time = String(input.time ?? "");
      const dur = service?.duration ?? 30;
      const endTime = minutesToTime(timeToMinutes(time) + dur);
      const slotError = await validateRequestedSlot({ barbershopId, staffId: staff.id, dateKey, startTime: time, endTime });
      if (slotError) return `Não foi possível agendar: ${slotError}`;
      const limitError = await appointmentLimitError(barbershopId);
      if (limitError) return `Não foi possível agendar: ${limitError}`;
      const appt = await prisma.appointment.create({
        data: { barbershopId, staffId: staff.id, serviceId: svc.id, date: new Date(dateKey), startTime: time, endTime, clientName: String(input.clientName ?? "").trim(), clientPhone: String(input.clientPhone ?? "").trim(), totalPrice: service?.price ?? 0, status: "SCHEDULED" },
      });
      return `Agendado! ${svc.name} com ${staff.name} em ${dateKey} às ${time}. Código: ${appt.id.slice(-6).toUpperCase()}.`;
    }
    case "find_appointments": {
      const now = shopNow();
      const phone = String(input.clientPhone ?? "").replace(/\D/g, "");
      const name = String(input.clientName ?? "").trim();
      if (phone.length < 8 && !name) return "Informe o telefone ou o nome do cliente.";
      const appts = await prisma.appointment.findMany({
        where: {
          barbershopId,
          status: { in: [...OCCUPYING_STATUSES] },
          date: { gte: new Date(now.dateKey) },
          ...(phone.length >= 8 ? { clientPhone: { contains: phone.slice(-8) } } : { clientName: { contains: name } }),
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 10,
        select: { id: true, date: true, startTime: true, clientName: true, service: { select: { name: true } }, staff: { select: { name: true } } },
      });
      type Row = (typeof appts)[number];
      if (!appts.length) return "Nenhum agendamento futuro encontrado.";
      return appts.map((a: Row) => `id ${a.id} — ${a.clientName}, ${a.date.toISOString().slice(0, 10)} ${a.startTime}, ${a.service?.name ?? "serviço"} com ${a.staff?.name ?? "barbeiro"}`).join("\n");
    }
    case "cancel_appointment": {
      const id = String(input.appointmentId ?? "");
      const appt = await prisma.appointment.findUnique({ where: { id }, select: { barbershopId: true, startTime: true, status: true, service: { select: { price: true } } } });
      if (!appt || appt.barbershopId !== barbershopId) return "Agendamento não encontrado.";
      if (appt.status !== "CANCELLED") {
        await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
        await onSlotOpened(barbershopId, { startTime: appt.startTime, price: appt.service?.price ?? null });
      }
      return `Agendamento das ${appt.startTime} cancelado.`;
    }
    case "reschedule_appointment": {
      const id = String(input.appointmentId ?? "");
      const appt = await prisma.appointment.findUnique({ where: { id }, select: { barbershopId: true, staffId: true, service: { select: { duration: true } } } });
      if (!appt || appt.barbershopId !== barbershopId) return "Agendamento não encontrado.";
      const dateKey = String(input.dateKey ?? "");
      const time = String(input.time ?? "");
      const dur = appt.service?.duration ?? 30;
      const endTime = minutesToTime(timeToMinutes(time) + dur);
      const slotError = await validateRequestedSlot({ barbershopId, staffId: appt.staffId, dateKey, startTime: time, endTime });
      if (slotError) return `Não foi possível remarcar: ${slotError}`;
      await prisma.appointment.update({ where: { id }, data: { date: new Date(dateKey), startTime: time, endTime } });
      return `Remarcado para ${dateKey} às ${time}.`;
    }
    case "close_agenda": {
      const dateKey = String(input.dateKey ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "Data inválida (use AAAA-MM-DD).";
      const staffName = input.staffName ? String(input.staffName) : "";
      let targets: { id: string; name: string }[];
      if (staffName) {
        const st = await resolveShopStaff(barbershopId, staffName);
        if (!st) return "Barbeiro não encontrado.";
        targets = [st];
      } else {
        targets = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
      }
      for (const t of targets) {
        await prisma.staffTimeOff.upsert({
          where: { staffId_date: { staffId: t.id, date: new Date(dateKey) } },
          update: { reason: "Agenda fechada" },
          create: { staffId: t.id, date: new Date(dateKey), reason: "Agenda fechada" },
        });
      }
      await rememberFact(barbershopId, `Agenda fechada em ${dateKey}${staffName ? ` (${staffName})` : " (equipe toda)"}.`, "action");
      return `Agenda fechada em ${dateKey}${staffName ? ` para ${staffName}` : " para toda a equipe"}.`;
    }
    case "add_transaction": {
      const type = String(input.type ?? "").toUpperCase();
      if (type !== "INCOME" && type !== "EXPENSE") return "Diga se é receita (INCOME) ou despesa (EXPENSE).";
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) return "Valor inválido.";
      const description = String(input.description ?? "").trim() || (type === "INCOME" ? "Receita" : "Despesa");
      const category = String(input.category ?? "").trim() || "Geral";
      const dk = String(input.dateKey ?? "");
      const date = /^\d{4}-\d{2}-\d{2}$/.test(dk) ? new Date(dk) : new Date(shopNow().dateKey);
      await prisma.financialTransaction.create({ data: { barbershopId, type, category, description, amount, date } });
      await rememberFact(barbershopId, `${type === "INCOME" ? "Receita" : "Despesa"} lançada: ${description} R$ ${amount.toFixed(2)}.`, "action");
      return `${type === "INCOME" ? "Receita" : "Despesa"} lançada: ${description} — R$ ${amount.toFixed(2)}.`;
    }
    case "restock_product": {
      const products: { id: string; name: string; quantity: number }[] = await prisma.product.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true, quantity: true } });
      const n = String(input.productName ?? "").trim().toLowerCase();
      const p = products.find((x) => x.name.toLowerCase() === n) ?? products.find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase()));
      if (!p) return "Produto não encontrado.";
      const qty = Number(input.quantity);
      if (!Number.isFinite(qty)) return "Quantidade inválida.";
      const mode = String(input.mode ?? "add");
      const newQty = mode === "set" ? Math.max(0, Math.round(qty)) : Math.max(0, p.quantity + Math.round(qty));
      await prisma.product.update({ where: { id: p.id }, data: { quantity: newQty } });
      return `Estoque de ${p.name}: ${p.quantity} → ${newQty}.`;
    }
    case "send_promo": {
      const message = String(input.message ?? "").trim();
      if (!message) return "Qual o texto da promoção?";
      const segment = String(input.segment ?? "all");
      let clientIds: string[] = [];
      if (segment === "churned") {
        const c = await churnedClients(barbershopId);
        clientIds = c.map((x) => x.clientId).filter((id): id is string => !!id);
      } else {
        const [links, apptClients] = await Promise.all([
          prisma.barbershopClient.findMany({ where: { barbershopId }, select: { userId: true } }),
          prisma.appointment.findMany({ where: { barbershopId, clientId: { not: null } }, select: { clientId: true }, distinct: ["clientId"] }),
        ]);
        const set = new Set<string>();
        for (const l of links as { userId: string }[]) set.add(l.userId);
        for (const a of apptClients as { clientId: string | null }[]) if (a.clientId) set.add(a.clientId);
        clientIds = [...set];
      }
      if (!clientIds.length) return "Nenhum cliente com conta pra receber a promoção.";
      for (const cid of clientIds) {
        await notifyClient(barbershopId, cid, "APPOINTMENT_CONFIRMED", "Promoção 💈", message, "/appointments");
      }
      return `Promoção enviada pra ${clientIds.length} cliente(s)${segment === "churned" ? " sumido(s)" : ""}.`;
    }
    case "get_no_show_risk":
      return JSON.stringify(await noShowRisk(barbershopId));
    case "get_churn_risk":
      return JSON.stringify(await churnRisk(barbershopId));
    case "get_busy_days":
      return JSON.stringify(await busyDays(barbershopId));
    case "get_diagnosis":
      return JSON.stringify(await diagnose(barbershopId));
    case "get_goal_progress":
      return JSON.stringify(await goalProgress(barbershopId));
    case "set_goal": {
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount < 0) return "Valor de meta inválido.";
      await prisma.barbershop.update({ where: { id: barbershopId }, data: { monthlyGoal: amount } });
      await rememberFact(barbershopId, `Meta de faturamento do mês: R$ ${amount.toFixed(2)}.`, "chat");
      return `Meta do mês definida em R$ ${amount.toFixed(2)}.`;
    }
    case "set_automation": {
      const rule = String(input.rule ?? "");
      const enabled = input.enabled !== false;
      if (rule === "confirm") {
        await prisma.barbershop.update({ where: { id: barbershopId }, data: { autoConfirm: enabled } });
        return `Confirmação automática de agendamentos ${enabled ? "LIGADA" : "desligada"}.`;
      }
      if (rule === "birthday") {
        await prisma.barbershop.update({ where: { id: barbershopId }, data: { autoBirthday: enabled } });
        return `Mensagem de aniversário automática ${enabled ? "LIGADA" : "desligada"}.`;
      }
      if (rule === "winback") {
        const days = Number(input.days);
        const val = input.enabled === false ? null : Number.isFinite(days) && days > 0 ? Math.round(days) : 45;
        await prisma.barbershop.update({ where: { id: barbershopId }, data: { autoWinbackDays: val } });
        return val ? `Win-back automático LIGADO (clientes sumidos há ${val}+ dias).` : "Win-back automático desligado.";
      }
      return "Regra desconhecida. Use: confirm, birthday ou winback.";
    }
    case "get_revenue_leak":
      return JSON.stringify(await revenueLeak(barbershopId));
    case "close_month":
      return JSON.stringify(await closeMonth(barbershopId, typeof input.monthOffset === "number" ? input.monthOffset : 0));
    case "get_agenda_gaps":
      return JSON.stringify(await agendaGaps(barbershopId, input.dateKey ? String(input.dateKey) : undefined));
    case "simulate":
      return JSON.stringify(await simulateDecision(barbershopId, { type: String(input.type ?? ""), pct: typeof input.pct === "number" ? input.pct : undefined, serviceName: input.serviceName ? String(input.serviceName) : undefined }));
    case "suggest_schedule":
      return JSON.stringify(await suggestSchedule(barbershopId));
    case "close_cashbox":
      return JSON.stringify(await closeCashbox(barbershopId, { cash: typeof input.cash === "number" ? input.cash : undefined, card: typeof input.card === "number" ? input.card : undefined, pix: typeof input.pix === "number" ? input.pix : undefined }));
    case "get_reviews":
      return JSON.stringify(await reputationSummary(barbershopId));
    default:
      return "Ferramenta desconhecida.";
  }
}

/** Runs the AI copilot loop. Only call when assistantEnabled(). */
export interface CopilotAction {
  id: string;
  label: string;
}

// Actions the Copiloto can propose as an inline button in the chat (instead of
// executing them itself). Keyed by the tool name the model calls.
const INLINE_ACTIONS: Record<string, string> = {
  confirm_tomorrow: "Confirmar agendamentos de amanhã",
  winback_churned: "Chamar clientes sumidos de volta",
  notify_waitlist: "Avisar fila de espera",
};

export async function runCopilot(
  role: CopilotRole,
  barbershopId: string,
  staffId: string | null,
  history: ChatTurn[],
): Promise<{ reply: string; actions: CopilotAction[] }> {
  const client = getAnthropic();
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });

  const shopName = shop?.name ?? "a barbearia";
  const persona =
    role === "BARBER"
      ? `Você é o Copiloto pessoal do barbeiro na ${shopName}. Ajuda ele a ganhar mais e atender melhor: acompanha ganhos e comissão, prepara o próximo cliente (lembrando preferências e a "receita" do último corte) e aponta clientes que sumiram pra ele reconquistar.`
      : `Você é o Copiloto de gestão do dono da ${shopName}, dentro do sistema CORTIX. Você raciocina como um consultor sênior de negócios e CRM de barbearias: pensa em retenção, recorrência, ticket médio, ocupação da agenda, no-show, LTV do cliente, fidelização e fluxo de caixa.`;

  const adminNote =
    role === "GESTOR"
      ? `\n\nVOCÊ OPERA O SISTEMA POR CONVERSA (execute quando o gestor pedir, confirmando os dados numa frase curta antes de agir):
- Agenda: AGENDAR (book_appointment — cheque antes com check_availability), CANCELAR (find_appointments → cancel_appointment), REMARCAR (find_appointments → reschedule_appointment), FECHAR a agenda de um dia (close_agenda, um barbeiro ou a equipe toda).
- Cadastro: criar serviço (create_service), mudar preço (update_service_price), marcar folga (set_day_off).
- Financeiro: lançar receita ou despesa (add_transaction).
- Estoque: repor/ajustar produto (restock_product).
- Marketing: enviar promoção pros clientes (send_promo — todos ou os sumidos). Escreva um texto curto e chamativo você mesmo e confirme antes de disparar.
- Inteligência: PREVER faltas de amanhã (get_no_show_risk) e clientes prestes a sumir (get_churn_risk); dias cheios/vazios (get_busy_days); DIAGNOSTICAR queda de faturamento e a causa (get_diagnosis); acompanhar a META do mês (get_goal_progress / set_goal).
- Superpoderes (o que levaria horas ou dias, você faz em segundos):
  • AUDITAR onde o dinheiro está vazando (get_revenue_leak) — sumidos, no-shows, horários vazios, estoque parado, com total em R$.
  • FECHAR O MÊS (close_month) — faturamento, comissão de cada barbeiro, despesas, gorjetas, imposto e lucro.
  • OTIMIZAR a agenda achando tempo morto (get_agenda_gaps).
  • SIMULAR decisões antes de arriscar (simulate) — subir preço X%, contratar mais um barbeiro.
  • MONTAR a escala da semana pela demanda real (suggest_schedule).
  • FECHAR O CAIXA do dia batendo os valores (close_cashbox).
  • REPUTAÇÃO: ver nota e avaliações (get_reviews) e REDIGIR a resposta de cada avaliação na voz da barbearia — agradeça as boas, e nas ruins peça desculpa, resolva e convide a voltar. Entregue o texto pronto pra copiar.
  Quando o gestor pedir "por que caiu / como faturar mais / onde perco dinheiro", combine get_diagnosis + get_revenue_leak e entregue um PLANO curto de ação (o que fazer hoje, amanhã, esta semana) — e ofereça executar (tocar nas ações). Aja como consultor: número → causa → o que fazer.
- Auto-piloto: ligar/desligar automações que rodam sozinhas (set_automation): confirmação de agendamentos, mensagem de aniversário e win-back de sumidos.
- Sempre converta datas relativas ("amanhã", "sexta") para AAAA-MM-DD. Nunca invente horário — use check_availability. Confirme antes de qualquer ação que grava ("Confirmo: agendar João, Corte, com o Thalles, amanhã 14h?").`
      : "";

  const system = `${persona}

Hoje é ${shopNow().dateKey} (use para converter datas relativas como "amanhã", "sexta").

COMO VOCÊ FALA
- Direto, esperto e humano — como um sócio que manja do negócio, nunca um robô. Vá ao ponto.
- Nunca repita a pergunta nem enrole ("Claro!", "Com certeza!"). Comece pela resposta.
- Frases curtas. Termine com uma recomendação prática de 1 linha ("O que eu faria: ...") sempre que fizer sentido.
- Se os dados mostrarem um problema (muitos sumidos, agenda vazia, no-show alto, queda no faturamento), aponte sem esperar perguntarem.

FORMATO (importante — a resposta aparece num balão de chat)
- Texto limpo e natural. NUNCA use markdown: nada de **negrito**, ##títulos ou listas com "-".
- Se precisar enumerar, use "•" e no máximo 3–4 itens curtos.
- Valores sempre em R$ e variações em %. Seja econômico: 2–5 frases na maioria das respostas.

DADOS E AÇÕES
- Use as ferramentas para números reais — nunca invente. Se faltar dado, diga o que precisa.
- Para avisos em massa (confirmar amanhã, chamar sumidos, avisar fila), NÃO execute no chat: oriente a tocar no botão da ação no painel.${adminNote}`;

  const fullSystem = system + (await loadMemoryBlock(barbershopId));
  const messages: Anthropic.MessageParam[] = history.slice(-16).map((m) => ({ role: m.role, content: m.content }));
  const tools = toolsFor(role);
  const actions: CopilotAction[] = [];

  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({ model: MODEL, max_tokens: 1024, system: fullSystem, tools, messages });
    if (response.stop_reason !== "tool_use") {
      const reply = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim() || "Pode reformular?";
      return { reply, actions };
    }
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        let out: string;
        // Action tools become inline buttons instead of running in the chat.
        if (block.name in INLINE_ACTIONS) {
          if (!actions.some((a) => a.id === block.name)) actions.push({ id: block.name, label: INLINE_ACTIONS[block.name] });
          out = "Botão exibido pro usuário. Diga em 1 frase curta que é só tocar no botão abaixo pra executar.";
        } else {
          try {
            out = await runCopilotTool(role, barbershopId, staffId, block.name, block.input as Record<string, unknown>);
          } catch (e) {
            out = `Erro: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        results.push({ type: "tool_result", tool_use_id: block.id, content: out });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "Não consegui concluir agora. Pode tentar de novo?", actions };
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

function timeGreeting(): string {
  const h = (new Date().getUTCHours() - 3 + 24) % 24; // BRT aproximado
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/// A short, natural-language opener written by the AI from real data — the
/// "abrir o app e ele já te conhecer". Falls back to a deterministic line when
/// there's no key.
export async function copilotGreeting(
  role: CopilotRole,
  barbershopId: string,
  staffId: string | null,
): Promise<{ greeting: string; aiPowered: boolean }> {
  const g = timeGreeting();
  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });
  const shopName = shop?.name ?? "a barbearia";

  let facts: string;
  let fallback: string;

  if (role === "BARBER") {
    const e = staffId ? await barberEarnings(staffId) : null;
    const n = staffId ? await nextClient(staffId) : null;
    facts = e
      ? `Comissão no mês: ${money(e.commission)} em ${e.completed} atendimentos. Gorjetas: ${money(e.tips)}. Próximo cliente: ${n ? `${n.name} às ${n.time} (${n.service ?? "serviço"})` : "nenhum na agenda"}.`
      : "Sem dados de barbeiro.";
    fallback = `${g}! ${e && e.completed > 0 ? `Você já fez ${e.completed} atendimentos esse mês (${money(e.commission)} de comissão).` : "Bora fazer o dia render."}${n ? ` Seu próximo é ${n.name} às ${n.time}.` : ""}`.trim();
  } else {
    const b = await buildBriefing(barbershopId);
    const delta = b.revenue.weekDeltaPercent == null ? "" : ` (${b.revenue.weekDeltaPercent >= 0 ? "+" : ""}${b.revenue.weekDeltaPercent.toFixed(0)}% vs semana anterior)`;
    facts = `Faturamento dos últimos 7 dias: ${money(b.revenue.thisWeek)}${delta}. Clientes sumidos (+45 dias): ${b.churnedCount}. Horários livres hoje: ${b.emptyToday}. Agendamentos de amanhã sem confirmar: ${b.tomorrowUnconfirmed}. Produtos acabando: ${b.lowStockCount}.`;
    const bits = [`${g}! Nos últimos 7 dias você faturou ${money(b.revenue.thisWeek)}${delta}.`];
    const probs: string[] = [];
    if (b.churnedCount > 0) probs.push(`${b.churnedCount} clientes sumidos`);
    if (b.emptyToday > 0) probs.push(`${b.emptyToday} horários livres hoje`);
    if (b.tomorrowUnconfirmed > 0) probs.push(`${b.tomorrowUnconfirmed} agendamentos de amanhã sem confirmar`);
    if (probs.length) bits.push(`Atenção: ${probs.join(", ")}. Quer que eu ajude a resolver?`);
    else bits.push("Tá tudo em dia por aqui. 👏");
    fallback = bits.join(" ");
  }

  if (!assistantEnabled()) return { greeting: fallback, aiPowered: false };

  try {
    const client = getAnthropic();
    const sys = `Você é o Copiloto da ${shopName}, consultor de negócios de barbearia (CRM, retenção, agenda, no-show). Escreva UMA saudação de abertura curta (2 a 3 frases), começando com "${g}", em português do Brasil, tom esperto e humano. Destaque o mais importante dos dados e, se houver problema, termine convidando a agir ("quer que eu ajude a resolver?"). Texto limpo, SEM markdown (sem **, sem listas). Responda só com a saudação.`;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: sys,
      messages: [{ role: "user", content: `Dados de hoje: ${facts}` }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
    return { greeting: text || fallback, aiPowered: true };
  } catch {
    return { greeting: fallback, aiPowered: false };
  }
}

export function copilotSuggestions(role: CopilotRole): string[] {
  if (role === "BARBER") return ["Quanto vou receber esse mês?", "Quem é meu próximo cliente?", "Meus clientes sumidos"];
  return ["Onde estou perdendo dinheiro?", "Fecha o meu mês", "Otimiza minha agenda de hoje", "E se eu subir os preços 10%?", "Monta a escala da semana"];
}

export function unavailableAiNote(): string {
  return assistantEnabled() ? "" : "Modo simulado (respostas prontas). Ative a IA para conversa livre.";
}

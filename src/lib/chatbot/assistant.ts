import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropicClient";
import { prisma } from "@/lib/db";
import { buildDaySlots, validateRequestedSlot, timeToMinutes, minutesToTime, shopNow, OCCUPYING_STATUSES } from "@/lib/scheduling";
import { appointmentLimitError } from "@/lib/planLimits";

// Model is overridable so the shop owner can trade cost for latency (e.g. set
// CHATBOT_MODEL=claude-haiku-4-5). Defaults to the most capable model.
const MODEL = process.env.CHATBOT_MODEL || "claude-opus-4-8";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** The AI assistant only runs when an Anthropic API key is configured; without
 * it the chatbot route falls back to canned answers. */
export function assistantEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const tools: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description: "Consulta horários livres de verdade para um dia. Use antes de oferecer horários. Retorna os horários disponíveis por barbeiro.",
    input_schema: {
      type: "object",
      properties: {
        dateKey: { type: "string", description: "Data no formato AAAA-MM-DD" },
        serviceName: { type: "string", description: "Nome do serviço desejado (define a duração)" },
        staffName: { type: "string", description: "Nome do barbeiro (opcional; se omitido, consulta todos)" },
      },
      required: ["dateKey", "serviceName"],
    },
  },
  {
    name: "book_appointment",
    description: "Cria um agendamento de verdade. Só chame depois de ter nome, telefone, serviço, barbeiro, data e horário confirmados com o cliente.",
    input_schema: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        clientPhone: { type: "string" },
        serviceName: { type: "string" },
        staffName: { type: "string" },
        dateKey: { type: "string", description: "AAAA-MM-DD" },
        time: { type: "string", description: "HH:MM" },
      },
      required: ["clientName", "clientPhone", "serviceName", "staffName", "dateKey", "time"],
    },
  },
  {
    name: "find_appointments",
    description: "Lista os próximos agendamentos de um cliente pelo telefone. Use antes de cancelar ou reagendar.",
    input_schema: {
      type: "object",
      properties: { clientPhone: { type: "string" } },
      required: ["clientPhone"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancela um agendamento pelo id (obtido em find_appointments). Confirme com o cliente antes.",
    input_schema: {
      type: "object",
      properties: { appointmentId: { type: "string" } },
      required: ["appointmentId"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Reagenda um agendamento existente para nova data/horário. Confirme com o cliente antes.",
    input_schema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        dateKey: { type: "string", description: "AAAA-MM-DD" },
        time: { type: "string", description: "HH:MM" },
      },
      required: ["appointmentId", "dateKey", "time"],
    },
  },
  {
    name: "join_waitlist",
    description: "Coloca o cliente na fila de espera quando não há horário disponível. Ele será avisado quando abrir uma vaga. Colete nome e telefone antes.",
    input_schema: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        clientPhone: { type: "string" },
      },
      required: ["clientName", "clientPhone"],
    },
  },
];

interface ServiceRow { id: string; name: string; duration: number; price: number }
interface StaffRow { id: string; name: string }

async function resolveService(barbershopId: string, name: string): Promise<ServiceRow | null> {
  const services: ServiceRow[] = await prisma.service.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true, duration: true, price: true } });
  const n = name.trim().toLowerCase();
  return services.find((s) => s.name.toLowerCase() === n) ?? services.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) ?? null;
}

async function resolveStaff(barbershopId: string, name?: string): Promise<StaffRow | null> {
  const staff: StaffRow[] = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
  if (!name) return staff[0] ?? null;
  const n = name.trim().toLowerCase();
  return staff.find((s) => s.name.toLowerCase() === n) ?? staff.find((s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())) ?? null;
}

async function runTool(barbershopId: string, name: string, input: Record<string, unknown>): Promise<string> {
  if (name === "check_availability") {
    const service = await resolveService(barbershopId, String(input.serviceName ?? ""));
    if (!service) return "Serviço não encontrado. Liste os serviços disponíveis para o cliente.";
    const dateKey = String(input.dateKey ?? "");
    const staff: StaffRow[] = input.staffName
      ? [await resolveStaff(barbershopId, String(input.staffName))].filter(Boolean) as StaffRow[]
      : await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
    if (staff.length === 0) return "Nenhum barbeiro disponível.";
    const lines: string[] = [];
    for (const st of staff) {
      const { slots } = await buildDaySlots({ barbershopId, staffId: st.id, dateKey, durationMinutes: service.duration });
      const free = slots.filter((s) => s.status === "available").map((s) => s.time);
      lines.push(`${st.name}: ${free.length ? free.join(", ") : "sem horários"}`);
    }
    return `Disponibilidade em ${dateKey} para ${service.name} (${service.duration}min):\n${lines.join("\n")}`;
  }

  if (name === "book_appointment") {
    const service = await resolveService(barbershopId, String(input.serviceName ?? ""));
    if (!service) return "Serviço não encontrado.";
    const staff = await resolveStaff(barbershopId, String(input.staffName ?? ""));
    if (!staff) return "Barbeiro não encontrado.";
    const dateKey = String(input.dateKey ?? "");
    const time = String(input.time ?? "");
    const endTime = minutesToTime(timeToMinutes(time) + service.duration);
    const slotError = await validateRequestedSlot({ barbershopId, staffId: staff.id, dateKey, startTime: time, endTime });
    if (slotError) return `Não foi possível agendar: ${slotError}`;
    const limitError = await appointmentLimitError(barbershopId);
    if (limitError) return `Não foi possível agendar: ${limitError}`;
    const appt = await prisma.appointment.create({
      data: {
        barbershopId,
        staffId: staff.id,
        serviceId: service.id,
        date: new Date(dateKey),
        startTime: time,
        endTime,
        clientName: String(input.clientName ?? "").trim(),
        clientPhone: String(input.clientPhone ?? "").trim(),
        totalPrice: service.price,
        status: "SCHEDULED",
      },
    });
    return `Agendado com sucesso! ${service.name} com ${staff.name} em ${dateKey} às ${time}. Código: ${appt.id.slice(-6).toUpperCase()}.`;
  }

  if (name === "find_appointments") {
    const phone = String(input.clientPhone ?? "").replace(/\D/g, "");
    if (phone.length < 8) return "Telefone inválido.";
    const now = shopNow();
    const appts = await prisma.appointment.findMany({
      where: { barbershopId, clientPhone: { contains: phone.slice(-8) }, status: { in: [...OCCUPYING_STATUSES] }, date: { gte: new Date(now.dateKey) } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 10,
      select: { id: true, date: true, startTime: true, service: { select: { name: true } }, staff: { select: { name: true } } },
    });
    if (appts.length === 0) return "Nenhum agendamento futuro encontrado para esse telefone.";
    return appts
      .map((a: { id: string; date: Date; startTime: string; service: { name: string } | null; staff: { name: string } | null }) =>
        `id ${a.id} — ${a.date.toISOString().slice(0, 10)} ${a.startTime}, ${a.service?.name ?? "serviço"} com ${a.staff?.name ?? "barbeiro"}`)
      .join("\n");
  }

  if (name === "cancel_appointment") {
    const id = String(input.appointmentId ?? "");
    const appt = await prisma.appointment.findUnique({ where: { id }, select: { barbershopId: true, status: true } });
    if (!appt || appt.barbershopId !== barbershopId) return "Agendamento não encontrado.";
    await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
    return "Agendamento cancelado com sucesso.";
  }

  if (name === "join_waitlist") {
    const clientName = String(input.clientName ?? "").trim();
    const clientPhone = String(input.clientPhone ?? "").trim();
    if (!clientName || clientPhone.replace(/\D/g, "").length < 8) return "Preciso do nome e de um telefone válido para entrar na fila.";
    await prisma.waitlistEntry.create({ data: { barbershopId, clientName, clientPhone, status: "WAITING" } });
    return `Pronto, ${clientName.split(" ")[0]} entrou na fila de espera! Vamos avisar assim que abrir um horário.`;
  }

  if (name === "reschedule_appointment") {
    const id = String(input.appointmentId ?? "");
    const appt = await prisma.appointment.findUnique({ where: { id }, select: { barbershopId: true, staffId: true, service: { select: { duration: true } } } });
    if (!appt || appt.barbershopId !== barbershopId) return "Agendamento não encontrado.";
    const dateKey = String(input.dateKey ?? "");
    const time = String(input.time ?? "");
    const duration = appt.service?.duration ?? 30;
    const endTime = minutesToTime(timeToMinutes(time) + duration);
    const slotError = await validateRequestedSlot({ barbershopId, staffId: appt.staffId, dateKey, startTime: time, endTime });
    if (slotError) return `Não foi possível reagendar: ${slotError}`;
    await prisma.appointment.update({ where: { id }, data: { date: new Date(dateKey), startTime: time, endTime } });
    return `Reagendado para ${dateKey} às ${time}.`;
  }

  return "Ferramenta desconhecida.";
}

function textFrom(content: Anthropic.ContentBlock[]): string {
  return content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
}

/** Runs the agentic tool loop and returns the assistant's final reply text.
 * `clientContext`, when provided (logged-in client), personalizes the bot so it
 * greets by name, remembers past visits/preferences and pre-fills bookings. */
export async function runAssistant(barbershopId: string, history: ChatTurn[], clientContext?: string): Promise<string> {
  const client = getAnthropic();

  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true, faqText: true } });
  const services: ServiceRow[] = await prisma.service.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true, duration: true, price: true } });
  const staff: StaffRow[] = await prisma.staff.findMany({ where: { barbershopId, isActive: true }, select: { id: true, name: true } });
  const now = shopNow();

  const serviceList = services.map((s) => `- ${s.name}: R$ ${s.price.toFixed(2)} (${s.duration}min)`).join("\n") || "- (nenhum serviço cadastrado)";
  const staffList = staff.map((s) => `- ${s.name}`).join("\n") || "- (nenhum barbeiro cadastrado)";

  const system = `Você é o assistente virtual da barbearia "${shop?.name ?? "nossa barbearia"}". Fale em português do Brasil, simpático mas direto e objetivo — como um recepcionista esperto, não um robô. Hoje é ${now.dateKey}.

FORMATO (a resposta aparece num balão de chat): texto limpo, sem markdown — nada de **negrito**, ## ou listas com "-". Se listar serviços/horários, use "•" e vá direto. Respostas curtas (2–5 frases). Comece pela resposta, sem "Claro!" nem repetir a pergunta.

Você pode AGENDAR, REAGENDAR e CANCELAR de verdade, além de tirar dúvidas. Use as ferramentas para dados reais — nunca invente horários ou preços.

Serviços:
${serviceList}

Barbeiros:
${staffList}
${shop?.faqText ? `\nInformações e regras desta barbearia (use para responder dúvidas específicas; se a resposta estiver aqui, siga à risca):\n${shop.faqText}\n` : ""}${clientContext ? `\nSOBRE O CLIENTE COM QUEM VOCÊ ESTÁ FALANDO (use pra personalizar — chame pelo primeiro nome, lembre do histórico e ofereça repetir o de sempre; ao agendar, use estes dados sem pedir de novo):\n${clientContext}\n` : ""}
Regras:
- Para oferecer horários, sempre use check_availability (não invente).
- Antes de agendar, colete nome e telefone/WhatsApp do cliente e confirme serviço, barbeiro, data e horário.
- Datas relativas ("amanhã", "sábado") converta para AAAA-MM-DD a partir de hoje (${now.dateKey}).
- Para cancelar/reagendar, primeiro use find_appointments com o telefone do cliente para achar o id.
- Quando NÃO houver horário no dia desejado, ofereça a fila de espera (join_waitlist) além de sugerir outro dia.
- Faça upsell com naturalidade: se o cliente marcar só corte, ofereça o combo corte + barba quando existir; nunca force.
- Se a resposta estiver nas informações da barbearia acima, use-a.
- Se algo não for possível (horário ocupado, fora do expediente), explique com gentileza e ofereça alternativas.
- Respostas curtas, no máximo alguns parágrafos.`;

  const messages: Anthropic.MessageParam[] = history.slice(-20).map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return textFrom(response.content) || "Desculpe, pode reformular?";
    }

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        let out: string;
        try {
          out = await runTool(barbershopId, block.name, block.input as Record<string, unknown>);
        } catch (e) {
          out = `Erro ao executar: ${e instanceof Error ? e.message : String(e)}`;
        }
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: out });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Desculpe, não consegui concluir agora. Pode tentar novamente?";
}

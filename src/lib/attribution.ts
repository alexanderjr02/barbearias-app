import { prisma } from "./db";
import { normalizePhone, phoneKey } from "./phone";
import { sendCtwaEvent } from "./metaCapi";

// Bloco de origem que a Meta anexa à PRIMEIRA mensagem de uma conversa iniciada
// por anúncio clique-pro-WhatsApp. Vem em value.messages[0].referral. O payload
// inteiro já chega no webhook — só não era lido.
export interface WaReferral {
  source_type?: string;
  source_id?: string;
  source_url?: string;
  headline?: string;
  body?: string;
  media_type?: string;
  ctwa_clid?: string;
}

// Captura/atualiza o lead no contato pelo WhatsApp. É o coração da Onda 1:
// transforma "chegou uma mensagem" em "chegou um lead, deste canal".
//
// Atribuição de PRIMEIRO TOQUE + best-effort: na criação grava a origem; em
// contatos seguintes só atualiza lastSeenAt. Exceção única: se o lead nasceu
// UNKNOWN e depois chega um referral de anúncio, promovemos a origem (é o
// primeiro sinal real de campanha) — nunca o contrário.
export async function captureWhatsappLead(
  barbershopId: string,
  from: string,
  referral?: WaReferral | null,
): Promise<void> {
  const key = phoneKey(from);
  if (!key) return;

  const origin = referral
    ? {
        channel: "CTWA",
        campaign: referral.headline ?? referral.source_id ?? null,
        ctwaClid: referral.ctwa_clid ?? null,
        sourceId: referral.source_id ?? null,
        sourceUrl: referral.source_url ?? null,
        adHeadline: referral.headline ?? null,
      }
    : { channel: "UNKNOWN" };

  const existing = await prisma.lead.findUnique({
    where: { barbershopId_phoneKey: { barbershopId, phoneKey: key } },
    select: { id: true, channel: true },
  });

  if (!existing) {
    // Novo vs. recorrente NO MOMENTO da captura: este telefone já aparece em
    // algum agendamento da loja? Usa a mesma chave de últimos-8 do resto do app.
    const priorAppointment = await prisma.appointment.findFirst({
      where: { barbershopId, clientPhone: { contains: key } },
      select: { id: true },
    });
    await prisma.lead.create({
      data: {
        barbershopId,
        phone: normalizePhone(from),
        phoneKey: key,
        isNewClient: !priorAppointment,
        ...origin,
      },
    });
    return;
  }

  await prisma.lead.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: new Date(),
      // Só promove a origem se ainda era desconhecida e agora veio um anúncio.
      ...(referral && existing.channel === "UNKNOWN" ? origin : {}),
    },
  });
}

// Ordem do funil. Só avançamos PARA A FRENTE — reprocessar um agendamento não
// pode fazer um lead que já compareceu voltar para "agendou".
const STAGE_RANK: Record<string, number> = { NEW: 0, SCHEDULED: 1, SHOWED: 2, RETURNING: 3, LOST: 0 };

type LeadStage = "SCHEDULED" | "SHOWED" | "RETURNING" | "LOST";

const VALID_CHANNELS = new Set(["CTWA", "GOOGLE", "GBP", "INSTAGRAM", "REFERRAL", "ORGANIC", "UNKNOWN"]);

// Sanitiza o canal vindo de fonte externa (querystring de link rastreado) —
// nunca grava lixo no banco. Qualquer coisa fora da lista vira UNKNOWN.
export function normalizeChannel(raw: string | null | undefined): string {
  const c = (raw ?? "").trim().toUpperCase();
  return VALID_CHANNELS.has(c) ? c : "UNKNOWN";
}

// Avança o funil do lead quando o cliente agenda / comparece. É o que liga
// "chegou um lead" a "esse lead virou dinheiro". Best-effort e idempotente:
// - se o lead já existe (veio do WhatsApp), avança o stage e vincula o clientId;
// - se NÃO existe (cliente que agendou sem nunca ter mandado mensagem — ex.:
//   página pública), cria com origem UNKNOWN para o funil não ficar cego.
export async function advanceLead(
  barbershopId: string,
  phone: string | null | undefined,
  stage: LeadStage,
  extra?: {
    clientId?: string | null;
    scheduledAt?: Date;
    showedAt?: Date;
    // Valor do atendimento (para o evento Purchase da Meta, quando compareceu).
    value?: number;
    // Origem de um link/QR rastreado (ex.: agendou pela pagina publica vinda de
    // um QR do Google). Aplica atribuicao de primeiro toque, igual ao WhatsApp.
    origin?: { channel?: string | null; campaign?: string | null };
  },
): Promise<void> {
  const key = phoneKey(phone);
  if (!key) return;

  const originChannel = extra?.origin ? normalizeChannel(extra.origin.channel) : null;
  const originCampaign = extra?.origin?.campaign?.trim() || null;

  const existing = await prisma.lead.findUnique({
    where: { barbershopId_phoneKey: { barbershopId, phoneKey: key } },
    select: { id: true, stage: true, channel: true, ctwaClid: true },
  });

  if (!existing) {
    await prisma.lead.create({
      data: {
        barbershopId,
        phone: normalizePhone(phone),
        phoneKey: key,
        channel: originChannel ?? "UNKNOWN",
        campaign: originCampaign,
        stage,
        isNewClient: !extra?.clientId ? true : undefined,
        clientId: extra?.clientId ?? undefined,
        scheduledAt: extra?.scheduledAt,
        showedAt: extra?.showedAt,
      },
    });
    return;
  }

  // Primeiro toque: só promove a origem se o lead ainda era UNKNOWN e agora veio
  // um canal identificado. Nunca sobrescreve uma origem que já era conhecida.
  const promote = existing.channel === "UNKNOWN" && !!originChannel && originChannel !== "UNKNOWN";

  const forward = (STAGE_RANK[stage] ?? 0) > (STAGE_RANK[existing.stage] ?? 0);
  await prisma.lead.update({
    where: { id: existing.id },
    data: {
      ...(forward ? { stage } : {}),
      lastSeenAt: new Date(),
      ...(promote ? { channel: originChannel, ...(originCampaign ? { campaign: originCampaign } : {}) } : {}),
      ...(extra?.clientId ? { clientId: extra.clientId } : {}),
      ...(extra?.scheduledAt ? { scheduledAt: extra.scheduledAt } : {}),
      ...(extra?.showedAt ? { showedAt: extra.showedAt } : {}),
    },
  });

  // Onda 3: devolve o evento de conversão à Meta (CAPI), só para lead de anúncio
  // (CTWA) com click id. Best-effort — inerte sem credenciais.
  if (existing.channel === "CTWA" && existing.ctwaClid) {
    await syncMetaConversions(existing.id, { value: extra?.value }).catch((e) =>
      console.error("[attribution] syncMetaConversions", e),
    );
  }
}

// Devolve à Meta os eventos de conversão pendentes de um lead de anúncio (CTWA),
// sem repetir (os campos meta*SentAt guardam o que já foi). Best-effort: uma
// falha aqui nunca afeta agendamento nem atendimento.
export async function syncMetaConversions(leadId: string, opts?: { value?: number }): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      channel: true,
      ctwaClid: true,
      scheduledAt: true,
      showedAt: true,
      metaScheduleSentAt: true,
      metaPurchaseSentAt: true,
    },
  });
  if (!lead || lead.channel !== "CTWA" || !lead.ctwaClid) return;

  const patch: { metaScheduleSentAt?: Date; metaPurchaseSentAt?: Date } = {};

  if (lead.scheduledAt && !lead.metaScheduleSentAt) {
    const r = await sendCtwaEvent({ eventName: "Schedule", ctwaClid: lead.ctwaClid, eventTimeMs: lead.scheduledAt.getTime() });
    if (r.ok) patch.metaScheduleSentAt = new Date();
  }
  if (lead.showedAt && !lead.metaPurchaseSentAt) {
    const r = await sendCtwaEvent({
      eventName: "Purchase",
      ctwaClid: lead.ctwaClid,
      eventTimeMs: lead.showedAt.getTime(),
      value: opts?.value,
    });
    if (r.ok) patch.metaPurchaseSentAt = new Date();
  }

  if (patch.metaScheduleSentAt || patch.metaPurchaseSentAt) {
    await prisma.lead.update({ where: { id: leadId }, data: patch });
  }
}

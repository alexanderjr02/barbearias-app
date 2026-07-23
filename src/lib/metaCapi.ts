// Conversions API da Meta para anúncios clique-pro-WhatsApp (CTWA). Devolve à
// Meta os eventos de FUNDO de funil (agendou/compareceu), amarrados ao
// ctwa_clid que guardamos no lead. É o que faz a Meta otimizar por quem VIRA
// cliente, não por quem só inicia conversa — barateia a campanha ao longo do
// tempo. Praticamente nenhuma agência pequena faz isso, porque quase nenhuma
// tem o dado do funil inteiro. O CORTIX tem.
//
// INERTE POR PADRÃO: sem META_CAPI_TOKEN + META_DATASET_ID, apenas registra em
// log (modo simulado, o mesmo padrão do app antes de cada credencial). Assim dá
// para mergear/subir sem risco; passa a disparar de verdade quando a Meta for
// configurada.
//
// Credenciais (env):
//   META_CAPI_TOKEN   — System User access token com permissão na dataset.
//   META_DATASET_ID   — id da dataset (Events Manager) ligada à conta de anúncio.
//   META_WABA_ID      — (opcional) WhatsApp Business Account id, vai em user_data.
//   META_GRAPH_VERSION— (opcional) versão da Graph API. Default v21.0.

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export function metaCapiEnabled(): boolean {
  return !!(process.env.META_CAPI_TOKEN && process.env.META_DATASET_ID);
}

export interface CtwaEventInput {
  eventName: "Schedule" | "Purchase";
  ctwaClid: string;
  eventTimeMs?: number;
  value?: number;
  currency?: string;
}

// Envia UM evento de conversão para a Meta. Best-effort: nunca lança — devolve
// { ok } para quem chamar decidir se marca como enviado.
export async function sendCtwaEvent(input: CtwaEventInput): Promise<{ ok: boolean; simulated?: boolean; error?: string }> {
  const token = process.env.META_CAPI_TOKEN;
  const datasetId = process.env.META_DATASET_ID;
  const wabaId = process.env.META_WABA_ID;

  if (!token || !datasetId) {
    // Modo simulado — não chama a Meta, só deixa rastro para depuração.
    console.log(`[meta-capi] simulado ${input.eventName} clid=${input.ctwaClid.slice(0, 8)}…`);
    return { ok: true, simulated: true };
  }

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor((input.eventTimeMs ?? Date.now()) / 1000),
    action_source: "business_messaging",
    messaging_channel: "whatsapp",
    user_data: {
      ...(wabaId ? { whatsapp_business_account_id: wabaId } : {}),
      ctwa_clid: input.ctwaClid,
    },
  };
  if (input.value != null) {
    event.custom_data = { currency: input.currency ?? "BRL", value: input.value };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event] }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Helpers da conexão de WhatsApp por barbearia — verificação contra a Meta e
// troca do código do Embedded Signup por um token. Separado das rotas para o
// teste e a leitura ficarem simples.

const GRAPH_BASE = "https://graph.facebook.com";
const VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

// Confirma que o par (token, phoneNumberId) é válido de verdade, perguntando à
// Meta o número legível daquele phone_number_id. Se responder, as credenciais
// prestam — e ainda ganhamos o número pra mostrar no painel. Serve tanto pro
// cadastro manual quanto pra fechar o Embedded Signup.
export async function verifyPhoneNumber(
  accessToken: string,
  phoneNumberId: string
): Promise<{ ok: true; displayPhone: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${VERSION}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Meta recusou (${res.status}): ${detail.slice(0, 200)}` };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: true, displayPhone: body?.display_phone_number ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "falha de rede" };
  }
}

// Embedded Signup: troca o `code` que o SDK da Meta devolve por um token de
// acesso. Só funciona com FACEBOOK_APP_ID/SECRET definidos — que só existem
// depois da sua plataforma ser aprovada como Tech Provider. Sem eles, devolve
// null e a rota responde "aguardando aprovação da Meta".
export function embeddedSignupConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: "Embedded Signup não configurado (defina FACEBOOK_APP_ID e FACEBOOK_APP_SECRET)." };
  }
  try {
    const url =
      `${GRAPH_BASE}/${VERSION}/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Meta recusou o código (${res.status}): ${detail.slice(0, 200)}` };
    }
    const body = await res.json().catch(() => ({}));
    if (!body?.access_token) return { ok: false, error: "Meta não devolveu access_token." };
    return { ok: true, accessToken: body.access_token as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "falha de rede" };
  }
}

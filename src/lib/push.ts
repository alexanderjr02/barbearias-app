import webpush from "web-push";
import { prisma } from "./db";

// Web Push — o que faz o celular apitar com o app fechado, como o WhatsApp.
//
// O navegador de cada aparelho tem um "serviço de push" (Apple para iPhone,
// Google para Android/Chrome, Mozilla para Firefox). Quando a pessoa autoriza,
// ele nos dá um `endpoint` único e duas chaves. Guardamos isso (PushSubscription)
// e, para avisar, mandamos o recado CRIPTOGRAFADO para esse endpoint com nossa
// assinatura VAPID — o serviço de push entrega ao aparelho e acorda o service
// worker, que mostra a notificação. Nada disso precisa do app aberto.
//
// No iPhone só funciona com o app INSTALADO na tela de início (iOS 16.4+) —
// limitação da Apple, não do código.

// Chaves VAPID: identificam a plataforma para os serviços de push. A pública
// vai para o navegador na hora de assinar; a privada assina os envios e nunca
// sai do servidor. Geradas uma vez (web-push generateVAPIDKeys) e guardadas
// como env.
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// mailto:/https: exigido pelo protocolo — é como o serviço de push te contata
// se algo estiver errado com os envios.
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@cortix.app";

let configured = false;
function ensureConfigured(): boolean {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export function vapidPublicKey(): string {
  return PUBLIC_KEY;
}

// O que aparece na notificação. `url` é para onde levar ao tocar (o service
// worker foca/abre o app nela); `tag` agrupa avisos do mesmo tipo para não
// empilhar dez balões iguais.
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Envia para uma lista de assinaturas e devolve os endpoints que morreram
// (404/410 = o navegador descartou aquela inscrição) para o chamador apagar.
async function sendToMany(subs: StoredSubscription[], payload: PushPayload): Promise<string[]> {
  if (!ensureConfigured() || subs.length === 0) return [];

  const data = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
          { TTL: 60 * 60 * 24 } // guarda até 24h se o aparelho estiver offline
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        // 404 (foi embora) / 410 (não existe mais): assinatura morta, some com
        // ela. Qualquer outro erro (rede, 500 do serviço de push) é transitório
        // — não apaga, só registra, para tentar de novo no próximo aviso.
        if (status === 404 || status === 410) {
          dead.push(s.endpoint);
        } else {
          console.error(`[push] falha ao enviar (status ${status ?? "?"})`, err);
        }
      }
    })
  );

  return dead;
}

async function purge(endpoints: string[]) {
  if (endpoints.length === 0) return;
  await prisma.pushSubscription
    .deleteMany({ where: { endpoint: { in: endpoints } } })
    .catch((e: unknown) => console.error("[push] falha ao limpar assinaturas mortas", e));
}

// Avisa TODOS os aparelhos de um usuário (a mesma pessoa pode ter iPhone +
// computador). Usado quando o alvo é uma pessoa específica — ex.: cliente cujo
// agendamento foi confirmado.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  const dead = await sendToMany(subs, payload);
  await purge(dead);
}

// Avisa a EQUIPE de uma barbearia (dono/gerente/barbeiros que ativaram push)
// — ex.: "novo agendamento". Filtra pela barbearia guardada na inscrição, sem
// precisar de JOIN por staff a cada disparo.
export async function sendPushToBarbershopStaff(barbershopId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({
    // CLIENT nunca entra aqui: um cliente daquela barbearia não pode receber
    // os avisos internos da gestão.
    where: { barbershopId, role: { not: "CLIENT" } },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  const dead = await sendToMany(subs, payload);
  await purge(dead);
}

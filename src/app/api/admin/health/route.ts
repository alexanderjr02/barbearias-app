import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession, denyAdmin } from "@/lib/apiAuth";

// GET /api/admin/health — o que está de pé e o que está faltando configurar.
//
// Existe por um caso concreto: o e-mail deste sistema passou dias saindo pelo
// remetente de teste da Resend, e isso só foi descoberto quando alguém
// precisou de um link de recuperação que não chegou. Integração quebrada em
// silêncio é a pior espécie — ela não avisa, e quando avisa é pelo cliente.
//
// Só reporta o que dá para afirmar sem chamar terceiros: presença de
// credencial, estado do banco, e a última vez que o cron rodou. Não sai
// batendo em API externa a cada carregamento, porque um painel de saúde que
// gasta cota de terceiro para dizer "tudo bem" cria o problema que veio medir.
export const dynamic = "force-dynamic";

type Nivel = "ok" | "atencao" | "faltando";

interface Item {
  nome: string;
  nivel: Nivel;
  detalhe: string;
  acao?: string;
}

export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) return denyAdmin();

  const itens: Item[] = [];

  // --- Banco ---
  let banco: Item = { nome: "Banco de dados", nivel: "faltando", detalhe: "Sem resposta" };
  try {
    const t0 = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    const ms = Date.now() - t0;
    const indices = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) c FROM sqlite_master WHERE type='index' AND name LIKE 'Appointment_%'`,
    )) as { c: number }[];
    const temIndices = Number(indices[0]?.c ?? 0) >= 4;
    banco = {
      nome: "Banco de dados",
      nivel: temIndices ? "ok" : "atencao",
      detalhe: temIndices ? `Respondendo em ${ms}ms, índices de escala aplicados` : `Respondendo em ${ms}ms, mas SEM os índices de escala`,
      acao: temIndices ? undefined : "Aplique em /api/admin/db/migrate",
    };
  } catch (e) {
    banco.detalhe = e instanceof Error ? e.message.slice(0, 120) : "Erro desconhecido";
  }
  itens.push(banco);

  // --- E-mail ---
  const temResend = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "";
  const sandbox = !from || from.includes("resend.dev");
  itens.push({
    nome: "E-mail (Resend)",
    nivel: !temResend ? "faltando" : sandbox ? "atencao" : "ok",
    detalhe: !temResend
      ? "RESEND_API_KEY não configurada — nenhum e-mail sai"
      : sandbox
        ? `Saindo por remetente de teste (${from || "onboarding@resend.dev"}). Só chega no e-mail dono da conta Resend — cliente real NÃO recebe.`
        : `Remetente próprio: ${from}`,
    acao: sandbox ? "Verifique um domínio na Resend e ajuste EMAIL_FROM" : undefined,
  });

  // --- IA ---
  itens.push({
    nome: "IA (Anthropic)",
    nivel: process.env.ANTHROPIC_API_KEY ? "ok" : "atencao",
    detalhe: process.env.ANTHROPIC_API_KEY
      ? "Chave configurada — o Copiloto responde de verdade"
      : "Sem chave: o Copiloto cai no modo simulado, sem quebrar",
    acao: process.env.ANTHROPIC_API_KEY ? undefined : "Configure ANTHROPIC_API_KEY com crédito",
  });

  // --- Push ---
  const temPush = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  itens.push({
    nome: "Notificações push",
    nivel: temPush ? "ok" : "faltando",
    detalhe: temPush ? "Chaves VAPID configuradas" : "Sem chaves VAPID — nenhum push é entregue",
  });

  // --- WhatsApp ---
  const conexoes = await prisma.whatsappConnection.count();
  itens.push({
    nome: "WhatsApp",
    nivel: conexoes > 0 ? "ok" : "atencao",
    detalhe: conexoes > 0 ? `${conexoes} barbearia(s) conectada(s)` : "Nenhuma barbearia conectou o WhatsApp ainda",
  });

  // --- Pagamento ---
  itens.push({
    nome: "Pagamento (Mercado Pago)",
    nivel: process.env.MERCADOPAGO_ACCESS_TOKEN ? "ok" : "atencao",
    detalhe: process.env.MERCADOPAGO_ACCESS_TOKEN
      ? "Token configurado"
      : 'Sem token: "Assinar" ativa o plano SEM cobrar (modo teste)',
  });

  // --- Cron ---
  const ultimo = (await prisma.autopilotLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })) as { createdAt: Date } | null;
  const horas = ultimo ? (Date.now() - ultimo.createdAt.getTime()) / 3600000 : null;
  itens.push({
    nome: "Automações (cron diário)",
    nivel: horas === null ? "atencao" : horas < 48 ? "ok" : "atencao",
    detalhe:
      horas === null
        ? "O Copiloto ainda não registrou nenhuma ação"
        : `Última ação há ${horas < 1 ? "menos de 1 hora" : `${Math.floor(horas)} hora(s)`}`,
    acao: horas !== null && horas >= 48 ? "O cron roda 11h UTC — confira se está agendado" : undefined,
  });

  const resumo = {
    ok: itens.filter((i) => i.nivel === "ok").length,
    atencao: itens.filter((i) => i.nivel === "atencao").length,
    faltando: itens.filter((i) => i.nivel === "faltando").length,
  };

  return NextResponse.json({ itens, resumo, geradoEm: new Date().toISOString() });
}

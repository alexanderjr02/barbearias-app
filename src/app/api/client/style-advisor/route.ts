import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planHasAI } from "@/lib/billing";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";

const MODEL = process.env.CHATBOT_MODEL || "claude-opus-4-8";

// POST /api/client/style-advisor { imageUrl, barbershopId } — the "provador de
// corte": the client sends a selfie and the AI reads their face shape + hair
// and recommends the cuts/beards that suit them, choosing from THIS shop's real
// menu and inviting them to book. Pro+ + Anthropic key; degrades gracefully.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const imageUrl: string = (body?.imageUrl ?? "").toString();
  const barbershopId: string = (body?.barbershopId ?? "").toString();
  if (!imageUrl || !barbershopId) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const [shop, services] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true, plan: true } }),
    prisma.service.findMany({ where: { barbershopId, isActive: true }, select: { name: true, price: true } }),
  ]);
  if (!planHasAI(shop?.plan)) return NextResponse.json({ available: false, locked: true });
  if (!assistantEnabled()) return NextResponse.json({ available: false });

  // Load the image bytes (local upload path or absolute URL).
  let base64: string;
  let mediaType = "image/jpeg";
  try {
    if (imageUrl.startsWith("/")) {
      const buf = await readFile(path.join(process.cwd(), "public", imageUrl));
      base64 = buf.toString("base64");
      if (imageUrl.toLowerCase().endsWith(".png")) mediaType = "image/png";
      else if (imageUrl.toLowerCase().endsWith(".webp")) mediaType = "image/webp";
    } else {
      const resp = await fetch(imageUrl);
      base64 = Buffer.from(await resp.arrayBuffer()).toString("base64");
      mediaType = resp.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    }
  } catch {
    return NextResponse.json({ available: true, recommendation: "Não consegui abrir a foto. Tenta mandar outra?" });
  }

  const menu = (services as { name: string; price: number }[]).map((s) => `- ${s.name} (R$ ${s.price.toFixed(2)})`).join("\n") || "- (sem serviços cadastrados)";
  const prompt = `Você é um consultor de estilo/barbeiro experiente da barbearia "${shop?.name ?? "nossa barbearia"}". Olhando a foto do cliente, avalie discretamente o formato do rosto, o tipo/altura do cabelo e a barba, e recomende de 2 a 3 cortes (e barba, se fizer sentido) que valorizam ELE. Para cada um, diga em 1 linha por que combina. Fale em português do Brasil, tom de amigo que entende do assunto, positivo e sem julgar aparência. NÃO use markdown (nada de ** ou #); separe as opções com "•". No fim, sugira UM serviço do cardápio abaixo e convide a agendar. Máximo 8 linhas.\n\nCardápio da barbearia:\n${menu}`;

  try {
    const client = getAnthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const recommendation = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    return NextResponse.json({ available: true, recommendation: recommendation || "Não consegui analisar agora." });
  } catch (e) {
    return NextResponse.json({ available: true, recommendation: `Não consegui analisar agora. ${e instanceof Error ? e.message : ""}`.trim() });
  }
}

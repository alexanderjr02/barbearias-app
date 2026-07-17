import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import { readFile } from "fs/promises";
import path from "path";

// POST /api/barber/analyze-reference { imageUrl } — reads the client's
// reference photo and returns a short technical brief for the barber (fade
// type, lengths, technique, finish + rough time estimate). Needs an Anthropic
// key; degrades gracefully to { available:false } when none is configured.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CLIENT") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!assistantEnabled()) return NextResponse.json({ available: false });

  const body = await request.json().catch(() => null);
  const imageUrl: string | undefined = body?.imageUrl;
  if (!imageUrl) return NextResponse.json({ error: "imageUrl obrigatório" }, { status: 400 });

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
      const buf = Buffer.from(await resp.arrayBuffer());
      base64 = buf.toString("base64");
      mediaType = resp.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    }
  } catch {
    return NextResponse.json({ available: true, description: "Não consegui abrir a imagem de referência." });
  }

  try {
    const client = getAnthropic();
    const msg = await client.messages.create({
      model: process.env.CHATBOT_MODEL || "claude-opus-4-8",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 } },
            {
              type: "text",
              text: "Você é um barbeiro experiente. Descreva tecnicamente este corte para um colega reproduzir: tipo de degradê/fade, altura das laterais e do topo, técnica (máquina/tesoura/navalha), acabamento e uma estimativa de tempo. Seja objetivo, em português do Brasil, em tópicos curtos.",
            },
          ],
        },
      ],
    });
    const description = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ available: true, description: description || "Sem descrição." });
  } catch (e) {
    return NextResponse.json({ available: true, description: `Não consegui analisar agora. ${e instanceof Error ? e.message : ""}`.trim() });
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assistantEnabled } from "@/lib/chatbot/assistant";
import { getAnthropic } from "@/lib/chatbot/anthropicClient";
import { recordAiUsage } from "@/lib/ai/usage";
import { readFile } from "fs/promises";
import path from "path";

// POST /api/appointments/[id]/recipe-from-photo
//
// Lê a foto do RESULTADO e preenche a ficha técnica do corte (máquina,
// acabamento, produtos). Os campos já existiam, mas dependiam do barbeiro
// digitar, e ninguém digita no meio do expediente.
//
// Por que isso importa mais do que parece: com a ficha preenchida, QUALQUER
// barbeiro da casa reproduz o corte na próxima visita. O cliente passa a ser
// da barbearia e não do profissional, que é exatamente o medo do dono quando
// o barbeiro bom pede as contas.
//
// Nunca sobrescreve o que o barbeiro escreveu: sugestão de máquina não vale
// mais que a mão de quem fez.

const PROMPT = `Você é um barbeiro experiente olhando a foto de um corte JÁ PRONTO.

Devolva SOMENTE um JSON, sem texto antes ou depois, neste formato:
{"maquina":"...","acabamento":"...","produtos":"..."}

- maquina: pente e altura nas laterais e na nuca, em português de barbearia curto (ex.: "1.5 nos lados, 2 no meio, 0 na nuca")
- acabamento: como o topo foi trabalhado (ex.: "tesoura no topo, texturizado, risco à direita")
- produtos: o que aparenta ter sido usado na finalização (ex.: "pomada matte")

Se não der para afirmar um campo pela foto, devolva string vazia nele. Não invente.`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "CLIENT") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!assistantEnabled()) return NextResponse.json({ available: false });

  const { id } = await params;
  const apt = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, barbershopId: true, resultPhoto: true, recipeMachine: true, recipeFinish: true, recipeProducts: true },
  });
  if (!apt || apt.barbershopId !== session.barbershopId) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }
  if (!apt.resultPhoto) {
    return NextResponse.json({ available: true, error: "Tire a foto do resultado primeiro." }, { status: 400 });
  }

  let base64: string;
  let mediaType = "image/jpeg";
  try {
    if (apt.resultPhoto.startsWith("/")) {
      const buf = await readFile(path.join(process.cwd(), "public", apt.resultPhoto));
      base64 = buf.toString("base64");
      if (apt.resultPhoto.toLowerCase().endsWith(".png")) mediaType = "image/png";
      else if (apt.resultPhoto.toLowerCase().endsWith(".webp")) mediaType = "image/webp";
    } else {
      const resp = await fetch(apt.resultPhoto);
      base64 = Buffer.from(await resp.arrayBuffer()).toString("base64");
      mediaType = resp.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    }
  } catch {
    return NextResponse.json({ available: true, error: "Não consegui abrir a foto." }, { status: 400 });
  }

  try {
    const client = getAnthropic();
    const modelo = process.env.CHATBOT_MODEL || "claude-opus-4-8";
    const msg = await client.messages.create({
      model: modelo,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const texto = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // O modelo às vezes embrulha o JSON em texto. Pega o primeiro objeto.
    const bruto = texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
    let ficha: { maquina?: string; acabamento?: string; produtos?: string };
    try {
      ficha = JSON.parse(bruto);
    } catch {
      return NextResponse.json({ available: true, error: "Não consegui ler a foto agora." }, { status: 200 });
    }

    const limpo = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 200) : "");
    const dados: Record<string, string> = {};
    // Só preenche campo VAZIO: o que o barbeiro escreveu vale mais.
    if (!apt.recipeMachine && limpo(ficha.maquina)) dados.recipeMachine = limpo(ficha.maquina);
    if (!apt.recipeFinish && limpo(ficha.acabamento)) dados.recipeFinish = limpo(ficha.acabamento);
    if (!apt.recipeProducts && limpo(ficha.produtos)) dados.recipeProducts = limpo(ficha.produtos);

    if (Object.keys(dados).length > 0) {
      await prisma.appointment.update({ where: { id: apt.id }, data: dados });
    }

    await recordAiUsage(apt.barbershopId, "reference", modelo, msg.usage?.input_tokens ?? 0, msg.usage?.output_tokens ?? 0);

    return NextResponse.json({
      available: true,
      preenchidos: Object.keys(dados).length,
      recipeMachine: dados.recipeMachine ?? apt.recipeMachine ?? "",
      recipeFinish: dados.recipeFinish ?? apt.recipeFinish ?? "",
      recipeProducts: dados.recipeProducts ?? apt.recipeProducts ?? "",
    });
  } catch (e) {
    console.error("[recipe-from-photo] falhou:", e);
    return NextResponse.json({ available: true, error: "Não consegui analisar agora. Tente de novo." }, { status: 200 });
  }
}

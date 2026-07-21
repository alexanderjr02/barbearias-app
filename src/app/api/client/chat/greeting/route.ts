import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { planHasAI } from "@/lib/billing";
import { clientProactiveOpener } from "@/lib/copilot/clientAgent";

// GET /api/client/chat/greeting?barbershopId= — the proactive opener for the
// logged-in client's assistant. The "agente que se antecipa": when the client
// is due for a cut, it proposes the next slot (their usual service/barber/time)
// before they ask. Shown only when the chat has no history yet.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ greeting: "", proactive: false, suggestion: null });
  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  if (!barbershopId) return NextResponse.json({ greeting: "", proactive: false, suggestion: null });

  const [shop, user] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true, chatbotEnabled: true, chatbotWelcome: true } }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);
  // Assistente desligado pelo gestor → sem saudação.
  if (shop && shop.chatbotEnabled === false) return NextResponse.json({ greeting: "", proactive: false, suggestion: null });

  // A saudação configurada pelo gestor (chatbotWelcome) é o piso — vale em
  // qualquer plano. É ela que torna o "welcome" real: antes ficava só no
  // localStorage e nunca chegava ao cliente.
  const welcome = shop?.chatbotWelcome?.trim() || "";

  // Abertura proativa com IA é um extra do Pro+. Nos demais planos, entrega a
  // saudação configurada (se houver) sem o empurrão personalizado.
  if (!planHasAI(shop?.plan)) {
    return NextResponse.json({ greeting: welcome, proactive: false, suggestion: null });
  }

  const firstName = (user?.name ?? "").split(" ")[0] ?? "";
  try {
    const opener = await clientProactiveOpener(barbershopId, session.sub, firstName);
    // Uma abertura REALMENTE proativa (propõe um horário porque o cliente está
    // na hora do corte) é contextual e vale mais que um "oi" fixo — ela passa
    // na frente. Fora isso, a saudação que o gestor escreveu tem precedência
    // sobre o "oi" genérico do assistente.
    if (opener.proactive && opener.greeting?.trim()) return NextResponse.json(opener);
    if (welcome) return NextResponse.json({ greeting: welcome, proactive: false, suggestion: null });
    return NextResponse.json(opener);
  } catch {
    return NextResponse.json({ greeting: welcome, proactive: false, suggestion: null });
  }
}

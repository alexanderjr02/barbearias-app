import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/v1/push/unsubscribe
//
// Remove a assinatura de push deste aparelho (a pessoa desligou as
// notificações). Apaga só a assinatura DELA — o filtro por userId impede que
// um endpoint chutado apague a inscrição de outra pessoa.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint: unknown = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.sub } });
  return NextResponse.json({ ok: true });
}

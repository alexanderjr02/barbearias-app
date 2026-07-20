import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/v1/push/subscribe
//
// Guarda a assinatura de push de UM aparelho. O corpo é o objeto que o
// navegador devolve em pushManager.subscribe() — endpoint + chaves p256dh/auth.
//
// Precisa de login: a assinatura é amarrada ao usuário (pelo token) para
// sabermos para quem mandar depois. `endpoint` é único, então reenviar a mesma
// assinatura só atualiza — reabrir o app não cria linhas duplicadas.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint: unknown = body?.endpoint;
  const p256dh: unknown = body?.keys?.p256dh;
  const auth: unknown = body?.keys?.auth;

  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Assinatura de push inválida" }, { status: 400 });
  }

  // Staff: a barbearia vem do token (autoritativa). Cliente: o token não fixa
  // uma barbearia, então usa a que o app informou (a que ele está vendo). Só
  // informativo — o envio para cliente é por usuário, não por barbearia.
  const barbershopId =
    session.barbershopId ?? (typeof body?.barbershopId === "string" ? body.barbershopId : null);
  const userAgent =
    typeof body?.userAgent === "string" ? body.userAgent.slice(0, 300) : request.headers.get("user-agent")?.slice(0, 300) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userId: session.sub, barbershopId, role: session.role, userAgent },
    // Reassinatura: o mesmo endpoint pode trocar de dono se o aparelho for
    // usado por outra conta — por isso userId/role/barbershop são atualizados,
    // nunca deixados no dono antigo.
    update: { p256dh, auth, userId: session.sub, barbershopId, role: session.role, userAgent },
  });

  return NextResponse.json({ ok: true });
}

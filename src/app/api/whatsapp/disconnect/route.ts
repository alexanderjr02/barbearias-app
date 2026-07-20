import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// POST /api/whatsapp/disconnect — remove a conexão de WhatsApp desta barbearia.
// A partir daí ela volta a não enviar (ou cai no número único da plataforma via
// env, se houver). deleteMany para ser idempotente: desconectar duas vezes não
// dá erro.
export async function POST() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  await prisma.whatsappConnection.deleteMany({ where: { barbershopId: session.barbershopId } });
  return NextResponse.json({ ok: true });
}

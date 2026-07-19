import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clientLoyaltyStatus, referralCodeFor, attachReferral } from "@/lib/loyalty/engine";

// GET  /api/loyalty/me?barbershopId= — a carteira do cliente: selos, prêmios,
//      pontos e o código de indicação dele.
// POST /api/loyalty/me { barbershopId, code } — usar código de um amigo.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const barbershopId = request.nextUrl.searchParams.get("barbershopId");
  if (!barbershopId) return NextResponse.json({ error: "Informe a barbearia" }, { status: 400 });

  // Gera o código na primeira visita à tela — assim ele já tem o que
  // compartilhar sem precisar apertar nada.
  await referralCodeFor(session.sub, barbershopId);
  return NextResponse.json(await clientLoyaltyStatus(session.sub, barbershopId));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "");
  const barbershopId = String(body?.barbershopId ?? "");
  if (!code || !barbershopId) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const result = await attachReferral(code, session.sub, barbershopId);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: result.message });
}

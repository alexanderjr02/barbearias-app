import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { undoAction, latestUndoable } from "@/lib/copilot/undo";

// GET  /api/copilot/undo        — a última ação reversível (para oferecer o botão)
// POST /api/copilot/undo {id}   — desfaz
//
// O desfazer é escopado à barbearia da sessão E ao usuário que executou: um
// gerente não desfaz o que o dono fez em outra unidade.
export async function GET() {
  const session = await getSession();
  if (!session?.barbershopId) return NextResponse.json({ undo: null });
  const row = await latestUndoable(session.barbershopId, session.sub);
  return NextResponse.json({ undo: row ? { id: row.id, description: row.description, createdAt: row.createdAt } : null });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.barbershopId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Informe a ação." }, { status: 400 });

  const result = await undoAction(id, session.barbershopId, session.sub);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ message: result.message });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/barber/client-preferences?clientId= — a client's grooming
// preferences, shown to the barber/gestor on the appointment detail.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.role === "CLIENT") return NextResponse.json(null); // clients read their own via /client/preferences
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json(null);
  const prefs = await prisma.clientPreferences.findUnique({ where: { clientId } });
  return NextResponse.json(prefs);
}

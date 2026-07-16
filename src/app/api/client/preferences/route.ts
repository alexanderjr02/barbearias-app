import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const FIELDS = ["machine", "products", "allergies", "drink", "chat", "notes"] as const;

// GET /api/client/preferences — the logged-in client's grooming preferences.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const prefs = await prisma.clientPreferences.findUnique({ where: { clientId: session.sub } });
  return NextResponse.json(prefs ?? {});
}

// PUT /api/client/preferences — upsert the client's preferences.
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) {
    if (typeof body?.[f] === "string") data[f] = body[f].trim() || null;
  }
  const prefs = await prisma.clientPreferences.upsert({
    where: { clientId: session.sub },
    create: { clientId: session.sub, ...data },
    update: data,
  });
  return NextResponse.json(prefs);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/client/cuts — the logged-in client's "cut passport" (photos of
// past haircuts), newest first.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const cuts = await prisma.cutPhoto.findMany({
    where: { clientId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(cuts);
}

// POST /api/client/cuts { imageUrl, note? } — add a photo to the passport.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!imageUrl) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });
  const cut = await prisma.cutPhoto.create({
    data: {
      clientId: session.sub,
      imageUrl,
      note: typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null,
    },
  });
  return NextResponse.json(cut, { status: 201 });
}

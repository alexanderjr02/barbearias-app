import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugSchema } from "@/lib/validation";

// GET /api/auth/check-slug?slug=minha-barbearia — public, pre-signup helper so
// the owner registration form can tell in real time whether a booking link is
// still available. Slugs become public booking URLs anyway, so there's nothing
// sensitive to leak here; we only report free/taken (plus whether the format is
// even valid) without touching any account data.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slug") ?? "";
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ available: false, valid: false });
  }

  const existing = await prisma.barbershop.findUnique({
    where: { slug: parsed.data },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing, valid: true });
}

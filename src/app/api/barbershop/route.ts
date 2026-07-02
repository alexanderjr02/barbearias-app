import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/barbershop?slug=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    const barbershop = await prisma.barbershop.findUnique({
      where: { slug },
      include: {
        staff: { where: { isActive: true } },
        services: { where: { isActive: true } },
        workingHours: true,
      },
    });

    if (!barbershop) {
      return NextResponse.json({ error: "Barbershop not found" }, { status: 404 });
    }

    return NextResponse.json(barbershop);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching barbershop" }, { status: 500 });
  }
}

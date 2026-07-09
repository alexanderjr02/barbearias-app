import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession } from "@/lib/apiAuth";

// GET /api/admin/support/tickets?status=&search=
export async function GET(request: NextRequest) {
  const session = await requireAnyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim() ?? "";

  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(search
      ? { OR: [{ subject: { contains: search } }, { barbershop: { name: { contains: search } } }] }
      : {}),
  };

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      barbershop: { select: { name: true, logo: true, primaryColor: true } },
      createdBy: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
    },
  });

  return NextResponse.json(
    tickets.map((t: (typeof tickets)[number]) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      barbershopName: t.barbershop.name,
      barbershopLogo: t.barbershop.logo,
      barbershopColor: t.barbershop.primaryColor,
      createdByName: t.createdBy.name,
      createdByEmail: t.createdBy.email,
      messageCount: t._count.messages,
      lastMessage: t.messages[0]?.body ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  );
}

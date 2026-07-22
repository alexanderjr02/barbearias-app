import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { getHealthScores } from "@/lib/health";

// GET /api/admin/barbershops?search=&plan=&status=&sortBy=&sortDir=&page=&pageSize=
export async function GET(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const plan = searchParams.get("plan");
  const status = searchParams.get("status"); // active | inactive
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where = {
    ...(plan && plan !== "ALL" ? { plan } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { city: { contains: search } },
            { owner: { name: { contains: search } } },
            { owner: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const orderBy = ["name", "plan", "createdAt"].includes(sortBy) ? { [sortBy]: sortDir } : { createdAt: sortDir as "asc" | "desc" };

  const [total, barbershops] = await Promise.all([
    prisma.barbershop.count({ where }),
    prisma.barbershop.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        plan: true,
        isActive: true,
        primaryColor: true,
        logo: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { staff: true, appointments: true } },
      },
    }),
  ]);

  const healthScores = await getHealthScores(barbershops.map((b: (typeof barbershops)[number]) => b.id));
  const withHealth = barbershops.map((b: (typeof barbershops)[number]) => ({ ...b, health: healthScores.get(b.id) ?? null }));

  return NextResponse.json({ barbershops: withHealth, total, page, pageSize });
}

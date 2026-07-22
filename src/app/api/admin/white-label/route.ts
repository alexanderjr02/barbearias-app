import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";

// GET /api/admin/white-label — every ENTERPRISE barbershop, lazily
// backfilling a REQUESTED row for any shop that was already on this plan
// before the tracker existed (e.g. seeded demo data).
export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const enterpriseShops = await prisma.barbershop.findMany({
    where: { plan: "ENTERPRISE" },
    select: {
      id: true,
      name: true,
      logo: true,
      primaryColor: true,
      owner: { select: { name: true, email: true } },
      whiteLabelRequest: true,
    },
  });

  // SQLite's Prisma driver doesn't support `skipDuplicates` on createMany —
  // the `missing` filter above already guarantees no duplicate barbershopId,
  // so a plain createMany is safe here.
  type EnterpriseShop = (typeof enterpriseShops)[number];
  const missing = enterpriseShops.filter((s: EnterpriseShop) => !s.whiteLabelRequest);
  if (missing.length > 0) {
    await prisma.whiteLabelRequest.createMany({
      data: missing.map((s: EnterpriseShop) => ({ barbershopId: s.id, status: "REQUESTED" as const })),
    });
  }

  const requests = await prisma.whiteLabelRequest.findMany({
    where: { barbershopId: { in: enterpriseShops.map((s: EnterpriseShop) => s.id) } },
    include: { barbershop: { select: { name: true, logo: true, primaryColor: true, owner: { select: { name: true, email: true } } } } },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(
    requests.map((r: (typeof requests)[number]) => ({
      id: r.id,
      barbershopId: r.barbershopId,
      barbershopName: r.barbershop.name,
      logo: r.barbershop.logo,
      primaryColor: r.barbershop.primaryColor,
      ownerName: r.barbershop.owner.name,
      ownerEmail: r.barbershop.owner.email,
      status: r.status,
      notes: r.notes,
      requestedAt: r.requestedAt,
      updatedAt: r.updatedAt,
    }))
  );
}

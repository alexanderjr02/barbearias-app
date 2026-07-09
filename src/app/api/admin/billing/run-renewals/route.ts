import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { ensureMonthlyRenewals } from "@/lib/billing";

// POST /api/admin/billing/run-renewals — manual trigger, since there's no
// cron/background-job infrastructure in this app; renewals also run lazily
// on every dashboard/billing page load, this just makes it visible on demand.
export async function POST() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const created = await ensureMonthlyRenewals();

  await logAdminAction({
    actorId: session.sub,
    action: "billing.renewals_run",
    targetType: "PlatformInvoice",
    targetId: "bulk",
    metadata: { created },
  });

  return NextResponse.json({ created });
}

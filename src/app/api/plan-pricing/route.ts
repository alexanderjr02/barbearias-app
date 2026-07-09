import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPlanPricing } from "@/lib/billing";

// GET /api/plan-pricing — read-only, any authenticated session (gestor UI
// needs this to show real prices in the Sidebar/UpgradeModal instead of the
// old hardcoded strings). Editing happens only via /api/admin/settings/plan-pricing.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json(await getPlanPricing());
}

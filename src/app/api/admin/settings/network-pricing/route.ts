import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { getNetworkPricing } from "@/lib/billing";

// Preços de REDE editáveis pelo admin, no mesmo molde de plan-pricing:
//   extraUnitPrice — quanto custa cada unidade além da matriz
//   setupFee       — taxa de implantação do White Label (0 = não cobra)
//
// Antes só dava para mudar por variável de ambiente, o que exigia deploy para
// um número que é decisão comercial.
export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();
  return NextResponse.json(await getNetworkPricing());
}

// PATCH body: { extraUnitPrice?: number, setupFee?: number }
export async function PATCH(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const updates: { key: string; value: number }[] = [];
  for (const [field, key] of [
    ["extraUnitPrice", "network_pricing:extra_unit"],
    ["setupFee", "network_pricing:setup_fee"],
  ] as const) {
    if (body[field] === undefined) continue;
    const n = Number(body[field]);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: `Valor inválido para ${field}` }, { status: 400 });
    }
    updates.push({ key, value: n });
  }
  if (!updates.length) return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });

  for (const u of updates) {
    await prisma.platformSetting.upsert({
      where: { key: u.key },
      update: { value: String(u.value), updatedBy: session.sub },
      create: { key: u.key, value: String(u.value), updatedBy: session.sub },
    });
  }

  await logAdminAction({
    actorId: session.sub,
    action: "settings.network_pricing_updated",
    targetType: "PlatformSetting",
    targetId: "network_pricing",
    metadata: Object.fromEntries(updates.map((u) => [u.key, u.value])),
  });

  return NextResponse.json(await getNetworkPricing());
}

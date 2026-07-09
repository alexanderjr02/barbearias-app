import { NextResponse } from "next/server";
import { requireAnyAdminSession } from "@/lib/apiAuth";
import {
  getActiveUserCounts, getDailyActiveTrend, getChatbotUsage,
  getRetentionCohorts, getActivationFunnel, getPlanLimitUsage, getNewIpLogins,
} from "@/lib/analytics";

export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }

  const [activeUsers, dailyTrend, chatbot, retentionCohorts, activationFunnel, planLimitUsage, newIpLogins] = await Promise.all([
    getActiveUserCounts(),
    getDailyActiveTrend(14),
    getChatbotUsage(),
    getRetentionCohorts(3),
    getActivationFunnel(),
    getPlanLimitUsage(),
    getNewIpLogins(20),
  ]);

  return NextResponse.json({ activeUsers, dailyTrend, chatbot, retentionCohorts, activationFunnel, planLimitUsage, newIpLogins });
}

import { NextResponse } from "next/server";
import { requireAnyAdminSession, denyAdmin } from "@/lib/apiAuth";
import {
  getActiveUserCounts, getDailyActiveTrend, getChatbotUsage,
  getRetentionCohorts, getActivationFunnel, getPlanLimitUsage, getNewIpLogins,
} from "@/lib/analytics";

export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
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

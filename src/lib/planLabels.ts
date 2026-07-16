import type { PlatformPlan } from "./billing";

// Human-facing plan names, server-safe (PlanContext.PLAN_INFO is a client
// module). Kept here so routes/emails can label plans consistently.
export const PLAN_LABELS: Record<PlatformPlan, string> = {
  FREE: "Essencial",
  PRO: "Pro",
  ENTERPRISE: "White Label",
};

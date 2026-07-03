"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export type Plan = "FREE" | "PRO" | "ENTERPRISE";

export type Feature =
  | "unlimited_appointments"
  | "multiple_staff"
  | "advanced_reports"
  | "chatbot_customization"
  | "chatbot_whatsapp"
  | "marketing"
  | "inventory"
  | "financial_full"
  | "export_data"
  | "staff_commission";

export const FEATURES_BY_PLAN: Record<Plan, Feature[]> = {
  FREE: [],
  PRO: [
    "unlimited_appointments",
    "multiple_staff",
    "advanced_reports",
    "chatbot_customization",
    "chatbot_whatsapp",
    "marketing",
    "inventory",
    "financial_full",
    "export_data",
    "staff_commission",
  ],
  ENTERPRISE: [
    "unlimited_appointments",
    "multiple_staff",
    "advanced_reports",
    "chatbot_customization",
    "chatbot_whatsapp",
    "marketing",
    "inventory",
    "financial_full",
    "export_data",
    "staff_commission",
  ],
};

export const PLAN_INFO: Record<
  Plan,
  {
    label: string;
    color: string;
    bg: string;
    badgeBg: string;
    price: string;
    appointmentsLimit: number;
    staffLimit: number;
  }
> = {
  FREE: {
    label: "Starter",
    color: "text-zinc-400",
    bg: "bg-zinc-800",
    badgeBg: "bg-zinc-700 text-zinc-300",
    price: "Grátis",
    appointmentsLimit: 50,
    staffLimit: 1,
  },
  PRO: {
    label: "Pro",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    badgeBg: "bg-amber-500/20 text-amber-400",
    price: "R$ 97/mês",
    appointmentsLimit: Infinity,
    staffLimit: 10,
  },
  ENTERPRISE: {
    label: "Enterprise",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    badgeBg: "bg-purple-500/20 text-purple-400",
    price: "R$ 197/mês",
    appointmentsLimit: Infinity,
    staffLimit: Infinity,
  },
};

interface PlanContextType {
  plan: Plan;
  can: (feature: Feature) => boolean;
  setPlan: (plan: Plan) => void;
  appointmentsUsed: number;
  appointmentsLimit: number;
}

const PlanContext = createContext<PlanContextType>({
  plan: "FREE",
  can: () => false,
  setPlan: () => {},
  appointmentsUsed: 18,
  appointmentsLimit: 50,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<Plan>("PRO"); // Default PRO for demo

  useEffect(() => {
    const stored = localStorage.getItem("cortix_plan") as Plan | null;
    if (stored && stored in FEATURES_BY_PLAN) setPlanState(stored);
  }, []);

  const setPlan = useCallback((newPlan: Plan) => {
    setPlanState(newPlan);
    localStorage.setItem("cortix_plan", newPlan);
  }, []);

  const can = useCallback(
    (feature: Feature) => FEATURES_BY_PLAN[plan].includes(feature),
    [plan]
  );

  const appointmentsLimit = PLAN_INFO[plan].appointmentsLimit;

  return (
    <PlanContext.Provider
      value={{ plan, can, setPlan, appointmentsUsed: 18, appointmentsLimit }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);

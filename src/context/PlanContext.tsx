"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/apiClient";

export type Plan = "FREE" | "PRO" | "ENTERPRISE";

export type Feature =
  | "unlimited_appointments"
  | "multiple_staff"
  | "advanced_reports"
  | "chatbot_customization"
  | "chatbot_whatsapp"
  | "ai_copilot"
  | "marketing"
  | "inventory"
  | "financial_full"
  | "export_data"
  | "staff_commission"
  | "client_subscriptions";

export const FEATURES_BY_PLAN: Record<Plan, Feature[]> = {
  FREE: [],
  PRO: [
    "unlimited_appointments",
    "multiple_staff",
    "advanced_reports",
    "chatbot_customization",
    "chatbot_whatsapp",
    "ai_copilot",
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
    "ai_copilot",
    "marketing",
    "inventory",
    "financial_full",
    "export_data",
    "staff_commission",
    "client_subscriptions",
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
    label: "Essencial",
    color: "text-zinc-400",
    bg: "bg-zinc-800",
    badgeBg: "bg-zinc-700 text-zinc-300",
    price: "R$ 79/mês",
    appointmentsLimit: Infinity,
    staffLimit: 3,
  },
  PRO: {
    label: "Pro",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    badgeBg: "bg-amber-500/20 text-amber-400",
    price: "R$ 149/mês",
    appointmentsLimit: Infinity,
    staffLimit: 10,
  },
  ENTERPRISE: {
    label: "White Label",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    badgeBg: "bg-purple-500/20 text-purple-400",
    price: "R$ 399/mês",
    appointmentsLimit: Infinity,
    staffLimit: Infinity,
  },
};

export type LivePricing = { price: number; appointmentsLimit: number | null; staffLimit: number | null };

interface PlanContextType {
  plan: Plan;
  can: (feature: Feature) => boolean;
  setPlan: (plan: Plan) => Promise<void>;
  appointmentsLimit: number;
  isLoading: boolean;
  // Real price/limits from /admin/settings (PlatformSetting), falling back to
  // PLAN_INFO's static defaults while loading — so editing prices in the
  // admin panel is actually reflected here instead of the old hardcoded
  // strings.
  pricing: Record<Plan, LivePricing> | null;
  formatPrice: (plan: Plan) => string;
}

const PlanContext = createContext<PlanContextType>({
  plan: "FREE",
  can: () => false,
  setPlan: async () => {},
  appointmentsLimit: PLAN_INFO.FREE.appointmentsLimit,
  isLoading: true,
  pricing: null,
  formatPrice: (plan) => PLAN_INFO[plan].price,
});

// The plan lives on the Barbershop record — this reads/writes it for real
// instead of the old localStorage-only toggle, so gating actually reflects
// what the gestor is subscribed to (and demo accounts can showcase each tier).
export function PlanProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["barbershop-plan"],
    queryFn: () => apiGet<{ plan: Plan }>("/api/barbershop"),
    retry: false,
    staleTime: 60_000,
  });

  const { data: pricing } = useQuery({
    queryKey: ["plan-pricing"],
    queryFn: () => apiGet<Record<Plan, LivePricing>>("/api/plan-pricing"),
    retry: false,
    staleTime: 60_000,
  });

  const plan: Plan = data?.plan && data.plan in FEATURES_BY_PLAN ? data.plan : "FREE";

  const setPlan = useCallback(
    async (newPlan: Plan) => {
      await apiPatch("/api/barbershop", { plan: newPlan });
      await queryClient.invalidateQueries({ queryKey: ["barbershop-plan"] });
    },
    [queryClient]
  );

  const can = useCallback((feature: Feature) => FEATURES_BY_PLAN[plan].includes(feature), [plan]);

  const livePlanPricing = pricing?.[plan];
  // A live appointmentsLimit of `null` means "unlimited" — must map to
  // Infinity, not fall through to the static default's finite number.
  const appointmentsLimit = livePlanPricing ? livePlanPricing.appointmentsLimit ?? Infinity : PLAN_INFO[plan].appointmentsLimit;

  const formatPrice = useCallback(
    (p: Plan) => {
      const live = pricing?.[p];
      if (!live) return PLAN_INFO[p].price;
      return `R$ ${live.price.toLocaleString("pt-BR")}/mês`;
    },
    [pricing]
  );

  return (
    <PlanContext.Provider value={{ plan, can, setPlan, appointmentsLimit, isLoading, pricing: pricing ?? null, formatPrice }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);

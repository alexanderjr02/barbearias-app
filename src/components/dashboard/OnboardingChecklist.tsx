"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}

interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allDone: boolean;
  dismissed: boolean;
}

// "Primeiros passos" card — appears at the top of the gestor Dashboard until
// the barbershop clears the same 4 signals the admin panel's activation
// funnel tracks platform-wide (getActivationFunnel in src/lib/analytics.ts),
// scoped here to just this barbershop.
export function OnboardingChecklist() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => apiGet<OnboardingStatus>("/api/onboarding"),
  });

  const dismiss = async () => {
    await apiPatch("/api/onboarding", { dismissed: true });
    queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
  };

  if (!data || data.dismissed || data.allDone) return null;

  const pct = Math.round((data.completedCount / data.totalCount) * 100);

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/25 rounded-xl p-5 relative">
      <button onClick={dismiss} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-1">
        <Rocket className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Primeiros passos</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Complete essas etapas pra deixar sua barbearia pronta pra operar</p>

      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {data.steps.map((s) => (
          <div key={s.key} className={cn("flex items-center gap-2 text-sm", s.done ? "text-zinc-500" : "text-zinc-200")}>
            {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
            <span className={cn(s.done && "line-through")}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

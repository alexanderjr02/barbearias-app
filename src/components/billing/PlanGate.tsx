"use client";

import { useState } from "react";
import { Lock, Zap } from "lucide-react";
import { usePlan, Feature } from "@/context/PlanContext";
import { UpgradeModal } from "./UpgradeModal";
import { cn } from "@/lib/utils";

interface PlanGateProps {
  feature: Feature;
  children: React.ReactNode;
  label?: string;
  compact?: boolean;
}

export function PlanGate({ feature, children, label, compact = false }: PlanGateProps) {
  const { can } = usePlan();
  const [open, setOpen] = useState(false);

  if (can(feature)) return <>{children}</>;

  return (
    <>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
      <div className="relative group">
        <div className="opacity-25 pointer-events-none select-none saturate-0">
          {children}
        </div>
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-center rounded-xl",
          compact ? "bg-zinc-950/70" : "bg-zinc-950/60 backdrop-blur-[2px]"
        )}>
          <div className={cn("flex flex-col items-center gap-3", compact && "gap-2")}>
            <div className={cn("rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center", compact ? "w-8 h-8" : "w-12 h-12")}>
              <Lock className={cn("text-zinc-500", compact ? "w-4 h-4" : "w-5 h-5")} />
            </div>
            {!compact && label && (
              <p className="text-xs text-zinc-500 text-center max-w-[160px]">{label}</p>
            )}
            <button
              onClick={() => setOpen(true)}
              className={cn(
                "flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all",
                compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              )}
            >
              <Zap className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Inline lock badge for buttons/links
export function FeatureLock({ onClick }: { onClick: () => void }) {
  return (
    <span
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs rounded-full cursor-pointer hover:bg-amber-500/25 transition-colors"
    >
      <Lock className="w-2.5 h-2.5" />
      Pro
    </span>
  );
}

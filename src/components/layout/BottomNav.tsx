"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, Scissors, MoreHorizontal,
  X, UserCheck, TrendingUp, Package, Megaphone, Settings,
  BarChart3, LogOut, Plus, Lock,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePlan, Feature } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { NewAppointmentModal } from "@/components/dashboard/NewAppointmentModal";

const primaryItems = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agenda", href: "/dashboard/appointments", icon: Calendar },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Serviços", href: "/dashboard/services", icon: Scissors },
];

const moreItems: { label: string; href: string; icon: LucideIcon; feature?: Feature }[] = [
  { label: "Equipe", href: "/dashboard/staff", icon: UserCheck, feature: "multiple_staff" },
  { label: "Financeiro", href: "/dashboard/finance", icon: TrendingUp },
  { label: "Estoque", href: "/dashboard/inventory", icon: Package, feature: "inventory" },
  { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone, feature: "marketing" },
  { label: "Relatórios", href: "/dashboard/reports", icon: BarChart3, feature: "advanced_reports" },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [newAptOpen, setNewAptOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { can } = usePlan();

  const navigate = (href: string) => {
    setMoreOpen(false);
    router.push(href);
  };

  return (
    <>
      <NewAppointmentModal open={newAptOpen} onClose={() => setNewAptOpen(false)} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {/* "Mais" menu sheet (mobile only) */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-8 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Menu completo</h3>
              <button onClick={() => setMoreOpen(false)} className="text-zinc-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const Icon = item.icon;
                const locked = item.feature ? !can(item.feature) : false;
                const isActive = pathname.startsWith(item.href);
                return (
                  <button key={item.href}
                    onClick={() => locked ? (setMoreOpen(false), setUpgradeOpen(true)) : navigate(item.href)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all relative",
                      isActive ? "bg-amber-500/20 border border-amber-500/30" : "bg-zinc-800 active:bg-zinc-700",
                    )}>
                    <Icon className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-zinc-300")} />
                    {locked && <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-2 right-2" />}
                    <span className={cn("text-xs font-medium", isActive ? "text-amber-400" : "text-zinc-400")}>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={async () => {
                  setMoreOpen(false);
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 active:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sair da conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar — MOBILE ONLY (hidden on lg+) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 z-30 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {primaryItems.map(item => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative">
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-400" />
                )}
                <Icon className={cn("w-5 h-5", isActive ? "text-amber-400" : "text-zinc-500")} />
                <span className={cn("text-[10px] font-medium", isActive ? "text-amber-400" : "text-zinc-500")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Center FAB */}
          <button onClick={() => setNewAptOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30 -translate-y-2">
              <Plus className="w-5 h-5 text-black" />
            </div>
            <span className="text-[10px] font-medium text-amber-400 -mt-1">Agendar</span>
          </button>

          {/* More */}
          <button onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
            <MoreHorizontal className={cn("w-5 h-5", moreOpen ? "text-amber-400" : "text-zinc-500")} />
            <span className={cn("text-[10px] font-medium", moreOpen ? "text-amber-400" : "text-zinc-500")}>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}


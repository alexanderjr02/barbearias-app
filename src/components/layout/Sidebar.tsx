"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, UserCheck, Scissors,
  TrendingUp, Package, Megaphone, Settings, LogOut,
  ChevronLeft, ChevronRight, Sparkles, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePlan, PLAN_INFO } from "@/context/PlanContext";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agendamentos", href: "/dashboard/appointments", icon: Calendar },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Equipe", href: "/dashboard/staff", icon: UserCheck },
  { label: "Serviços", href: "/dashboard/services", icon: Scissors },
  { label: "Financeiro", href: "/dashboard/finance", icon: TrendingUp },
  { label: "Estoque", href: "/dashboard/inventory", icon: Package },
  { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
];

const UPSELL_PITCH: Record<"FREE" | "PRO", { badge: string; text: string; target: "PRO" | "ENTERPRISE" }> = {
  FREE: { badge: "Pro", text: "Relatórios, estoque, fidelização e mais barbeiros.", target: "PRO" },
  PRO: { badge: "White Label", text: "App com a sua marca, publicável nas lojas.", target: "ENTERPRISE" },
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { plan } = usePlan();
  const planInfo = PLAN_INFO[plan];
  const pitch = plan !== "ENTERPRISE" ? UPSELL_PITCH[plan] : null;
  const w = collapsed ? "64px" : "240px";

  return (
    <aside style={{ width: w, minWidth: w }} className="fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40 bg-zinc-950 border-r border-zinc-800/60">
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} defaultPlan={pitch?.target ?? "PRO"} />

      <div className={cn("flex items-center h-16 border-b border-zinc-800/60 flex-shrink-0 px-4", collapsed ? "justify-center" : "gap-3")}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
          <Scissors className="w-4 h-4 text-zinc-900" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-base font-black text-white tracking-tight">CORT<span className="text-amber-400">IX</span></span>
            <div className="flex items-center gap-1 -mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-zinc-500">Plano {planInfo.label}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!collapsed && <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-2">Menu</p>}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className={cn("relative flex items-center rounded-lg transition-all duration-150",
                collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              )}>
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r-full" />}
              <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && pitch && (
        <div className="mx-3 mb-3 p-3 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            {pitch.target === "ENTERPRISE" ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-xs font-semibold text-amber-400">{pitch.badge}</span>
          </div>
          <p className="text-xs text-zinc-500">{pitch.text}</p>
          <button onClick={() => setUpgradeOpen(true)} className="mt-2 w-full text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 py-1.5 rounded-lg transition-colors">
            Fazer upgrade
          </button>
        </div>
      )}

      <div className="px-2 pb-3 border-t border-zinc-800/60 pt-3 space-y-0.5">
        <Link href="/dashboard/settings" className={cn("flex items-center rounded-lg transition-all text-zinc-500 hover:bg-white/5 hover:text-zinc-200", collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5")}>
          <Settings className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Configurações</span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className={cn("w-full flex items-center rounded-lg transition-all text-zinc-600 hover:bg-white/5 hover:text-zinc-400", collapsed ? "justify-center h-10" : "gap-3 px-3 py-2.5")}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4 flex-shrink-0" /><span className="text-sm font-medium">Recolher</span></>}
        </button>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className={cn("w-full flex items-center rounded-lg transition-all text-zinc-600 hover:bg-red-500/10 hover:text-red-400", collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5")}
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}

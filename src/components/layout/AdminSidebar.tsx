"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Store, Users, CreditCard, Sparkles,
  ScrollText, Settings, LogOut, ChevronLeft, ChevronRight, Shield,
  Activity, LifeBuoy, Megaphone, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/apiClient";
import { useState } from "react";

const navGroups = [
  {
    label: "Visão Geral",
    superAdminOnly: false,
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Operação",
    superAdminOnly: true,
    items: [
      { label: "Barbearias", href: "/admin/barbershops", icon: Store },
      { label: "Usuários", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Financeiro",
    superAdminOnly: true,
    items: [
      { label: "Faturamento", href: "/admin/billing", icon: CreditCard },
      { label: "White Label", href: "/admin/white-label", icon: Sparkles },
    ],
  },
  {
    label: "Inteligência",
    superAdminOnly: false,
    items: [{ label: "Analytics", href: "/admin/analytics", icon: Activity }],
  },
  {
    label: "Atendimento",
    superAdminOnly: false,
    items: [
      { label: "Suporte", href: "/admin/support", icon: LifeBuoy },
      { label: "Avisos", href: "/admin/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Sistema",
    superAdminOnly: true,
    items: [
      { label: "Auditoria", href: "/admin/audit-log", icon: ScrollText },
      { label: "Notificações", href: "/admin/notifications", icon: Bell },
    ],
  },
];

// Platform-admin equivalent of components/layout/Sidebar.tsx — same
// structural shape (fixed width, collapsible, logout) but purple/indigo
// accent so /admin never gets visually confused with a gestor's own
// (amber-branded) dashboard, even mid-navigation. Grouped by function, and
// groups marked superAdminOnly are hidden entirely for a SUPPORT_ADMIN
// session — purely a UI convenience, the real boundary is each API route's
// requireSuperAdminSession() vs requireAnyAdminSession() check.
export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? "64px" : "240px";

  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => apiGet<{ role: string }>("/api/admin/me"),
  });
  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const visibleGroups = navGroups.filter((g) => !g.superAdminOnly || isSuperAdmin || !me);

  return (
    <aside style={{ width: w, minWidth: w }} className="fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40 bg-zinc-950 border-r border-zinc-800/60">
      <div className={cn("flex items-center h-16 border-b border-zinc-800/60 flex-shrink-0 px-4", collapsed ? "justify-center" : "gap-3")}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-base font-black text-white tracking-tight">CORT<span className="text-purple-400">IX</span></span>
            <div className="flex items-center gap-1 -mt-0.5">
              <span className="text-xs text-purple-400 font-medium">{isSuperAdmin || !me ? "Admin" : "Suporte"}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-3.5">
            {!collapsed && <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={cn("relative flex items-center rounded-lg transition-all duration-150",
                      collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5",
                      isActive ? "bg-purple-500/15 text-purple-400" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                    )}>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-r-full" />}
                    <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                    {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 pb-3 border-t border-zinc-800/60 pt-3 space-y-0.5">
        {(isSuperAdmin || !me) && (
          <Link href="/admin/settings" className={cn("flex items-center rounded-lg transition-all",
            pathname.startsWith("/admin/settings") ? "bg-purple-500/15 text-purple-400" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200",
            collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5")}>
            <Settings className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
            {!collapsed && <span className="text-sm font-medium">Configurações</span>}
          </Link>
        )}
        <Link href="/dashboard" className={cn("flex items-center rounded-lg transition-all text-zinc-500 hover:bg-white/5 hover:text-zinc-200", collapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2.5")}>
          <ChevronLeft className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Voltar ao painel</span>}
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

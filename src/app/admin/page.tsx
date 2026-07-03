"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store, Users, DollarSign, TrendingUp, Crown, Zap, Check,
  AlertTriangle, Search, ExternalLink, MoreVertical, RefreshCw,
  Calendar, ChevronUp, ChevronDown, Shield
} from "lucide-react";
import { store, Barbershop } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

const PLAN_COLORS = {
  FREE: "bg-zinc-700 text-zinc-300 border-zinc-600",
  PRO: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const PLAN_ICONS = {
  FREE: Check,
  PRO: Zap,
  ENTERPRISE: Crown,
};

const PLAN_PRICES: Record<string, number> = { FREE: 0, PRO: 97, ENTERPRISE: 197 };

function PlanBadge({ plan }: { plan: string }) {
  const Icon = PLAN_ICONS[plan as keyof typeof PLAN_ICONS] ?? Check;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", PLAN_COLORS[plan as keyof typeof PLAN_COLORS])}>
      <Icon className="w-3 h-3" />
      {plan === "FREE" ? "Starter" : plan}
    </span>
  );
}

function expiryStatus(expiry: string | null | undefined): { label: string; color: string } {
  if (!expiry) return { label: "Sem expiração", color: "text-zinc-500" };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Expirado", color: "text-red-400" };
  if (days <= 7) return { label: `Expira em ${days}d`, color: "text-amber-400" };
  return { label: new Date(expiry).toLocaleDateString("pt-BR"), color: "text-zinc-400" };
}

export default function AdminPage() {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "plan">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const load = () => {
    // Initialize store with seed data if empty, then load
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("cortix_barbershops");
      if (!data) {
        localStorage.setItem("cortix_barbershops", JSON.stringify(store.getBarbershops()));
      }
      setBarbershops(store.getBarbershops());
    }
  };

  useEffect(() => { load(); }, []);

  // Stats
  const total = barbershops.length;
  const active = barbershops.filter(b => b.isActive).length;
  const byPlan = {
    FREE: barbershops.filter(b => b.plan === "FREE").length,
    PRO: barbershops.filter(b => b.plan === "PRO").length,
    ENTERPRISE: barbershops.filter(b => b.plan === "ENTERPRISE").length,
  };
  const mrr = barbershops.filter(b => b.isActive).reduce((sum, b) => sum + PLAN_PRICES[b.plan], 0);
  const expiringSoon = barbershops.filter(b => {
    if (!b.planExpiry) return false;
    const days = Math.ceil((new Date(b.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;

  // Filter + sort
  const filtered = barbershops
    .filter(b => {
      const q = search.toLowerCase();
      const matchSearch = !q || b.name.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q) || b.ownerEmail.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q);
      const matchPlan = planFilter === "ALL" || b.plan === planFilter;
      return matchSearch && matchPlan;
    })
    .sort((a, b) => {
      let va = a[sortBy] ?? "";
      let vb = b[sortBy] ?? "";
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const updatePlan = (id: string, plan: "FREE" | "PRO" | "ENTERPRISE") => {
    const shop = store.getBarbershopById(id);
    if (!shop) return;
    const planExpiry = plan !== "FREE"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    store.saveBarbershop({ ...shop, plan, planExpiry });
    setEditingPlan(null);
    load();
  };

  const toggleActive = (id: string) => {
    const shop = store.getBarbershopById(id);
    if (!shop) return;
    store.saveBarbershop({ ...shop, isActive: !shop.isActive });
    load();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Painel Administrativo CORTIX
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Gestão completa de todas as barbearias na plataforma</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm rounded-lg hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Store className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{total}</p>
          <p className="text-sm text-zinc-500">Total cadastradas</p>
          <p className="text-xs text-green-400 mt-1">{active} ativas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center mb-3">
            <Check className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-2xl font-black text-white">{byPlan.FREE}</p>
          <p className="text-sm text-zinc-500">Starter</p>
        </div>

        <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{byPlan.PRO}</p>
          <p className="text-sm text-zinc-500">Plano Pro</p>
        </div>

        <div className="bg-zinc-900 border border-purple-500/20 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
            <Crown className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{byPlan.ENTERPRISE}</p>
          <p className="text-sm text-zinc-500">Enterprise</p>
        </div>

        <div className="bg-zinc-900 border border-green-500/20 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-black text-green-400">R$ {mrr.toLocaleString("pt-BR")}</p>
          <p className="text-sm text-zinc-500">MRR / mês</p>
          {expiringSoon > 0 && (
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {expiringSoon} expiram em breve
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" placeholder="Buscar barbearia, dono, email..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "FREE", "PRO", "ENTERPRISE"].map(f => (
            <button key={f} onClick={() => setPlanFilter(f)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                planFilter === f ? "bg-purple-500/20 border border-purple-500/40 text-purple-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
              )}>
              {f === "ALL" ? "Todos" : f === "FREE" ? "Starter" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/30">
                {[
                  { label: "Barbearia", col: "name" as const },
                  { label: "Dono / E-mail", col: null },
                  { label: "Localização", col: null },
                  { label: "Plano", col: "plan" as const },
                  { label: "Expiração", col: null },
                  { label: "Cadastro", col: "createdAt" as const },
                  { label: "Status", col: null },
                  { label: "Ações", col: null },
                ].map(h => (
                  <th key={h.label}
                    className={cn("text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap", h.col && "cursor-pointer hover:text-zinc-300 select-none")}
                    onClick={() => h.col && toggleSort(h.col)}>
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.col && sortBy === h.col && (
                        sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(shop => {
                const exp = expiryStatus(shop.planExpiry);
                const isExpired = shop.planExpiry && new Date(shop.planExpiry) < new Date();
                return (
                  <tr key={shop.id} className="hover:bg-white/2 transition-colors group">
                    {/* Barbershop */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {shop.logo ? (
                          <img src={shop.logo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: shop.primaryColor }}>
                            {shop.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white">{shop.name}</p>
                          <p className="text-xs text-zinc-500">cortix.app/{shop.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">{shop.ownerName}</p>
                      <p className="text-xs text-zinc-500">{shop.ownerEmail}</p>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-zinc-400">{shop.city}{shop.state ? `, ${shop.state}` : ""}</p>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={shop.plan} />
                        {editingPlan === shop.id ? (
                          <div className="flex gap-1">
                            {(["FREE", "PRO", "ENTERPRISE"] as const).map(p => (
                              <button key={p} onClick={() => updatePlan(shop.id, p)}
                                className={cn("text-xs px-2 py-1 rounded font-medium transition-all", PLAN_COLORS[p])}>
                                {p === "FREE" ? "S" : p === "PRO" ? "P" : "E"}
                              </button>
                            ))}
                            <button onClick={() => setEditingPlan(null)} className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-400">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingPlan(shop.id)}
                            className="opacity-0 group-hover:opacity-100 text-xs text-zinc-500 hover:text-amber-400 transition-all">
                            alterar
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={cn("text-xs font-medium flex items-center gap-1", exp.color)}>
                        {isExpired && <AlertTriangle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {exp.label}
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-xs text-zinc-500">
                        {new Date(shop.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <button onClick={() => toggleActive(shop.id)}
                        className={cn("text-xs font-bold px-2.5 py-1 rounded-full border transition-all",
                          shop.isActive ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
                        )}>
                        {shop.isActive ? "Ativa" : "Inativa"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <a href={`/booking/${shop.slug}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver página
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma barbearia encontrada
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{filtered.length} de {total} barbearias</span>
          <span>MRR Total: <strong className="text-green-400">R$ {mrr.toLocaleString("pt-BR")}/mês</strong></span>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Últimas barbearias cadastradas
        </h3>
        <div className="space-y-3">
          {[...barbershops]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(shop => (
              <div key={shop.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: shop.primaryColor }}>
                  {shop.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{shop.name}</p>
                  <p className="text-xs text-zinc-500">{shop.ownerEmail} · {shop.city}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PlanBadge plan={shop.plan} />
                  <span className="text-xs text-zinc-600">
                    {Math.ceil((Date.now() - new Date(shop.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d atrás
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

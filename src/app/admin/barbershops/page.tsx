"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Store, Search, ExternalLink, ChevronUp, ChevronDown, Crown, Zap, Check,
  ChevronLeft, ChevronRight, HeartPulse,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { cn, formatDate } from "@/lib/utils";

const PLAN_BADGE: Record<string, { label: string; icon: typeof Check; cls: string }> = {
  FREE: { label: "Starter", icon: Check, cls: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  PRO: { label: "Pro", icon: Zap, cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  ENTERPRISE: { label: "White Label", icon: Crown, cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const HEALTH_BAND_INFO: Record<string, { label: string; cls: string }> = {
  HEALTHY: { label: "Saudável", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  AT_RISK: { label: "Atenção", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  CRITICAL: { label: "Risco alto", cls: "bg-red-500/10 text-red-400 border-red-500/30" },
};

interface BarbershopRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  plan: string;
  isActive: boolean;
  primaryColor: string;
  logo: string | null;
  createdAt: string;
  owner: { name: string; email: string };
  _count: { staff: number; appointments: number };
  health: { score: number; band: string; reasons: string[] } | null;
}

interface ListResponse {
  barbershops: BarbershopRow[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminBarbershopsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") === "inactive" ? "inactive" : "ALL");
  const [sortBy, setSortBy] = useState<"name" | "plan" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-barbershops", search, planFilter, statusFilter, sortBy, sortDir, page],
    queryFn: () =>
      apiGet<ListResponse>(
        `/api/admin/barbershops?search=${encodeURIComponent(search)}&plan=${planFilter}&status=${statusFilter === "ALL" ? "" : statusFilter}&sortBy=${sortBy}&sortDir=${sortDir}&page=${page}&pageSize=${pageSize}`
      ),
    placeholderData: (prev) => prev,
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const toggleActive = async (shop: BarbershopRow) => {
    await apiPatch(`/api/admin/barbershops/${shop.id}`, { isActive: !shop.isActive });
    queryClient.invalidateQueries({ queryKey: ["admin-barbershops"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    toast.success(shop.isActive ? "Barbearia suspensa" : "Barbearia reativada");
  };

  const shops = data?.barbershops ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader icon={Store} title="Barbearias" subtitle="Todas as barbearias cadastradas na plataforma" accent="purple" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar barbearia, dono, cidade..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "FREE", "PRO", "ENTERPRISE"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setPlanFilter(f);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                planFilter === f ? "bg-purple-500/20 border border-purple-500/40 text-purple-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
              )}
            >
              {f === "ALL" ? "Todos" : f === "FREE" ? "Starter" : f === "ENTERPRISE" ? "White Label" : f}
            </button>
          ))}
          {["ALL", "active", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setStatusFilter(f);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                statusFilter === f ? "bg-purple-500/20 border border-purple-500/40 text-purple-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
              )}
            >
              {f === "ALL" ? "Qualquer status" : f === "active" ? "Ativas" : "Suspensas"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/30">
                {[
                  { label: "Barbearia", col: "name" as const },
                  { label: "Dono / E-mail", col: null },
                  { label: "Equipe", col: null },
                  { label: "Plano", col: "plan" as const },
                  { label: "Saúde", col: null },
                  { label: "Cadastro", col: "createdAt" as const },
                  { label: "Status", col: null },
                  { label: "Ações", col: null },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={cn("text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap", h.col && "cursor-pointer hover:text-zinc-300 select-none")}
                    onClick={() => h.col && toggleSort(h.col)}
                  >
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.col && sortBy === h.col && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {!isLoading && shops.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">
                    <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma barbearia encontrada
                  </td>
                </tr>
              )}
              {shops.map((shop) => {
                const badge = PLAN_BADGE[shop.plan] ?? PLAN_BADGE.FREE;
                const Icon = badge.icon;
                return (
                  <tr key={shop.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-4 py-4">
                      <Link href={`/admin/barbershops/${shop.id}`} className="flex items-center gap-3">
                        {shop.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={shop.logo} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: shop.primaryColor }}>
                            {shop.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-white hover:text-purple-400 transition-colors">{shop.name}</p>
                          <p className="text-xs text-zinc-500">{shop.city ?? "—"}{shop.state ? `, ${shop.state}` : ""}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">{shop.owner.name}</p>
                      <p className="text-xs text-zinc-500">{shop.owner.email}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-zinc-400">{shop._count.staff} barbeiro{shop._count.staff === 1 ? "" : "s"}</p>
                      <p className="text-xs text-zinc-600">{shop._count.appointments} agendamentos</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", badge.cls)}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {shop.health && (
                        <span
                          title={shop.health.reasons.join(" · ") || "Sem sinais de risco"}
                          className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", HEALTH_BAND_INFO[shop.health.band]?.cls)}
                        >
                          <HeartPulse className="w-3 h-3" />
                          {shop.health.score}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-xs text-zinc-500">{formatDate(shop.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleActive(shop)}
                        className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-full border transition-all",
                          shop.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30"
                        )}
                      >
                        {shop.isActive ? "Ativa" : "Suspensa"}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/barbershops/${shop.id}`} className="text-xs text-purple-400 hover:text-purple-300">
                          Detalhes
                        </Link>
                        <a href={`/booking/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{shops.length} de {total} barbearias</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

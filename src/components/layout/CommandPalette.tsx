"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Scissors, UserSquare2, LayoutDashboard, Calendar, DollarSign, Settings, LifeBuoy, Repeat } from "lucide-react";
import { apiGet } from "@/lib/apiClient";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

interface SearchResponse {
  clients: SearchResult[];
  services: SearchResult[];
  staff: SearchResult[];
}

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agenda", href: "/dashboard/appointments", icon: Calendar },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Financeiro", href: "/dashboard/finance", icon: DollarSign },
  { label: "Assinaturas", href: "/dashboard/subscriptions", icon: Repeat },
  { label: "Suporte", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

// Cmd/Ctrl+K command palette — the Topbar search input (previously
// decorative) opens this, and it's also reachable from anywhere via the
// keyboard shortcut. Searches real data (clients/services/staff, all scoped
// to the barbershop) through /api/search, plus static quick-nav links.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data } = useQuery({
    queryKey: ["command-search", query],
    queryFn: () => apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: open && query.trim().length >= 2,
    staleTime: 10_000,
  });

  const quickMatches = useMemo(
    () => (query.trim().length === 0 ? QUICK_LINKS : QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))),
    [query]
  );

  if (!open) return null;

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const hasQuery = query.trim().length >= 2;
  const noResults = hasQuery && data && data.clients.length === 0 && data.services.length === 0 && data.staff.length === 0 && quickMatches.length === 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, serviço, equipe..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {noResults && <p className="text-sm text-zinc-500 text-center py-8">Nada encontrado para &quot;{query}&quot;</p>}

          {quickMatches.length > 0 && (
            <div className="px-2 pb-2">
              <p className="px-2.5 py-1 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Ir para</p>
              {quickMatches.map((l) => (
                <button
                  key={l.href}
                  onClick={() => go(l.href)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-left transition-colors"
                >
                  <l.icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-200">{l.label}</span>
                </button>
              ))}
            </div>
          )}

          {hasQuery && data && data.clients.length > 0 && (
            <ResultGroup label="Clientes" icon={Users} results={data.clients} onSelect={go} />
          )}
          {hasQuery && data && data.services.length > 0 && (
            <ResultGroup label="Serviços" icon={Scissors} results={data.services} onSelect={go} />
          )}
          {hasQuery && data && data.staff.length > 0 && (
            <ResultGroup label="Equipe" icon={UserSquare2} results={data.staff} onSelect={go} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  label,
  icon: Icon,
  results,
  onSelect,
}: {
  label: string;
  icon: typeof Users;
  results: SearchResult[];
  onSelect: (href: string) => void;
}) {
  return (
    <div className="px-2 pb-2">
      <p className="px-2.5 py-1 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{label}</p>
      {results.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.href)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-800 text-left transition-colors"
        >
          <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-200 truncate">{r.label}</p>
            <p className="text-xs text-zinc-500 truncate">{r.sublabel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

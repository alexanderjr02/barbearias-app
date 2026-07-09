"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ListResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  targetTypes: string[];
}

const ACTION_COLOR = (action: string) => {
  if (action.includes("suspend") || action.includes("deactivat") || action.includes("failed")) return "text-red-400";
  if (action.includes("reactivat") || action.includes("activat") || action.includes("created")) return "text-emerald-400";
  if (action.includes("changed") || action.includes("updated")) return "text-amber-400";
  return "text-zinc-300";
};

export default function AdminAuditLogPage() {
  const [actor, setActor] = useState("");
  const [targetType, setTargetType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-log", actor, targetType, page],
    queryFn: () => apiGet<ListResponse>(`/api/admin/audit-log?actor=${encodeURIComponent(actor)}&targetType=${targetType}&page=${page}&pageSize=${pageSize}`),
    placeholderData: (prev) => prev,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const targetTypes = data?.targetTypes ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader icon={ScrollText} title="Auditoria" subtitle="Todas as ações administrativas tomadas na plataforma" accent="purple" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por administrador..."
            value={actor}
            onChange={(e) => { setActor(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", ...targetTypes].map((t) => (
            <button
              key={t}
              onClick={() => { setTargetType(t); setPage(1); }}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-all", targetType === t ? "bg-purple-500/20 border border-purple-500/40 text-purple-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300")}
            >
              {t === "ALL" ? "Tudo" : t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {!isLoading && logs.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma ação registrada ainda
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id}>
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-600 flex-shrink-0 transition-transform", expanded === log.id && "rotate-180")} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-mono", ACTION_COLOR(log.action))}>{log.action}</p>
                    <p className="text-xs text-zinc-500 truncate">{log.actorName} · {log.targetType} #{log.targetId.slice(0, 8)}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">{formatDateTime(log.createdAt)}</span>
              </button>
              {expanded === log.id && log.metadata && (
                <div className="px-5 pb-4 pl-12">
                  <pre className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{logs.length} de {total} registros</span>
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

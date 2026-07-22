"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  INVOICE_FAILED: "Fatura falhou",
  BARBERSHOP_SUSPENDED: "Barbearia suspensa",
  NEW_IP_LOGIN: "Login de IP novo",
  HEALTH_SCORE_DROPPED: "Saúde caiu",
};

interface LogEntry {
  id: string;
  type: string;
  status: string;
  subject: string;
  body: string;
  createdAt: string;
}

interface LogList {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface Setting {
  type: string;
  enabled: boolean;
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications", typeFilter, page],
    queryFn: () => apiGet<LogList>(`/api/admin/notifications?type=${typeFilter}&page=${page}&pageSize=${pageSize}`),
    placeholderData: (prev) => prev,
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-notification-settings"],
    queryFn: () => apiGet<Setting[]>("/api/admin/notifications/settings"),
  });

  const toggleSetting = async (type: string, enabled: boolean) => {
    await apiPatch("/api/admin/notifications/settings", { type, enabled });
    queryClient.invalidateQueries({ queryKey: ["admin-notification-settings"] });
  };

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Bell} title="Notificações" subtitle="Tudo que seria enviado por e-mail — sem provedor real configurado ainda" accent="mono" />

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">
        Nenhum e-mail é enviado de verdade hoje. Esta tela registra o que seria disparado — quando você configurar um provedor (Resend, SendGrid...), é só me avisar que eu ligo o envio real.
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Tipos de evento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(settings ?? Object.keys(TYPE_LABEL).map((type) => ({ type, enabled: true }))).map((s) => (
            <label key={s.type} className="flex items-center justify-between px-3 py-2.5 bg-zinc-800/50 rounded-lg cursor-pointer">
              <span className="text-sm text-zinc-300">{TYPE_LABEL[s.type] ?? s.type}</span>
              <input type="checkbox" checked={s.enabled} onChange={(e) => toggleSetting(s.type, e.target.checked)} className="accent-white w-4 h-4" />
            </label>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">Log de eventos</h3>
          <div className="flex gap-2 flex-wrap">
            {["ALL", ...Object.keys(TYPE_LABEL)].map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={cn("px-2.5 py-1 text-xs font-medium rounded-lg transition-all", typeFilter === t ? "bg-white/15 border border-white/20 text-white" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300")}
              >
                {t === "ALL" ? "Todos" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-zinc-800">
          {!isLoading && logs.length === 0 && <p className="text-sm text-zinc-500 text-center py-10">Nenhum evento registrado ainda</p>}
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-white font-medium">{l.subject}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 flex-shrink-0">{TYPE_LABEL[l.type] ?? l.type}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{l.body}</p>
              <p className="text-[10px] text-zinc-700 mt-1">{formatDateTime(l.createdAt)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{logs.length} de {total}</span>
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

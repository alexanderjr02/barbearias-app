"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Search, Send, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  barbershopName: string;
  barbershopColor: string;
  createdByName: string;
  createdByEmail: string;
  messageCount: number;
  lastMessage: string | null;
  updatedAt: string;
}

interface Message {
  id: string;
  body: string;
  authorName: string;
  isAdmin: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  barbershopName: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  messages: Message[];
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Aberto", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  RESOLVED: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Fechado", cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, search],
    queryFn: () => apiGet<TicketRow[]>(`/api/admin/support/tickets?status=${statusFilter}&search=${encodeURIComponent(search)}`),
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-support-ticket", selectedId],
    queryFn: () => apiGet<TicketDetail>(`/api/admin/support/tickets/${selectedId}`),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["admin-support-ticket", selectedId] });
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      await apiPost(`/api/admin/support/tickets/${selectedId}`, { body: reply });
      setReply("");
      invalidate();
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selectedId) return;
    await apiPatch(`/api/admin/support/tickets/${selectedId}`, { status });
    invalidate();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader icon={LifeBuoy} title="Suporte" subtitle="Chamados abertos por todas as barbearias da plataforma" accent="mono" />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn("px-2 py-1 text-[10px] font-medium rounded-md transition-all", statusFilter === s ? "bg-white/15 border border-white/20 text-white" : "bg-zinc-800 border border-zinc-700 text-zinc-400")}
                >
                  {s === "ALL" ? "Todos" : STATUS_INFO[s]?.label ?? s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
            {!isLoading && (tickets ?? []).length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-10">Nenhum chamado encontrado</p>
            )}
            {(tickets ?? []).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn("w-full text-left px-4 py-3 hover:bg-white/2 transition-colors", selectedId === t.id && "bg-white/10")}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-zinc-300 truncate">{t.barbershopName}</span>
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0", STATUS_INFO[t.status]?.cls)}>{STATUS_INFO[t.status]?.label}</span>
                </div>
                <p className="text-sm text-white truncate">{t.subject}</p>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{t.lastMessage ?? "—"}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
          {!selectedId || !detail ? (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
              <div className="text-center">
                <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Selecione um chamado
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{detail.subject}</h3>
                  <p className="text-xs text-zinc-500">{detail.barbershopName} · {detail.createdByName} ({detail.createdByEmail})</p>
                </div>
                <select
                  value={detail.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  {Object.entries(STATUS_INFO).map(([value, info]) => (
                    <option key={value} value={value}>{info.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {detail.messages.map((m) => (
                  <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-4 py-3", m.isAdmin ? "bg-white/10 border border-white/20 ml-auto" : "bg-zinc-800 mr-auto")}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {m.isAdmin && <ShieldCheck className="w-3 h-3 text-white" />}
                      <span className="text-xs font-semibold text-zinc-300">{m.authorName}</span>
                      <span className="text-[10px] text-zinc-600">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-zinc-800 flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Responder..."
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                />
                <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 bg-white/15 border border-white/20 text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

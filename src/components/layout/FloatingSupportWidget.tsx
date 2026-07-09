"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, X, Send, ChevronRight, MessageCircle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  lastMessage: string | null;
  lastMessageIsAdmin: boolean;
  updatedAt: string;
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Aberto", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  RESOLVED: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Fechado", cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

// A persistent, always-reachable "talk to CORTIX support" entry point —
// mirrors the quick-compose pattern of chat widgets like Intercom/Crisp, but
// wired straight into the existing SupportTicket system instead of a
// separate channel: sending a message here either replies to the gestor's
// most recent open ticket or opens a new one, no page navigation required.
export function FloatingSupportWidget() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tickets } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => apiGet<TicketRow[]>("/api/support/tickets"),
    refetchInterval: 60_000,
  });

  const pendingReplyCount = (tickets ?? []).filter((t) => t.lastMessageIsAdmin && t.status !== "CLOSED" && t.status !== "RESOLVED").length;
  const openTicket = (tickets ?? []).find((t) => t.status === "OPEN" || t.status === "IN_PROGRESS") ?? null;

  const send = async () => {
    const body = message.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      if (openTicket) {
        await apiPost(`/api/support/tickets/${openTicket.id}`, { body });
      } else {
        await apiPost("/api/support/tickets", { subject: body.slice(0, 60), body, priority: "NORMAL" });
      }
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[65] w-[360px] max-h-[70vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800 bg-gradient-to-r from-amber-500/10 to-transparent flex-shrink-0">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-white leading-none">Suporte CORTIX</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Normalmente respondemos rápido</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 border-b border-zinc-800 flex-shrink-0">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder={openTicket ? "Responder ao chamado aberto..." : "Como podemos ajudar?"}
              className="w-full resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            <button
              onClick={send}
              disabled={sending || !message.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Enviando..." : openTicket ? "Responder chamado" : "Iniciar conversa"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {(tickets ?? []).length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8 px-4">Sua conversa com o suporte aparece aqui.</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {(tickets ?? []).slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/support/${t.id}`}
                    className="flex items-start gap-2.5 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{t.subject}</p>
                        {t.lastMessageIsAdmin && t.status !== "CLOSED" && t.status !== "RESOLVED" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Resposta da equipe" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{t.lastMessage ?? "—"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", STATUS_INFO[t.status]?.cls)}>{STATUS_INFO[t.status]?.label ?? t.status}</span>
                        <span className="text-[10px] text-zinc-600">{formatDateTime(t.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/support"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 px-4 py-2.5 border-t border-zinc-800 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex-shrink-0"
          >
            Ver histórico completo <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[65] w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-black shadow-2xl shadow-amber-500/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <LifeBuoy className="w-5 h-5" />}
        {!open && pendingReplyCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-950">
            {pendingReplyCount}
          </span>
        )}
      </button>
    </>
  );
}

"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { cn, formatDateTime } from "@/lib/utils";

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
  createdAt: string;
  messages: Message[];
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Aberto", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  RESOLVED: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Fechado", cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => apiGet<TicketDetail>(`/api/support/tickets/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["support-ticket", id] });
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await apiPost(`/api/support/tickets/${id}`, { body: reply });
      setReply("");
      invalidate();
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    await apiPatch(`/api/support/tickets/${id}`, { status: "CLOSED" });
    invalidate();
  };

  if (isLoading || !data) {
    return <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/dashboard/support" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">{data.subject}</h1>
        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", STATUS_INFO[data.status]?.cls)}>{STATUS_INFO[data.status]?.label ?? data.status}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 max-h-[55vh] overflow-y-auto">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.isAdmin ? "bg-purple-500/10 border border-purple-500/20 mr-auto" : "bg-amber-500/10 border border-amber-500/20 ml-auto")}>
            <div className="flex items-center gap-1.5 mb-1">
              {m.isAdmin && <ShieldCheck className="w-3 h-3 text-purple-400" />}
              <span className="text-xs font-semibold text-zinc-300">{m.isAdmin ? "Suporte CORTIX" : m.authorName}</span>
              <span className="text-[10px] text-zinc-600">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="text-sm text-zinc-200 whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>

      {data.status !== "CLOSED" ? (
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Escreva uma resposta..."
            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <button onClick={sendReply} disabled={sending || !reply.trim()} className="px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 text-center py-2">Este chamado está fechado.</p>
      )}

      {data.status !== "CLOSED" && (
        <button onClick={closeTicket} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Marcar como resolvido e fechar
        </button>
      )}
    </div>
  );
}

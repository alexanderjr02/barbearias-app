"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, MessageCircle } from "lucide-react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { cn, formatDateTime } from "@/lib/utils";

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Aberto", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  IN_PROGRESS: { label: "Em andamento", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  RESOLVED: { label: "Resolvido", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  CLOSED: { label: "Fechado", cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600" },
};

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => apiGet<TicketRow[]>("/api/support/tickets"),
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/api/support/tickets", {
        subject: form.get("subject"),
        body: form.get("body"),
        priority: form.get("priority"),
      });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir chamado");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LifeBuoy}
        title="Suporte"
        subtitle="Fale com a equipe CORTIX sobre dúvidas, bugs ou solicitações"
        action={
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Novo chamado
          </button>
        }
      />

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Abrir chamado"
        onSubmit={handleCreate}
        submitLabel="Abrir chamado"
        isPending={creating}
        error={error}
      >
        <div>
          <label className={labelCls}>Assunto</label>
          <input name="subject" required className={fieldCls} placeholder="Ex: Erro ao gerar relatório" />
        </div>
        <div>
          <label className={labelCls}>Prioridade</label>
          <select name="priority" defaultValue="NORMAL" className={fieldCls}>
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Mensagem</label>
          <textarea name="body" required rows={5} className={cn(fieldCls, "h-auto py-2 resize-none")} placeholder="Descreva o que está acontecendo..." />
        </div>
      </FormModal>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {!isLoading && (tickets ?? []).length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhum chamado aberto ainda
            </div>
          )}
          {(tickets ?? []).map((t) => (
            <Link key={t.id} href={`/dashboard/support/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
              <MessageCircle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
                <p className="text-xs text-zinc-500 truncate">{t.lastMessage ?? "—"}</p>
              </div>
              <span className="text-xs text-zinc-600 flex-shrink-0">{formatDateTime(t.updatedAt)}</span>
              <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0", STATUS_INFO[t.status]?.cls)}>
                {STATUS_INFO[t.status]?.label ?? t.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

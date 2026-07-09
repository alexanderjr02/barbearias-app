"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { cn, formatDateTime } from "@/lib/utils";

const AUDIENCE_LABEL: Record<string, string> = { ALL: "Todos os planos", FREE: "Só Starter", PRO: "Só Pro", ENTERPRISE: "Só White Label" };

interface Announcement {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  audience: string;
  dismissedCount: number;
  createdAt: string;
}

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => apiGet<Announcement[]>("/api/admin/announcements"),
  });

  const toggleActive = async (a: Announcement) => {
    await apiPatch(`/api/admin/announcements/${a.id}`, { isActive: !a.isActive });
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    toast.success(a.isActive ? "Aviso desativado" : "Aviso ativado");
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/api/admin/announcements", {
        title: form.get("title"),
        body: form.get("body"),
        audience: form.get("audience"),
      });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Aviso publicado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar aviso");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Avisos"
        subtitle="Comunicados que aparecem no sininho do painel dos gestores"
        accent="purple"
        action={
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-3.5 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-sm font-semibold rounded-lg hover:bg-purple-500/25 transition-colors">
            <Plus className="w-4 h-4" /> Novo aviso
          </button>
        }
      />

      <FormModal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo aviso" onSubmit={handleCreate} submitLabel="Publicar aviso" isPending={creating} error={error}>
        <div>
          <label className={labelCls}>Título</label>
          <input name="title" required className={fieldCls} placeholder="Ex: Manutenção programada" />
        </div>
        <div>
          <label className={labelCls}>Mensagem</label>
          <textarea name="body" required rows={4} className={cn(fieldCls, "h-auto py-2 resize-none")} placeholder="Descreva o comunicado..." />
        </div>
        <div>
          <label className={labelCls}>Público-alvo</label>
          <select name="audience" defaultValue="ALL" className={fieldCls}>
            <option value="ALL">Todos os planos</option>
            <option value="FREE">Só Starter</option>
            <option value="PRO">Só Pro</option>
            <option value="ENTERPRISE">Só White Label</option>
          </select>
        </div>
      </FormModal>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {!isLoading && (announcements ?? []).length === 0 && (
            <div className="text-center py-14 text-zinc-500">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhum aviso ainda
            </div>
          )}
          {(announcements ?? []).map((a) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.body}</p>
                </div>
                <button
                  onClick={() => toggleActive(a)}
                  className={cn("text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0", a.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700")}
                >
                  {a.isActive ? "Ativo" : "Inativo"}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600">
                <span>{AUDIENCE_LABEL[a.audience] ?? a.audience}</span>
                <span>·</span>
                <span>{a.dismissedCount} dispensado{a.dismissedCount === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{formatDateTime(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

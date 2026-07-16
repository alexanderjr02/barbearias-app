"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Phone, MessageCircle, Check, Hourglass } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/apiClient";
import { formatPhoneBR } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { FormModal, fieldCls, labelCls } from "@/components/dashboard/FormModal";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface WaitEntry {
  id: string;
  clientName: string;
  clientPhone: string;
  note: string | null;
  createdAt: string;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function waitingLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `há ${h}h${mins % 60 ? ` ${mins % 60}min` : ""}`;
}

export default function WaitlistPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["waitlist"],
    queryFn: () => apiGet<WaitEntry[]>("/api/waitlist"),
    refetchInterval: 30000,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["waitlist"] });

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost("/api/waitlist", data),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success("Adicionado à fila");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/waitlist/${id}`),
    onSuccess: invalidate,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    create.mutate({
      clientName: form.get("clientName"),
      clientPhone: form.get("clientPhone"),
      note: form.get("note") || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adicionar à fila"
        onSubmit={handleSubmit}
        isPending={create.isPending}
        error={create.error?.message}
        submitLabel="Adicionar à fila"
      >
        <div>
          <label className={labelCls}>Nome do cliente</label>
          <input name="clientName" required className={fieldCls} placeholder="Ex: Lucas Pereira" />
        </div>
        <div>
          <label className={labelCls}>Telefone / WhatsApp</label>
          <input
            name="clientPhone"
            required
            inputMode="numeric"
            className={fieldCls}
            placeholder="(11) 99999-9999"
            onInput={(e) => {
              e.currentTarget.value = formatPhoneBR(e.currentTarget.value);
            }}
          />
        </div>
        <div>
          <label className={labelCls}>Observação (opcional)</label>
          <input name="note" className={fieldCls} placeholder="Ex: corte + barba, prefere o Rafael, sábado à tarde" />
        </div>
      </FormModal>

      <PageHeader
        icon={Hourglass}
        title="Fila de espera"
        subtitle={`${entries.length} cliente${entries.length === 1 ? "" : "s"} aguardando`}
        action={
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/10">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Hourglass className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">Ninguém na fila</p>
          <p className="text-zinc-600 text-sm mt-1">Quando não houver horário, adicione o cliente aqui e avise quando abrir uma vaga.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const wa = `https://wa.me/55${entry.clientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${entry.clientName.split(" ")[0]}! Abriu um horário aqui na barbearia. Quer garantir?`)}`;
            return (
              <div key={entry.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-black flex-shrink-0">
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold flex-shrink-0">
                  {initials(entry.clientName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{entry.clientName}</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {entry.clientPhone}
                    <span className="text-zinc-700">·</span>
                    <Clock className="w-3 h-3" /> {waitingLabel(entry.createdAt)}
                  </p>
                  {entry.note && <p className="text-xs text-zinc-500 mt-1 truncate">{entry.note}</p>}
                </div>
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Avisar no WhatsApp"
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600/15 border border-green-600/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/25 transition-colors flex-shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Avisar</span>
                </a>
                <button
                  onClick={() => remove.mutate(entry.id)}
                  title="Marcar como atendido / remover"
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg hover:bg-zinc-700 transition-colors flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Atendido</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

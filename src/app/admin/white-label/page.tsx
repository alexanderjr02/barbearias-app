"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Crown, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { cn, formatDate } from "@/lib/utils";

const STATUS_FLOW = ["REQUESTED", "IN_PROGRESS", "DELIVERED"] as const;
const STATUS_INFO: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: "Solicitado", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  IN_PROGRESS: { label: "Em andamento", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  DELIVERED: { label: "Entregue", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
};

interface WhiteLabelItem {
  id: string;
  barbershopId: string;
  barbershopName: string;
  logo: string | null;
  primaryColor: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  notes: string | null;
  requestedAt: string;
  updatedAt: string;
}

export default function AdminWhiteLabelPage() {
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-white-label"],
    queryFn: () => apiGet<WhiteLabelItem[]>("/api/admin/white-label"),
  });

  const advance = async (item: WhiteLabelItem) => {
    const idx = STATUS_FLOW.indexOf(item.status as (typeof STATUS_FLOW)[number]);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    await apiPatch(`/api/admin/white-label/${item.id}`, { status: STATUS_FLOW[idx + 1] });
    queryClient.invalidateQueries({ queryKey: ["admin-white-label"] });
  };

  const saveNotes = async (item: WhiteLabelItem) => {
    const notes = notesDraft[item.id];
    if (notes === undefined) return;
    await apiPatch(`/api/admin/white-label/${item.id}`, { notes });
    queryClient.invalidateQueries({ queryKey: ["admin-white-label"] });
  };

  const items = data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={Sparkles}
        title="White Label"
        subtitle="Fila de solicitações de branding personalizado — sem pipeline automático, você avança manualmente"
        accent="purple"
      />

      {!isLoading && items.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <Crown className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhuma barbearia no plano White Label ainda.</p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {item.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.logo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: item.primaryColor }}>
                    {item.barbershopName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{item.barbershopName}</p>
                  <p className="text-xs text-zinc-500">{item.ownerName} · {item.ownerEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600">Solicitado em {formatDate(item.requestedAt)}</span>
                <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", STATUS_INFO[item.status]?.color)}>
                  {STATUS_INFO[item.status]?.label ?? item.status}
                </span>
                {item.status !== "DELIVERED" && (
                  <button onClick={() => advance(item)} className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                    Avançar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={notesDraft[item.id] ?? item.notes ?? ""}
                onChange={(e) => setNotesDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                placeholder="Notas internas (domínio, contato, status da entrega...)"
                className="flex-1 h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <button onClick={() => saveNotes(item)} className="px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

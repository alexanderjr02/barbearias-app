"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquareQuote, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
  staffName: string;
  serviceName: string | null;
}
interface BarberAvg {
  staffId: string;
  name: string;
  average: number;
  count: number;
}
interface ReviewsResponse {
  summary: { average: number; count: number; byBarber: BarberAvg[]; distribution: Record<string, number> };
  reviews: Review[];
}

// O avatar era sorteado numa roda de cinco cores. Isso pintava a tela sem
// dizer nada: a cor do Rafael não significava Rafael, significava o resto da
// divisão do nome dele. Agora a única peça colorida da lista é a primeira do
// ranking, e aí o amarelo quer dizer alguma coisa.
const AVATAR = "bg-zinc-800 text-zinc-300";
const AVATAR_PRIMEIRO = "bg-amber-500 text-black";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return `há ${Math.floor(months / 12)} ano(s)`;
}

function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size, i <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-zinc-700")} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["reviews"], queryFn: () => apiGet<ReviewsResponse>("/api/reviews") });

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const maxDist = summary ? Math.max(1, ...[5, 4, 3, 2, 1].map((s) => summary.distribution?.[s] ?? 0)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader icon={Star} title="Avaliações" subtitle="O que seus clientes acham do atendimento" />

      {isLoading ? (
        <div className="h-52 rounded-3xl bg-zinc-900 border border-zinc-800 animate-pulse" />
      ) : !summary || summary.count === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <MessageSquareQuote className="w-7 h-7 text-amber-400/70" />
          </div>
          <p className="text-zinc-200 font-semibold">Ainda sem avaliações</p>
          <p className="text-zinc-500 text-sm mt-1 max-w-xs">Quando os clientes avaliarem os atendimentos pelo app, elas aparecem aqui em tempo real.</p>
        </div>
      ) : (
        <>
          {/* Hero: average + distribution */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
              <div className="text-center sm:pr-8 sm:border-r border-zinc-800">
                <div className="text-6xl font-black text-white leading-none">{summary.average.toFixed(1)}</div>
                <div className="my-3 flex justify-center"><Stars value={summary.average} size="w-5 h-5" /></div>
                <p className="text-xs text-zinc-500">{summary.count} avaliaç{summary.count === 1 ? "ão" : "ões"}</p>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution?.[star] ?? 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-8 flex items-center gap-0.5 justify-end">
                        {star} <Star className="w-3 h-3 text-zinc-600" />
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(n / maxDist) * 100}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-6 text-right tabular-nums">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Per-barber */}
          {summary.byBarber.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Ranking da equipe
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.byBarber.map((b, i) => (
                  <div key={b.staffId} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0", i === 0 ? AVATAR_PRIMEIRO : AVATAR)}>
                      {initials(b.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Stars value={b.average} size="w-3 h-3" />
                        <span className="text-xs text-zinc-500">{b.average.toFixed(1)} · {b.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews feed */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Comentários</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0", AVATAR)}>
                      {initials(r.clientName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{r.clientName}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {r.staffName}{r.serviceName ? ` · ${r.serviceName}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-600 flex-shrink-0">{timeAgo(r.createdAt)}</span>
                  </div>
                  <Stars value={r.rating} size="w-3.5 h-3.5" />
                  {r.comment && (
                    <p className="text-sm text-zinc-300 leading-relaxed mt-3 relative pl-3 border-l-2 border-amber-500/30">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

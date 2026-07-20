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

const AVATAR_COLORS = [
  "from-amber-500/30 to-amber-600/10 text-amber-300",
  "from-sky-500/30 to-sky-600/10 text-sky-300",
  "from-violet-500/30 to-violet-600/10 text-violet-300",
  "from-emerald-500/30 to-emerald-600/10 text-emerald-300",
  "from-rose-500/30 to-rose-600/10 text-rose-300",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/20 flex items-center justify-center mb-4">
            <MessageSquareQuote className="w-7 h-7 text-amber-400/70" />
          </div>
          <p className="text-zinc-200 font-semibold">Ainda sem avaliações</p>
          <p className="text-zinc-500 text-sm mt-1 max-w-xs">Quando os clientes avaliarem os atendimentos pelo app, elas aparecem aqui em tempo real.</p>
        </div>
      ) : (
        <>
          {/* Hero: average + distribution */}
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8">
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
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all" style={{ width: `${(n / maxDist) * 100}%` }} />
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
                    <div className={cn("w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-black flex-shrink-0", avatarColor(b.name))}>
                      {i === 0 ? "🏆" : initials(b.name)}
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
                    <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-black flex-shrink-0", avatarColor(r.clientName))}>
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

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  Scissors,
  Printer,
  X,
  CalendarDays,
  HandCoins,
} from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { formatCurrency, cn } from "@/lib/utils";

interface Daily {
  date: string;
  totalRevenue: number;
  serviceRevenue: number;
  manualIncome: number;
  manualExpense: number;
  net: number;
  appointmentCount: number;
  avgTicket: number;
  totalCommission: number;
  byMethod: { method: string; amount: number }[];
  byBarber: { staffId: string; name: string; avatar: string | null; revenue: number; count: number; commission: number }[];
  avgDailyRevenue: number;
  vsAveragePct: number;
}

const METHOD_COLORS: Record<string, string> = {
  Pix: "#10B981",
  Dinheiro: "#F59E0B",
  Cartão: "#3B82F6",
  "Cartão de crédito": "#3B82F6",
  "Cartão de débito": "#06B6D4",
  "Não informado": "#71717A",
};
function methodColor(m: string) {
  return METHOD_COLORS[m] ?? "#8B5CF6";
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftDay(key: string, delta: number) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function DailyCashPanel() {
  const [date, setDate] = useState(todayKey());
  const [closeOpen, setCloseOpen] = useState(false);
  const isToday = date === todayKey();

  const { data, isLoading } = useQuery({
    queryKey: ["finance-daily", date],
    queryFn: () => apiGet<Daily>(`/api/finance/daily?date=${date}`),
  });

  const label = new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header + date nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-white leading-tight">Caixa do Dia</h3>
            <p className="text-xs text-zinc-500 capitalize">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(shiftDay(date, -1))} className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={() => setDate(todayKey())} className="px-2.5 h-8 rounded-lg text-xs font-semibold text-amber-400 hover:bg-zinc-800 transition-all flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> Hoje
            </button>
          )}
          <button
            onClick={() => setDate(shiftDay(date, 1))}
            disabled={isToday}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-5 space-y-4">
          <div className="h-20 rounded-xl bg-zinc-800/60 animate-pulse" />
          <div className="h-32 rounded-xl bg-zinc-800/60 animate-pulse" />
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={Wallet}
              iconColor="text-emerald-400"
              label="Entrou hoje"
              value={formatCurrency(data.totalRevenue)}
              foot={
                data.avgDailyRevenue > 0 ? (
                  <span className={cn("inline-flex items-center gap-1 font-semibold", data.vsAveragePct >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {data.vsAveragePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {data.vsAveragePct >= 0 ? "+" : ""}{data.vsAveragePct}% vs média
                  </span>
                ) : null
              }
            />
            <Kpi icon={Scissors} iconColor="text-blue-400" label="Atendimentos" value={String(data.appointmentCount)} foot={<span className="text-zinc-500">concluídos</span>} />
            <Kpi icon={Receipt} iconColor="text-violet-400" label="Ticket médio" value={formatCurrency(data.avgTicket)} foot={<span className="text-zinc-500">por atendimento</span>} />
            <Kpi icon={HandCoins} iconColor="text-amber-400" label="Comissões" value={formatCurrency(data.totalCommission)} foot={<span className="text-zinc-500">a pagar</span>} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* By payment method */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Por forma de pagamento</h4>
              {data.byMethod.length === 0 ? (
                <p className="text-sm text-zinc-600 py-4">Sem entradas neste dia.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.byMethod.map((m) => {
                    const pct = data.totalRevenue > 0 ? (m.amount / data.totalRevenue) * 100 : 0;
                    return (
                      <div key={m.method}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-2 text-zinc-300">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: methodColor(m.method) }} />
                            {m.method}
                          </span>
                          <span className="text-white font-semibold">{formatCurrency(m.amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: methodColor(m.method) }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By barber */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Por barbeiro
              </h4>
              {data.byBarber.length === 0 ? (
                <p className="text-sm text-zinc-600 py-4">Nenhum atendimento concluído.</p>
              ) : (
                <div className="space-y-2">
                  {data.byBarber.map((b) => (
                    <div key={b.staffId} className="flex items-center gap-3 rounded-xl bg-zinc-800/40 border border-zinc-800 px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-xs font-bold flex-shrink-0 overflow-hidden">
                        {b.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.avatar} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          initials(b.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.name}</p>
                        <p className="text-xs text-zinc-500">{b.count} atend. · {formatCurrency(b.revenue)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-zinc-500">comissão</p>
                        <p className="text-sm font-bold text-amber-400">{formatCurrency(b.commission)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Day result + close button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-zinc-800">
            <div className="flex-1 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-zinc-500">Entradas</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(data.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Saídas</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(data.manualExpense)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Resultado</p>
                <p className={cn("text-sm font-black", data.net >= 0 ? "text-amber-400" : "text-red-400")}>{formatCurrency(data.net)}</p>
              </div>
            </div>
            <button
              onClick={() => setCloseOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all whitespace-nowrap"
            >
              <Wallet className="w-4 h-4" /> Fechar caixa
            </button>
          </div>
        </div>
      )}

      {closeOpen && data && <CashCloseModal data={data} dateLabel={label} onClose={() => setCloseOpen(false)} />}
    </div>
  );
}

function Kpi({ icon: Icon, iconColor, label, value, foot }: { icon: React.ElementType; iconColor: string; label: string; value: string; foot?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-800/40 border border-zinc-800 p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", iconColor)} /> {label}
      </div>
      <p className="text-lg font-black text-white leading-none">{value}</p>
      {foot && <p className="text-[11px] mt-1.5">{foot}</p>}
    </div>
  );
}

function CashCloseModal({ data, dateLabel, onClose }: { data: Daily; dateLabel: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:border-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0 print:hidden">
          <h2 className="text-lg font-bold text-white">Fechamento de Caixa</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="text-center">
            <p className="text-xs text-zinc-500 capitalize">{dateLabel}</p>
            <p className="text-3xl font-black text-white mt-1">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-xs text-zinc-500">total que entrou · {data.appointmentCount} atendimentos</p>
          </div>

          <Section title="Conferência por forma de pagamento">
            {data.byMethod.map((m) => (
              <LineItem key={m.method} label={m.method} value={formatCurrency(m.amount)} />
            ))}
            {data.byMethod.length === 0 && <p className="text-sm text-zinc-600">Sem entradas.</p>}
          </Section>

          <Section title="Comissões a pagar">
            {data.byBarber.map((b) => (
              <LineItem key={b.staffId} label={`${b.name} (${b.count})`} value={formatCurrency(b.commission)} />
            ))}
            <LineItem label="Total de comissões" value={formatCurrency(data.totalCommission)} strong />
          </Section>

          <Section title="Resultado do dia">
            <LineItem label="Entradas" value={formatCurrency(data.totalRevenue)} />
            <LineItem label="Saídas (despesas)" value={`- ${formatCurrency(data.manualExpense)}`} />
            <LineItem label="Resultado" value={formatCurrency(data.net)} strong />
          </Section>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0 print:hidden">
          <button onClick={onClose} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-all">
            Fechar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LineItem({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-sm", strong ? "border-t border-zinc-800 pt-2 mt-1" : "")}>
      <span className={strong ? "text-white font-bold" : "text-zinc-400"}>{label}</span>
      <span className={strong ? "text-amber-400 font-black" : "text-white font-medium"}>{value}</span>
    </div>
  );
}

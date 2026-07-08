"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Star, TrendingUp, CheckCircle2, Clock3 } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";

type TabKey = "gestor" | "barbeiro" | "cliente";

const tabs: { key: TabKey; label: string; caption: string }[] = [
  { key: "gestor", label: "Gestor", caption: "Dono ou gerente vê a barbearia inteira em tempo real." },
  { key: "barbeiro", label: "Barbeiro", caption: "Agenda do dia, clientes e comissão, sem depender do computador." },
  { key: "cliente", label: "Cliente", caption: "Escolhe o barbeiro e o serviço como quem folheia um catálogo." },
];

function Bar({ h, active = false }: { h: number; active?: boolean }) {
  return (
    <div className="flex-1 h-16 flex items-end">
      <div
        className={`w-full rounded-t-md ${active ? "bg-[var(--mkt-gold)]" : "bg-white/10"}`}
        style={{ height: `${h}%` }}
      />
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "pending" | "warn" }) {
  const styles = {
    ok: "bg-emerald-400/15 text-emerald-300",
    pending: "bg-white/10 text-[var(--mkt-text-dim)]",
    warn: "bg-rose-400/15 text-rose-300",
  } as const;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[tone]}`}>{label}</span>;
}

export function GestorScreen() {
  return (
    <div className="h-full flex flex-col bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-[var(--mkt-gold)]/25 to-transparent">
        <p className="text-[10px] text-[var(--mkt-text-dim)]">Barbearia do Marcos</p>
        <p className="text-sm font-bold">Olá, Marcos 👋</p>
      </div>
      <div className="px-4 grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] text-[var(--mkt-text-dim)]">Receita hoje</p>
          <p className="text-base font-black">R$ 480</p>
          <p className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +12%
          </p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] text-[var(--mkt-text-dim)]">Agendamentos</p>
          <p className="text-base font-black">12</p>
          <p className="text-[10px] text-[var(--mkt-text-dim)] mt-1">3 em andamento</p>
        </div>
      </div>
      <div className="px-4 mt-3">
        <p className="text-[10px] font-semibold text-[var(--mkt-text-dim)] mb-2">Receita da semana</p>
        <div className="flex items-end gap-1.5 rounded-xl bg-white/5 border border-white/10 p-3">
          {[40, 55, 35, 70, 50, 90, 65].map((h, i) => (
            <Bar key={i} h={h} active={i === 5} />
          ))}
        </div>
      </div>
      <div className="px-4 mt-3 flex-1 overflow-hidden">
        <p className="text-[10px] font-semibold text-[var(--mkt-text-dim)] mb-2">Próximos agendamentos</p>
        <div className="space-y-2">
          {[
            { name: "Diego A.", time: "14:30", status: "ok" as const, label: "Confirmado" },
            { name: "Bruno S.", time: "15:00", status: "pending" as const, label: "Aguardando" },
          ].map((a) => (
            <div key={a.name} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--mkt-gold)]/25 flex items-center justify-center text-[11px] font-bold">
                {a.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{a.name}</p>
                <p className="text-[10px] text-[var(--mkt-text-dim)]">{a.time} · Corte + Barba</p>
              </div>
              <StatusPill label={a.label} tone={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarbeiroScreen() {
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <div className="h-full flex flex-col bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-[var(--mkt-gold)]/25 to-transparent">
        <p className="text-[10px] text-[var(--mkt-text-dim)]">Sua agenda</p>
        <p className="text-sm font-bold">Bom dia, Diego</p>
      </div>
      <div className="px-4 mt-3 flex justify-between">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] text-[var(--mkt-text-dim)]">{d}</span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                i === 2 ? "bg-[var(--mkt-gold)] text-black" : "bg-white/5 text-[var(--mkt-text-dim)]"
              }`}
            >
              {12 + i}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 mt-4 flex-1">
        <p className="text-[10px] font-semibold text-[var(--mkt-text-dim)] mb-2">Hoje · 4 atendimentos</p>
        <div className="space-y-2">
          {[
            { time: "09:00", name: "Carlos M.", service: "Corte social", status: "ok" as const, label: "Concluído" },
            { time: "10:30", name: "Felipe R.", service: "Barba", status: "ok" as const, label: "Concluído" },
            { time: "13:00", name: "André L.", service: "Corte + Barba", status: "pending" as const, label: "Agora" },
            { time: "15:30", name: "Novo cliente", service: "Corte", status: "warn" as const, label: "Sem confirmar" },
          ].map((a) => (
            <div key={a.time} className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
              <div className="flex flex-col items-center w-9">
                <Clock3 className="w-3 h-3 text-[var(--mkt-text-dim)]" />
                <span className="text-[10px] text-[var(--mkt-text-dim)] mt-0.5">{a.time}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{a.name}</p>
                <p className="text-[10px] text-[var(--mkt-text-dim)]">{a.service}</p>
              </div>
              <StatusPill label={a.label} tone={a.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClienteScreen() {
  const barbers = [
    { name: "Diego", tag: "Degradê", active: true },
    { name: "Bruno", tag: "Barba", active: false },
  ];
  const services = [
    { name: "Corte + Barba", meta: "50 min · R$ 65", active: true },
    { name: "Corte social", meta: "30 min · R$ 40", active: false },
  ];
  return (
    <div className="h-full flex flex-col bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="h-20 bg-gradient-to-br from-[var(--mkt-gold)]/40 via-[var(--mkt-gold)]/10 to-transparent relative flex items-end px-4 pb-2">
        <p className="text-xs font-bold">Barbearia do Marcos</p>
      </div>
      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold text-[var(--mkt-text-dim)] mb-2">Escolha o barbeiro</p>
        <div className="flex gap-2">
          {barbers.map((b) => (
            <div
              key={b.name}
              className={`flex-1 rounded-xl p-2.5 border text-center ${
                b.active ? "border-[var(--mkt-gold)] bg-[var(--mkt-gold)]/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="w-9 h-9 mx-auto rounded-full bg-white/10 flex items-center justify-center text-xs font-bold mb-1.5">
                {b.name[0]}
              </div>
              <p className="text-[11px] font-semibold">{b.name}</p>
              <p className="text-[9px] text-[var(--mkt-text-dim)]">{b.tag}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4 flex-1">
        <p className="text-[10px] font-semibold text-[var(--mkt-text-dim)] mb-2">Serviços com Diego</p>
        <div className="space-y-2">
          {services.map((s) => (
            <div
              key={s.name}
              className={`flex items-center gap-2.5 rounded-xl p-2.5 border ${
                s.active ? "border-[var(--mkt-gold)] bg-[var(--mkt-gold)]/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-[var(--mkt-gold)]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">{s.name}</p>
                <p className="text-[10px] text-[var(--mkt-text-dim)]">{s.meta}</p>
              </div>
              {s.active && <CheckCircle2 className="w-4 h-4 text-[var(--mkt-gold)]" />}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-[var(--mkt-gold)] text-black text-center text-xs font-bold py-2.5">
          Confirmar horário
        </div>
        <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-[var(--mkt-text-dim)]">
          <Star className="w-3 h-3 fill-[var(--mkt-gold)] text-[var(--mkt-gold)]" />
          <Star className="w-3 h-3 fill-[var(--mkt-gold)] text-[var(--mkt-gold)]" />
          <Star className="w-3 h-3 fill-[var(--mkt-gold)] text-[var(--mkt-gold)]" />
          <Star className="w-3 h-3 fill-[var(--mkt-gold)] text-[var(--mkt-gold)]" />
          <Star className="w-3 h-3 fill-white/20 text-white/20" />
          <span className="ml-1">242 pontos de fidelidade</span>
        </div>
      </div>
    </div>
  );
}

const screens: Record<TabKey, () => React.JSX.Element> = {
  gestor: GestorScreen,
  barbeiro: BarbeiroScreen,
  cliente: ClienteScreen,
};

export function AppShowcase() {
  const [active, setActive] = useState<TabKey>("gestor");
  const Screen = screens[active];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-12 items-center">
      <div className="order-2 lg:order-1">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                active === tab.key
                  ? "bg-[var(--mkt-gold)] text-black border-[var(--mkt-gold)]"
                  : "border-[var(--mkt-border-strong)] text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)] hover:border-white/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-2xl font-black text-[var(--mkt-text)] mb-3">
              {tabs.find((t) => t.key === active)!.label} — um app, o papel certo
            </h3>
            <p className="text-[var(--mkt-text-dim)] text-base leading-relaxed max-w-md">
              {tabs.find((t) => t.key === active)!.caption}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="order-1 lg:order-2 flex justify-center">
        <div className="mkt-float">
          <PhoneMockup>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Screen />
              </motion.div>
            </AnimatePresence>
          </PhoneMockup>
        </div>
      </div>
    </div>
  );
}

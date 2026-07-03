"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Calendar, DollarSign, AlertTriangle, Star, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "appointment" | "payment" | "stock" | "review" | "system";
  message: string;
  sub?: string;
  time: string;
  read: boolean;
}

const INITIAL: Notification[] = [
  { id: "1", type: "appointment", message: "Lucas Mendes agendou para amanhã", sub: "Corte + Barba às 09:00 • João Silva", time: "2 min", read: false },
  { id: "2", type: "payment", message: "Pagamento recebido", sub: "R$ 55,00 via PIX — Corte + Barba", time: "8 min", read: false },
  { id: "3", type: "stock", message: "Estoque crítico: Óleo de Barba", sub: "3 unidades restantes (mín: 5)", time: "45 min", read: false },
  { id: "4", type: "review", message: "Nova avaliação ⭐ 5 estrelas", sub: "Carlos Souza recebeu elogio de Rafael Torres", time: "1h", read: false },
  { id: "5", type: "appointment", message: "Bruno Dias cancelou o agendamento", sub: "Corte Infantil às 16:00 • hoje", time: "2h", read: true },
  { id: "6", type: "payment", message: "Pagamento recebido", sub: "R$ 45,00 via Cartão — Barba Completa", time: "3h", read: true },
  { id: "7", type: "stock", message: "Estoque crítico: Navalha Descartável", sub: "2 caixas restantes (mín: 3)", time: "4h", read: true },
  { id: "8", type: "system", message: "Relatório semanal disponível", sub: "Receita de R$ 4.540 esta semana (+12%)", time: "6h", read: true },
];

const typeConfig = {
  appointment: { icon: Calendar, bg: "bg-blue-500/15", color: "text-blue-400" },
  payment: { icon: DollarSign, bg: "bg-green-500/15", color: "text-green-400" },
  stock: { icon: AlertTriangle, bg: "bg-red-500/15", color: "text-red-400" },
  review: { icon: Star, bg: "bg-amber-500/15", color: "text-amber-400" },
  system: { icon: Bell, bg: "bg-zinc-700", color: "text-zinc-300" },
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>(INITIAL);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-zinc-950 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Notificações</h3>
              {unread > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                  {unread} nova{unread !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                  <Check className="w-3 h-3" /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-800/60">
            {items.map(notif => {
              const cfg = typeConfig[notif.type];
              const Icon = cfg.icon;
              return (
                <button key={notif.id} onClick={() => markRead(notif.id)}
                  className={cn("w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/3 transition-colors",
                    !notif.read && "bg-white/2"
                  )}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", notif.read ? "text-zinc-400" : "text-white font-medium")}>
                      {notif.message}
                    </p>
                    {notif.sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{notif.sub}</p>}
                    <p className="text-xs text-zinc-600 mt-1">{notif.time} atrás</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-800 text-center">
            <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              Ver todas as notificações →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

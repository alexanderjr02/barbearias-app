"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, Scissors, Phone, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const services = [
  { id: "1", name: "Corte Simples", duration: 30, price: 35 },
  { id: "2", name: "Corte Degradê", duration: 45, price: 45 },
  { id: "3", name: "Corte + Barba", duration: 60, price: 55 },
  { id: "4", name: "Barba Completa", duration: 30, price: 25 },
  { id: "5", name: "Tratamento Capilar", duration: 60, price: 45 },
];

const barbers = [
  { id: "1", name: "João Silva", avatar: "JS" },
  { id: "2", name: "Carlos Souza", avatar: "CS" },
  { id: "3", name: "André Santos", avatar: "AS" },
  { id: "4", name: "Marcos Ferreira", avatar: "MF" },
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30",
];

const today = new Date();
const dates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  return d;
});

export function NewAppointmentModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<typeof services[0] | null>(null);
  const [barber, setBarber] = useState<typeof barbers[0] | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setService(null); setBarber(null);
        setDate(null); setTime(""); setClientName(""); setClientPhone(""); setDone(false);
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const canAdvance = () => {
    if (step === 1) return !!service;
    if (step === 2) return !!barber;
    if (step === 3) return !!date && !!time;
    if (step === 4) return clientName.trim().length >= 2 && clientPhone.trim().length >= 10;
    return false;
  };

  const handleSubmit = () => {
    setDone(true);
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Novo Agendamento</h2>
            {!done && (
              <div className="flex items-center gap-1 mt-1.5">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className={cn("h-1 rounded-full transition-all duration-300",
                    s === step ? "w-6 bg-amber-400" : s < step ? "w-4 bg-amber-400/60" : "w-4 bg-zinc-700"
                  )} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Agendamento criado!</h3>
              <p className="text-zinc-400 text-sm mb-6">O cliente receberá a confirmação via WhatsApp.</p>
              <div className="bg-zinc-800 rounded-xl p-4 text-left space-y-2.5 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Cliente</span>
                  <span className="text-white font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Serviço</span>
                  <span className="text-white font-medium">{service?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Barbeiro</span>
                  <span className="text-white font-medium">{barber?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Data e hora</span>
                  <span className="text-white font-medium">{date ? `${date.getDate()}/${date.getMonth() + 1}` : ""} às {time}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-zinc-700 pt-2.5">
                  <span className="text-zinc-500">Valor</span>
                  <span className="text-amber-400 font-bold">R$ {service?.price},00</span>
                </div>
              </div>
              <button onClick={onClose} className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Service */}
              {step === 1 && (
                <div>
                  <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                    <Scissors className="w-4 h-4" /> Escolha o serviço
                  </p>
                  <div className="space-y-2">
                    {services.map((s) => (
                      <button key={s.id} onClick={() => setService(s)}
                        className={cn("w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all",
                          service?.id === s.id
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                        )}>
                        <div>
                          <p className={cn("font-medium text-sm", service?.id === s.id ? "text-amber-400" : "text-white")}>{s.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{s.duration} min</p>
                        </div>
                        <span className="font-bold text-sm text-zinc-300">R$ {s.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Barber */}
              {step === 2 && (
                <div>
                  <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Escolha o barbeiro
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {barbers.map((b) => (
                      <button key={b.id} onClick={() => setBarber(b)}
                        className={cn("flex flex-col items-center gap-3 p-4 rounded-xl border transition-all",
                          barber?.id === b.id
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                        )}>
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold",
                          barber?.id === b.id ? "bg-amber-500 text-black" : "bg-gradient-to-br from-amber-400/30 to-amber-600/30 text-amber-400"
                        )}>
                          {b.avatar}
                        </div>
                        <p className={cn("text-sm font-medium text-center", barber?.id === b.id ? "text-amber-400" : "text-white")}>{b.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date & Time */}
              {step === 3 && (
                <div>
                  <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Escolha a data
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                    {dates.map((d, i) => (
                      <button key={i} onClick={() => setDate(d)}
                        className={cn("flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all min-w-[64px]",
                          date?.toDateString() === d.toDateString()
                            ? "border-amber-500/60 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                        )}>
                        <span className={cn("text-xs", date?.toDateString() === d.toDateString() ? "text-amber-400" : "text-zinc-500")}>{dayNames[d.getDay()]}</span>
                        <span className={cn("text-lg font-bold", date?.toDateString() === d.toDateString() ? "text-amber-400" : "text-white")}>{d.getDate()}</span>
                        <span className={cn("text-xs", date?.toDateString() === d.toDateString() ? "text-amber-400/70" : "text-zinc-600")}>{monthNames[d.getMonth()]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Escolha o horário
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <button key={slot} onClick={() => setTime(slot)}
                        className={cn("py-2 rounded-lg border text-sm font-medium transition-all",
                          time === slot
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                            : "border-zinc-800 bg-zinc-800/50 text-zinc-300 hover:border-zinc-700"
                        )}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Client Info */}
              {step === 4 && (
                <div>
                  <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Dados do cliente
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Nome completo</label>
                      <input
                        type="text"
                        placeholder="Ex: Lucas Mendes"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all text-sm"
                      />
                    </div>
                    {/* Summary */}
                    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 space-y-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Resumo</p>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">Serviço</span><span className="text-white">{service?.name}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">Barbeiro</span><span className="text-white">{barber?.name}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">Data</span><span className="text-white">{date ? `${date.getDate()}/${date.getMonth() + 1}` : ""} às {time}</span></div>
                      <div className="flex justify-between text-sm border-t border-zinc-700 pt-2"><span className="text-zinc-500">Total</span><span className="text-amber-400 font-bold">R$ {service?.price},00</span></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-700 transition-all">
                Voltar
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canAdvance()}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canAdvance()}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Confirmar agendamento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

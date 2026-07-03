"use client";

import { useState } from "react";
import {
  Scissors,
  Clock,
  Star,
  ChevronLeft,
  CheckCircle,
  MessageCircle,
  Phone,
  MapPin,
  User,
  Calendar,
  Zap,
  ArrowRight,
} from "lucide-react";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { cn, formatCurrency } from "@/lib/utils";

// Mock data - em produção viria do banco via slug
const barbershop = {
  name: "Barbearia do João",
  description: "Especialistas em corte degradê e barba. +15 anos de experiência.",
  phone: "(11) 99999-9999",
  address: "Rua das Barbearias, 123 — São Paulo, SP",
  instagram: "@barbearia_joao",
  primaryColor: "#D4AF37",
  rating: 4.9,
  totalReviews: 342,
};

const services = [
  { id: "1", name: "Corte Simples", duration: 30, price: 35, description: "Corte básico com acabamento perfeito", popular: false },
  { id: "2", name: "Corte Degradê", duration: 45, price: 45, description: "Degradê moderno com acabamento", popular: true },
  { id: "3", name: "Corte + Barba", duration: 60, price: 55, description: "Combo completo — o mais pedido!", popular: true },
  { id: "4", name: "Barba Completa", duration: 30, price: 25, description: "Modelagem e hidratação de barba", popular: false },
  { id: "5", name: "Tratamento Capilar", duration: 60, price: 45, description: "Hidratação e recuperação capilar", popular: false },
];

const barbers = [
  { id: "1", name: "João Silva", role: "Sênior", specialties: "Degradê, Navalhado", rating: 4.9, reviews: 128, avatar: "JS" },
  { id: "2", name: "Carlos Souza", role: "Barbeiro", specialties: "Corte Clássico, Barba", rating: 4.8, reviews: 96, avatar: "CS" },
  { id: "3", name: "André Santos", role: "Barbeiro", specialties: "Tratamentos, Coloração", rating: 4.7, reviews: 74, avatar: "AS" },
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];

const unavailableSlots = ["10:00", "11:30", "14:00", "16:00"];

type Step = "service" | "barber" | "datetime" | "info" | "confirm";

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: Step[] = ["service", "barber", "datetime", "info", "confirm"];
  const stepLabels = ["Serviço", "Barbeiro", "Horário", "Seus dados", "Confirmar"];

  return (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              steps.indexOf(currentStep) === i
                ? "bg-amber-500 text-black"
                : steps.indexOf(currentStep) > i
                ? "bg-green-500 text-white"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {steps.indexOf(currentStep) > i ? "✓" : i + 1}
          </div>
          <span className={cn("text-xs hidden sm:block", steps.indexOf(currentStep) >= i ? "text-zinc-300" : "text-zinc-600")}>
            {stepLabels[i]}
          </span>
          {i < steps.length - 1 && (
            <div className={cn("w-8 h-px", steps.indexOf(currentStep) > i ? "bg-green-500" : "bg-zinc-800")} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<typeof barbers[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const handleBook = () => {
    setIsBooked(true);
  };

  if (isBooked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Agendado!</h2>
          <p className="text-zinc-400 mb-6">
            Seu horário foi reservado com sucesso.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-zinc-500 text-sm">Serviço</span>
              <span className="text-white text-sm font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 text-sm">Barbeiro</span>
              <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 text-sm">Data e hora</span>
              <span className="text-white text-sm font-medium">{selectedDate} às {selectedTime}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-3">
              <span className="text-zinc-500 text-sm">Total</span>
              <span className="text-amber-400 font-bold">{formatCurrency(selectedService?.price || 0)}</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 mb-6">
            Você receberá uma confirmação no WhatsApp em breve. 📱
          </p>
          <button
            onClick={() => {
              setIsBooked(false);
              setStep("service");
              setSelectedService(null);
              setSelectedBarber(null);
              setSelectedDate("");
              setSelectedTime("");
            }}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl"
          >
            Fazer outro agendamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-black text-sm"
            style={{ backgroundColor: barbershop.primaryColor }}
          >
            {barbershop.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">{barbershop.name}</h1>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-amber-400 font-medium">{barbershop.rating}</span>
              <span>({barbershop.totalReviews} avaliações)</span>
            </div>
          </div>
          <a
            href={`https://wa.me/55${barbershop.phone.replace(/\D/g, "")}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-600/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/30 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator currentStep={step} />

        {/* Step: Select Service */}
        {step === "service" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-5">Escolha o serviço</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setStep("barber");
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:border-zinc-600",
                    "bg-zinc-900 border-zinc-800"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{service.name}</p>
                    <p className="text-xs text-zinc-500">{service.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.duration} min
                      </span>
                    </div>
                  </div>
                  <span className="text-amber-400 font-bold">{formatCurrency(service.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Select Barber */}
        {step === "barber" && (
          <div>
            <button onClick={() => setStep("service")} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-5 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Escolha o barbeiro</h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedBarber({ id: "any", name: "Sem preferência", role: "", specialties: "", rating: 0, reviews: 0, avatar: "?" });
                  setStep("datetime");
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg font-bold">
                  ?
                </div>
                <div>
                  <p className="font-semibold text-white">Sem preferência</p>
                  <p className="text-xs text-zinc-500">Será atribuído ao primeiro disponível</p>
                </div>
              </button>
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => {
                    setSelectedBarber(barber);
                    setStep("datetime");
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold">
                    {barber.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{barber.name}</p>
                    <p className="text-xs text-zinc-500">{barber.specialties}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-amber-400 font-bold">{barber.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <div>
            <button onClick={() => setStep("barber")} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-5 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Escolha data e horário</h2>

            <div className="overflow-x-auto pb-2 mb-6">
              <div className="flex gap-2 w-max">
                {dates.map((date) => {
                  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                  const dateStr = date.toLocaleDateString("pt-BR");
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border transition-all min-w-[56px]",
                        selectedDate === dateStr
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      )}
                    >
                      <span className="text-xs">{dayNames[date.getDay()]}</span>
                      <span className="text-lg font-bold">{date.getDate()}</span>
                      <span className="text-xs">{date.toLocaleDateString("pt-BR", { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Horários disponíveis</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlots.map((time) => {
                    const isUnavailable = unavailableSlots.includes(time);
                    return (
                      <button
                        key={time}
                        disabled={isUnavailable}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-2 rounded-lg border text-sm font-medium transition-all",
                          isUnavailable
                            ? "bg-zinc-900/50 border-zinc-800 text-zinc-700 cursor-not-allowed line-through"
                            : selectedTime === time
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {selectedDate && selectedTime && (
              <button
                onClick={() => setStep("info")}
                className="w-full mt-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all"
              >
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* Step: Client info */}
        {step === "info" && (
          <div>
            <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-5 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Seus dados</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome completo *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="João da Silva"
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Celular / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                disabled={!clientName || !clientPhone}
                onClick={() => setStep("confirm")}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revisar agendamento →
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div>
            <button onClick={() => setStep("info")} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-5 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold text-white mb-5">Confirmar agendamento</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Serviço</span>
                <span className="text-white font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Barbeiro</span>
                <span className="text-white font-medium">{selectedBarber?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Data</span>
                <span className="text-white font-medium">{selectedDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Horário</span>
                <span className="text-white font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Duração</span>
                <span className="text-white font-medium">{selectedService?.duration} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Cliente</span>
                <span className="text-white font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-zinc-800 pt-3">
                <span className="text-zinc-400 font-bold">Total</span>
                <span className="text-amber-400 font-black text-lg">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
            </div>
            <button
              onClick={handleBook}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all text-lg"
            >
              ✓ Confirmar agendamento
            </button>
            <p className="text-xs text-zinc-600 text-center mt-3">
              Você receberá uma confirmação no WhatsApp
            </p>
          </div>
        )}

        {/* Barbershop info */}
        <div className="mt-10 pt-6 border-t border-zinc-900">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-600 justify-center">
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{barbershop.address}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{barbershop.phone}</span>
            <span className="flex items-center gap-1.5">📸 {barbershop.instagram}</span>
          </div>
          <p className="text-center text-xs text-zinc-800 mt-4">
            Powered by <span className="text-zinc-700 font-bold">CORTIX</span>
          </p>
        </div>
      </div>

      <ChatbotWidget />
    </div>
  );
}

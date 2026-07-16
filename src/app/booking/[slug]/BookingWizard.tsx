"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Scissors,
  Clock,
  ChevronLeft,
  CheckCircle,
  MessageCircle,
  Phone,
  MapPin,
  Loader2,
  CalendarX,
} from "lucide-react";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { cn, formatCurrency, formatPhoneBR } from "@/lib/utils";

interface Service { id: string; name: string; description: string | null; duration: number; price: number; category: string }
interface Staff { id: string; name: string; role: string; specialties: string | null; avatar: string | null }
export interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  primaryColor: string;
  logo: string | null;
  coverImage: string | null;
  services: Service[];
  staff: Staff[];
}

interface SlotItem { time: string; status: string }
interface DaySlots { isOpen: boolean; openTime: string | null; closeTime: string | null; slots: SlotItem[] }

type Step = "service" | "barber" | "datetime" | "info" | "confirm";
const STEPS: Step[] = ["service", "barber", "datetime", "info", "confirm"];
const STEP_LABELS = ["Serviço", "Barbeiro", "Horário", "Seus dados", "Confirmar"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              idx === i ? "bg-amber-500 text-black" : idx > i ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-500"
            )}
          >
            {idx > i ? "✓" : i + 1}
          </div>
          <span className={cn("text-xs hidden sm:block", idx >= i ? "text-zinc-300" : "text-zinc-600")}>{STEP_LABELS[i]}</span>
          {i < STEPS.length - 1 && <div className={cn("w-8 h-px", idx > i ? "bg-green-500" : "bg-zinc-800")} />}
        </div>
      ))}
    </div>
  );
}

export function BookingWizard({ shop }: { shop: Shop }) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffLabel, setSelectedStaffLabel] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [daySlots, setDaySlots] = useState<DaySlots | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  const accent = shop.primaryColor || "#D4AF37";
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const waNumber = (shop.whatsapp || shop.phone || "").replace(/\D/g, "");
  const cover = shop.coverImage || "/landing/shop-interior.jpg";

  const pickService = (s: Service) => {
    setSelectedService(s);
    setStep(shop.staff.length === 1 ? "datetime" : "barber");
    if (shop.staff.length === 1) {
      setSelectedStaffId(shop.staff[0].id);
      setSelectedStaffLabel(shop.staff[0].name);
    }
  };

  const pickStaff = (staffId: string, label: string) => {
    setSelectedStaffId(staffId);
    setSelectedStaffLabel(label);
    setStep("datetime");
  };

  const loadSlots = async (dKey: string) => {
    if (!selectedService || !selectedStaffId) return;
    setSelectedDate(dKey);
    setSelectedTime("");
    setDaySlots(null);
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/appointments/slots?barbershopId=${shop.id}&staffId=${selectedStaffId}&date=${dKey}&duration=${selectedService.duration}`
      );
      const data = await res.json();
      setDaySlots({ isOpen: data.isOpen, openTime: data.openTime, closeTime: data.closeTime, slots: data.slots ?? [] });
    } catch {
      setDaySlots({ isOpen: false, openTime: null, closeTime: null, slots: [] });
    } finally {
      setLoadingSlots(false);
    }
  };

  const submit = async () => {
    if (!selectedService || !selectedStaffId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopId: shop.id,
          staffId: selectedStaffId,
          serviceId: selectedService.id,
          date: selectedDate,
          startTime: selectedTime,
          endTime: addMinutes(selectedTime, selectedService.duration),
          clientName: clientName.trim(),
          clientPhone,
          clientEmail: clientEmail.trim() || undefined,
          totalPrice: selectedService.price,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Não foi possível agendar. Tente outro horário.");
        setSubmitting(false);
        return;
      }
      setBooked(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  };

  const availableSlots = daySlots?.slots.filter((s) => s.status === "available") ?? [];
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : "";

  if (booked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 font-display">Agendado!</h2>
          <p className="text-zinc-400 mb-6">Seu horário na {shop.name} foi reservado com sucesso.</p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left space-y-3 mb-6">
            <Row label="Serviço" value={selectedService?.name ?? ""} />
            <Row label="Barbeiro" value={selectedStaffLabel} />
            <Row label="Data" value={selectedDateLabel} />
            <Row label="Horário" value={selectedTime} />
            <div className="flex justify-between border-t border-zinc-800 pt-3">
              <span className="text-zinc-500 text-sm">Total</span>
              <span className="text-amber-400 font-bold">{formatCurrency(selectedService?.price || 0)}</span>
            </div>
          </div>
          <p className="text-sm text-zinc-500 mb-6">Você receberá a confirmação no WhatsApp. 📱</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl"
          >
            Concluir
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Cover header */}
      <div className="relative h-40 sm:h-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-black/40" />
      </div>
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative">
        <div className="flex items-end gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-black font-black text-2xl shadow-xl ring-4 ring-zinc-950 overflow-hidden flex-shrink-0"
            style={{ backgroundColor: accent }}
          >
            {shop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              initials(shop.name)
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-black text-white truncate font-display">{shop.name}</h1>
            {(shop.city || shop.state) && (
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {[shop.city, shop.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          {waNumber && (
            <a
              href={`https://wa.me/55${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 border border-green-600/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-600/30 transition-colors flex-shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
        </div>
        {shop.description && <p className="text-sm text-zinc-500 mt-3">{shop.description}</p>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

        {/* Step: service */}
        {step === "service" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-5">Escolha o serviço</h2>
            {shop.services.length === 0 ? (
              <p className="text-zinc-500 text-sm">Esta barbearia ainda não cadastrou serviços.</p>
            ) : (
              <div className="space-y-3">
                {shop.services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => pickService(service)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:border-zinc-600 bg-zinc-900 border-zinc-800"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{service.name}</p>
                      {service.description && <p className="text-xs text-zinc-500 truncate">{service.description}</p>}
                      <span className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" /> {service.duration} min
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold whitespace-nowrap">{formatCurrency(service.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: barber */}
        {step === "barber" && (
          <div>
            <BackButton onClick={() => setStep("service")} />
            <h2 className="text-xl font-bold text-white mb-5">Escolha o barbeiro</h2>
            <div className="space-y-3">
              <button
                onClick={() => pickStaff(shop.staff[0].id, "Sem preferência")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg font-bold">?</div>
                <div>
                  <p className="font-semibold text-white">Sem preferência</p>
                  <p className="text-xs text-zinc-500">Atribuímos ao primeiro disponível</p>
                </div>
              </button>
              {shop.staff.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => pickStaff(barber.id, barber.name)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold overflow-hidden">
                    {barber.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      initials(barber.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{barber.name}</p>
                    {barber.specialties && <p className="text-xs text-zinc-500 truncate">{barber.specialties}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: datetime */}
        {step === "datetime" && (
          <div>
            <BackButton onClick={() => setStep(shop.staff.length === 1 ? "service" : "barber")} />
            <h2 className="text-xl font-bold text-white mb-5">Escolha data e horário</h2>

            <div className="overflow-x-auto pb-2 mb-6">
              <div className="flex gap-2 w-max">
                {dates.map((date) => {
                  const key = dateKey(date);
                  return (
                    <button
                      key={key}
                      onClick={() => loadSlots(key)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border transition-all min-w-[56px]",
                        selectedDate === key
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                      )}
                    >
                      <span className="text-xs">{DAY_NAMES[date.getDay()]}</span>
                      <span className="text-lg font-bold">{date.getDate()}</span>
                      <span className="text-xs">{date.toLocaleDateString("pt-BR", { month: "short" })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-10 text-zinc-500 gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando horários…
                  </div>
                ) : !daySlots?.isOpen ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-2">
                    <CalendarX className="w-6 h-6" />
                    <p className="text-sm">Fechado neste dia. Escolha outra data.</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-2">
                    <CalendarX className="w-6 h-6" />
                    <p className="text-sm">Sem horários livres neste dia.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Horários disponíveis</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {daySlots.slots.map((slot) => {
                        const unavailable = slot.status !== "available";
                        return (
                          <button
                            key={slot.time}
                            disabled={unavailable}
                            onClick={() => setSelectedTime(slot.time)}
                            className={cn(
                              "py-2 rounded-lg border text-sm font-medium transition-all",
                              unavailable
                                ? "bg-zinc-900/50 border-zinc-800 text-zinc-700 cursor-not-allowed line-through"
                                : selectedTime === slot.time
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                            )}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
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

        {/* Step: info */}
        {step === "info" && (
          <div>
            <BackButton onClick={() => setStep("datetime")} />
            <h2 className="text-xl font-bold text-white mb-5">Seus dados</h2>
            <div className="space-y-4">
              <Field label="Nome completo *">
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="João da Silva"
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </Field>
              <Field label="Celular / WhatsApp *">
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatPhoneBR(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </Field>
              <Field label="E-mail (opcional)">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </Field>
              <button
                disabled={!clientName || clientPhone.replace(/\D/g, "").length < 10}
                onClick={() => setStep("confirm")}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revisar agendamento →
              </button>
            </div>
          </div>
        )}

        {/* Step: confirm */}
        {step === "confirm" && (
          <div>
            <BackButton onClick={() => setStep("info")} />
            <h2 className="text-xl font-bold text-white mb-5">Confirmar agendamento</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 mb-6">
              <Row label="Serviço" value={selectedService?.name ?? ""} />
              <Row label="Barbeiro" value={selectedStaffLabel} />
              <Row label="Data" value={selectedDateLabel} />
              <Row label="Horário" value={selectedTime} />
              <Row label="Duração" value={`${selectedService?.duration} min`} />
              <Row label="Cliente" value={clientName} />
              <div className="flex justify-between border-t border-zinc-800 pt-3">
                <span className="text-zinc-400 font-bold">Total</span>
                <span className="text-amber-400 font-black text-lg">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-xs text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-all text-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "✓ Confirmar agendamento"}
            </button>
            <p className="text-xs text-zinc-600 text-center mt-3">Você receberá uma confirmação no WhatsApp</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-zinc-900">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-600 justify-center">
            {shop.address && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{shop.address}</span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{shop.phone}</span>
            )}
            {shop.instagram && <span className="flex items-center gap-1.5">📸 @{shop.instagram.replace(/^@/, "")}</span>}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-zinc-500 flex-shrink-0">{label}</span>
      <span className="text-white font-medium text-right capitalize">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">{label}</label>
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-5 transition-colors">
      <ChevronLeft className="w-4 h-4" /> Voltar
    </button>
  );
}

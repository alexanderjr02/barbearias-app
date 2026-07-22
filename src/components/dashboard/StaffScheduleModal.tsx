"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Clock, CalendarOff, Plus, Trash2, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { DatePicker } from "@/components/ui/DatePicker";

interface Props {
  staffId: string;
  staffName: string;
  onClose: () => void;
}

interface ApiAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

interface ApiWorkingHour {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface AvailabilityResponse {
  availability: ApiAvailability[];
  shopHours: ApiWorkingHour[];
}

interface ApiTimeOff {
  id: string;
  date: string;
  reason: string | null;
}

type DayMode = "default" | "custom" | "closed";

interface DayState {
  dayOfWeek: number;
  mode: DayMode;
  startTime: string;
  endTime: string;
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// StaffTimeOff.date is a UTC-midnight instant (from a "YYYY-MM-DD" string,
// see src/lib/dateRange.ts) — formatting it with the browser's local
// timezone would shift it back a day for any negative UTC offset (e.g.
// Brazil), so this reads the calendar day back out in UTC instead.
function formatBlockedDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso)
  );
}

function describeShopDay(shopHours: ApiWorkingHour[], dayOfWeek: number) {
  const h = shopHours.find((w) => w.dayOfWeek === dayOfWeek);
  if (!h || !h.isOpen) return "Barbearia fechada";
  return `Padrão: ${h.openTime} às ${h.closeTime}`;
}

export function StaffScheduleModal({ staffId, staffName, onClose }: Props) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<DayState[] | null>(null);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-availability", staffId],
    queryFn: () => apiGet<AvailabilityResponse>(`/api/staff/${staffId}/availability`),
  });

  const { data: timeOff = [] } = useQuery({
    queryKey: ["staff-time-off", staffId],
    queryFn: () => apiGet<ApiTimeOff[]>(`/api/staff/${staffId}/time-off`),
  });

  // Seed local editable state from the fetched availability — adjusted during
  // render (not an effect) since it only reacts to `data` arriving/changing.
  const [syncedData, setSyncedData] = useState<AvailabilityResponse | undefined>(undefined);
  if (data && data !== syncedData) {
    setSyncedData(data);
    setDays(
      Array.from({ length: 7 }, (_, dayOfWeek): DayState => {
        const override = data.availability.find((a) => a.dayOfWeek === dayOfWeek);
        if (!override) return { dayOfWeek, mode: "default", startTime: "09:00", endTime: "18:00" };
        return {
          dayOfWeek,
          mode: override.isAvailable ? "custom" : "closed",
          startTime: override.isAvailable ? override.startTime : "09:00",
          endTime: override.isAvailable ? override.endTime : "18:00",
        };
      })
    );
  }

  const saveSchedule = useMutation({
    mutationFn: () => apiPut(`/api/staff/${staffId}/availability`, { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-availability", staffId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    },
  });

  const addBlock = useMutation({
    mutationFn: () => apiPost(`/api/staff/${staffId}/time-off`, { date: blockDate, reason: blockReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-time-off", staffId] });
      setBlockDate("");
      setBlockReason("");
    },
  });

  const removeBlock = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/staff/${staffId}/time-off/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-time-off", staffId] }),
  });

  const updateDay = (dayOfWeek: number, patch: Partial<DayState>) => {
    setDays((prev) => prev && prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Horário de {staffName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Autonomia total sobre a própria agenda</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading || !days ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Horário semanal
                </p>
                <div className="space-y-3">
                  {days.map((d) => (
                    <div key={d.dayOfWeek} className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-medium text-white w-24 flex-shrink-0">{DAY_NAMES[d.dayOfWeek]}</span>
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                          {([
                            { mode: "default" as const, label: "Padrão" },
                            { mode: "custom" as const, label: "Próprio" },
                            { mode: "closed" as const, label: "Folga" },
                          ]).map(({ mode, label }) => (
                            <button
                              key={mode}
                              onClick={() => updateDay(d.dayOfWeek, { mode })}
                              className={cn(
                                "px-2.5 h-7 text-xs font-semibold rounded-md transition-all",
                                d.mode === mode ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-zinc-200"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 pl-0">
                        {d.mode === "default" && data && (
                          <p className="text-xs text-zinc-500">{describeShopDay(data.shopHours, d.dayOfWeek)}</p>
                        )}
                        {d.mode === "closed" && <p className="text-xs text-zinc-500">Não atende nesse dia</p>}
                        {d.mode === "custom" && (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="time"
                              value={d.startTime}
                              onChange={(e) => updateDay(d.dayOfWeek, { startTime: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <span className="text-zinc-500 text-sm">até</span>
                            <input
                              type="time"
                              value={d.endTime}
                              onChange={(e) => updateDay(d.dayOfWeek, { endTime: e.target.value })}
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => saveSchedule.mutate()}
                  disabled={saveSchedule.isPending}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold rounded-lg hover:opacity-90 transition-all text-sm disabled:opacity-60"
                >
                  {saved ? <><CheckCircle className="w-4 h-4" /> Salvou!</> : "Salvar horário semanal"}
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                  <CalendarOff className="w-4 h-4" /> Folgas e bloqueios
                </p>
                <div className="flex items-end gap-2 flex-wrap">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Data</label>
                    <div className="w-[160px]">
                      <DatePicker
                        value={blockDate}
                        onChange={setBlockDate}
                        min={new Date().toISOString().slice(0, 10)}
                        placeholder="Escolher dia"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-zinc-500 mb-1">Motivo (opcional)</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Férias, consulta..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => addBlock.mutate()}
                    disabled={!blockDate || addBlock.isPending}
                    className="h-[34px] inline-flex items-center gap-1.5 px-3 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg hover:bg-zinc-700 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Bloquear
                  </button>
                </div>

                {addBlock.isError && (
                  <p className="text-xs text-red-400 mt-2">{addBlock.error instanceof Error ? addBlock.error.message : "Erro ao bloquear dia"}</p>
                )}

                <div className="mt-4 space-y-2">
                  {timeOff.length === 0 && <p className="text-xs text-zinc-600">Nenhuma folga marcada.</p>}
                  {timeOff.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-800">
                      <div>
                        <p className="text-sm text-white font-medium">{formatBlockedDate(t.date)}</p>
                        {t.reason && <p className="text-xs text-zinc-500">{t.reason}</p>}
                      </div>
                      <button
                        onClick={() => removeBlock.mutate(t.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        title="Remover bloqueio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

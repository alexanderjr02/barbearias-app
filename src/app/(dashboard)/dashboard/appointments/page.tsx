"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Phone, Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, LayoutGrid, Grid3x3,
  Columns3, X, Clock, DollarSign, CheckCircle2, XCircle, CalendarClock, Plus, Crown,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { apiGet } from "@/lib/apiClient";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NewAppointmentModal } from "@/components/dashboard/NewAppointmentModal";
import { Skeleton } from "@/components/ui/Skeleton";

interface ApiAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  staff: { id: string; name: string; avatar?: string | null };
  service: { name: string };
}

interface MeResponse {
  barbershopId: string;
}

interface ApiStaff {
  id: string;
  name: string;
  avatar: string | null;
  isActive: boolean;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  source: "blocked" | "staff" | "shop";
}

type ViewMode = "month" | "week" | "day" | "list";

const STATUS_STYLES: Record<string, { label: string; text: string; bg: string; chip: string; block: string; dot: string }> = {
  SCHEDULED: { label: "Agendado", text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", chip: "bg-blue-500/20 text-blue-200", block: "bg-blue-500/15 border-blue-500/40 text-blue-100", dot: "bg-blue-400" },
  CONFIRMED: { label: "Confirmado", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", chip: "bg-emerald-500/20 text-emerald-200", block: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100", dot: "bg-emerald-400" },
  IN_PROGRESS: { label: "Em andamento", text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", chip: "bg-yellow-500/20 text-yellow-100", block: "bg-yellow-500/15 border-yellow-500/40 text-yellow-100", dot: "bg-yellow-400" },
  COMPLETED: { label: "Concluído", text: "text-zinc-300", bg: "bg-zinc-500/10 border-zinc-500/20", chip: "bg-zinc-700/60 text-zinc-300", block: "bg-zinc-700/40 border-zinc-600 text-zinc-300", dot: "bg-zinc-400" },
  CANCELLED: { label: "Cancelado", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20", chip: "bg-red-500/20 text-red-200 line-through decoration-red-400/60", block: "bg-red-500/10 border-red-500/30 text-red-200 line-through decoration-red-400/60", dot: "bg-red-400" },
  NO_SHOW: { label: "Não compareceu", text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", chip: "bg-orange-500/20 text-orange-200", block: "bg-orange-500/10 border-orange-500/30 text-orange-200", dot: "bg-orange-400" },
};
const statusOf = (s: string) => STATUS_STYLES[s] ?? STATUS_STYLES.SCHEDULED;

// Stable per-barber color identity used everywhere a barber needs to be told
// apart at a glance (month chips, week blocks, day columns) — mirrors the
// same palette the Flutter app uses so a barber's color means the same thing
// on the phone and the desktop.
const BARBER_COLORS = [
  { dot: "bg-amber-400", text: "text-amber-400", ring: "ring-amber-400/50", bg: "bg-amber-400/15" },
  { dot: "bg-sky-400", text: "text-sky-400", ring: "ring-sky-400/50", bg: "bg-sky-400/15" },
  { dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-400/50", bg: "bg-emerald-400/15" },
  { dot: "bg-fuchsia-400", text: "text-fuchsia-400", ring: "ring-fuchsia-400/50", bg: "bg-fuchsia-400/15" },
  { dot: "bg-rose-400", text: "text-rose-400", ring: "ring-rose-400/50", bg: "bg-rose-400/15" },
  { dot: "bg-cyan-400", text: "text-cyan-400", ring: "ring-cyan-400/50", bg: "bg-cyan-400/15" },
  { dot: "bg-violet-400", text: "text-violet-400", ring: "ring-violet-400/50", bg: "bg-violet-400/15" },
  { dot: "bg-lime-400", text: "text-lime-400", ring: "ring-lime-400/50", bg: "bg-lime-400/15" },
];
function barberColorOf(staffId: string, orderedIds: string[]) {
  const idx = orderedIds.indexOf(staffId);
  return BARBER_COLORS[idx >= 0 ? idx % BARBER_COLORS.length : 0];
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const RANGE_START_HOUR = 7;
const RANGE_END_HOUR = 21;
const HOUR_HEIGHT = 52;

function addUtcDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function keyFromIso(iso: string) {
  return iso.slice(0, 10);
}
function todayUtc() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function getMonthGrid(anchor: Date) {
  const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const gridStart = addUtcDays(first, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addUtcDays(gridStart, i));
}
function getWeekGrid(anchor: Date) {
  const start = addUtcDays(anchor, -anchor.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => addUtcDays(start, i));
}
function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function timeLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function formatFreeHours(totalMinutes: number) {
  const clamped = Math.max(0, totalMinutes);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0 && m === 0) return "0h";
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
function nowMinutesLocal() {
  // Shop is fixed America/Sao_Paulo (UTC-3, no DST since 2019).
  const shifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}
interface TimeRange {
  start: number;
  end: number;
}
function freeSegments(rangeStart: number, rangeEnd: number, busy: TimeRange[]): TimeRange[] {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  const free: TimeRange[] = [];
  let cursor = rangeStart;
  for (const b of sorted) {
    const start = Math.max(b.start, rangeStart);
    const end = Math.min(b.end, rangeEnd);
    if (start >= end) continue;
    if (start > cursor) free.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < rangeEnd) free.push({ start: cursor, end: rangeEnd });
  return free;
}

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [viewDate, setViewDate] = useState(todayUtc());
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailDayKey, setDetailDayKey] = useState<string | null>(null);
  const [detailStaffId, setDetailStaffId] = useState<string | null>(null);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<{ key: string; day: Date; top: number; left: number } | null>(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => apiGet<MeResponse>("/api/auth/me") });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff-lite"], queryFn: () => apiGet<ApiStaff[]>("/api/staff") });

  const monthGrid = useMemo(() => getMonthGrid(viewDate), [viewDate]);
  const weekGrid = useMemo(() => getWeekGrid(viewDate), [viewDate]);
  const rangeStart = viewMode === "month" ? monthGrid[0] : viewMode === "week" ? weekGrid[0] : viewDate;
  const rangeEnd = viewMode === "month" ? monthGrid[41] : viewMode === "week" ? weekGrid[6] : viewDate;
  const hasRange = viewMode !== "list";

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", me?.barbershopId, staffFilter, hasRange ? dayKey(rangeStart) : "all", hasRange ? dayKey(rangeEnd) : "all"],
    queryFn: () => {
      const params = new URLSearchParams({ barbershopId: me!.barbershopId });
      if (staffFilter !== "all") params.set("staffId", staffFilter);
      if (hasRange) {
        params.set("from", dayKey(rangeStart));
        params.set("to", dayKey(rangeEnd));
      }
      return apiGet<ApiAppointment[]>(`/api/appointments?${params.toString()}`);
    },
    enabled: !!me?.barbershopId,
  });

  // Batched open/close hours for every active staff across the visible
  // range — the single source powering free-hours everywhere (month badge,
  // week badge + sparkline, day columns) so "Xh livres" means the same
  // thing no matter which view you're looking at.
  const { data: scheduleByStaff = {} } = useQuery({
    queryKey: ["staff-schedule-range", me?.barbershopId, dayKey(rangeStart), dayKey(rangeEnd)],
    queryFn: () => apiGet<Record<string, Record<string, DaySchedule>>>(`/api/staff/month-schedule?from=${dayKey(rangeStart)}&to=${dayKey(rangeEnd)}`),
    enabled: !!me?.barbershopId && hasRange,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, ApiAppointment[]>();
    for (const apt of appointments) {
      const k = keyFromIso(apt.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(apt);
    }
    for (const list of map.values()) list.sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
    return map;
  }, [appointments]);

  const teamColumns = useMemo(
    () => staffList.filter((s) => s.isActive && (staffFilter === "all" || s.id === staffFilter)),
    [staffList, staffFilter]
  );
  const orderedStaffIds = useMemo(() => staffList.filter((s) => s.isActive).map((s) => s.id), [staffList]);
  const showTeamColors = staffFilter === "all" && teamColumns.length > 1;

  const topEarnerId = useMemo(() => {
    if (!showTeamColors) return null;
    const revenue = new Map<string, number>();
    for (const apt of appointments) {
      if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") continue;
      revenue.set(apt.staff.id, (revenue.get(apt.staff.id) ?? 0) + apt.totalPrice);
    }
    let best: { id: string; value: number } | null = null;
    for (const [id, value] of revenue) {
      if (!best || value > best.value) best = { id, value };
    }
    return best?.id ?? null;
  }, [appointments, showTeamColors]);

  // Shared by month/week badges, the hover preview, and the day view — so a
  // gestor sees the exact same "Xh livres" for the exact same staff+day
  // everywhere in the page.
  const computeFreeInfo = (staffId: string, k: string) => {
    const sched = scheduleByStaff[staffId]?.[k];
    if (!sched || !sched.isOpen || !sched.openTime || !sched.closeTime) {
      return { isOpen: false, freeMinutes: 0, segments: [] as TimeRange[], label: sched?.source === "blocked" ? "Folga" : "Fechado" };
    }
    const openMin = minutesOf(sched.openTime);
    const closeMin = minutesOf(sched.closeTime);
    const busy = (byDay.get(k) ?? [])
      .filter((a) => a.staff.id === staffId && a.status !== "CANCELLED" && a.status !== "NO_SHOW")
      .map((a) => ({ start: minutesOf(a.startTime), end: minutesOf(a.endTime || a.startTime) }));
    const segments = freeSegments(openMin, closeMin, busy);
    const freeMinutes = segments.reduce((acc, s) => acc + (s.end - s.start), 0);
    return { isOpen: true, freeMinutes, segments, label: `${formatFreeHours(freeMinutes)} livres` };
  };

  const freeCapacityForDay = (k: string) => {
    let free = 0;
    let capacity = 0;
    for (const s of teamColumns) {
      const info = computeFreeInfo(s.id, k);
      if (info.isOpen) {
        free += info.freeMinutes;
        const sched = scheduleByStaff[s.id]?.[k];
        if (sched?.openTime && sched?.closeTime) capacity += minutesOf(sched.closeTime) - minutesOf(sched.openTime);
      }
    }
    return { free, capacity };
  };

  const filteredList = appointments.filter((a) => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchSearch =
      a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.service.name.toLowerCase().includes(search.toLowerCase()) ||
      a.staff.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const goPrev = () => {
    setHoverPreview(null);
    if (viewMode === "month") setViewDate(new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() - 1, 1)));
    else if (viewMode === "week") setViewDate(addUtcDays(viewDate, -7));
    else if (viewMode === "day") setViewDate(addUtcDays(viewDate, -1));
  };
  const goNext = () => {
    setHoverPreview(null);
    if (viewMode === "month") setViewDate(new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 1)));
    else if (viewMode === "week") setViewDate(addUtcDays(viewDate, 7));
    else if (viewMode === "day") setViewDate(addUtcDays(viewDate, 1));
  };
  const goToday = () => setViewDate(todayUtc());

  const periodLabel =
    viewMode === "month"
      ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(viewDate)
      : viewMode === "week"
        ? `${weekGrid[0].getUTCDate()} ${new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(weekGrid[0])} – ${weekGrid[6].getUTCDate()} ${new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(weekGrid[6])}`
        : viewMode === "day"
          ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(viewDate)
          : "Todos os agendamentos";

  const detailApts = detailDayKey
    ? (byDay.get(detailDayKey) ?? []).filter((a) => !detailStaffId || a.staff.id === detailStaffId)
    : [];

  const closeDetail = () => {
    setDetailDayKey(null);
    setDetailStaffId(null);
  };

  const periodStats = useMemo(() => {
    const cancelled = appointments.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW").length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const active = appointments.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
    const revenue = active.reduce((acc, a) => acc + a.totalPrice, 0);
    return { total: appointments.length, completed, cancelled, revenue };
  }, [appointments]);

  return (
    <div className="space-y-6">
      <NewAppointmentModal open={newApptOpen} onClose={() => setNewApptOpen(false)} />

      {/* Shared hover preview — one team barber avatar per row with their
          free-hour label for the hovered day. position: fixed so it escapes
          any overflow-hidden ancestor (month grid cells, week header row). */}
      {hoverPreview && teamColumns.length > 0 && (
        <div
          className="fixed z-[70] w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-3.5 pointer-events-none"
          style={{ top: hoverPreview.top, left: Math.min(hoverPreview.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 328) }}
        >
          <p className="text-xs font-bold text-white capitalize mb-3">
            {new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(hoverPreview.day)}
          </p>
          <div className="space-y-3">
            {teamColumns.map((s) => {
              const info = computeFreeInfo(s.id, dayKey(hoverPreview.day));
              const color = barberColorOf(s.id, orderedStaffIds);
              const isTop = s.id === topEarnerId;
              const shownSegments = info.segments.slice(0, 3);
              const extraCount = info.segments.length - shownSegments.length;
              return (
                <div key={s.id} className="flex items-start gap-2.5">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-black flex-shrink-0 mt-0.5 overflow-hidden", color.dot)}>
                    {s.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      s.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-zinc-200 font-medium truncate">{s.name}</p>
                      {isTop && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {info.isOpen && <span className="text-[10px] text-zinc-500 flex-shrink-0">· {info.label}</span>}
                    </div>
                    {info.isOpen ? (
                      shownSegments.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {shownSegments.map((seg, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-md px-1.5 py-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              {timeLabel(seg.start)}–{timeLabel(seg.end)}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="text-[10px] font-medium text-zinc-500 px-1 py-0.5">+{extraCount}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-600 mt-1">Agenda cheia</p>
                      )
                    ) : (
                      <p className="text-[10px] text-zinc-600 mt-1">{info.label}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail modal */}
      {detailDayKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-white capitalize">
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(detailDayKey))}
                </h2>
                <p className="text-xs text-zinc-500">{detailApts.length} agendamento{detailApts.length !== 1 ? "s" : ""}{detailStaffId ? ` · ${staffList.find((s) => s.id === detailStaffId)?.name ?? ""}` : ""}</p>
              </div>
              <button onClick={closeDetail} className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
              {detailApts.length === 0 && <p className="text-sm text-zinc-500 text-center py-10">Nenhum agendamento neste dia.</p>}
              {detailApts.map((apt) => {
                const status = statusOf(apt.status);
                return (
                  <div key={apt.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className={cn("w-1.5 h-12 rounded-full flex-shrink-0", status.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{apt.clientName}</p>
                      <p className="text-xs text-zinc-500">
                        {apt.service.name} · {apt.staff.name} · {apt.startTime}
                      </p>
                      <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {apt.clientPhone}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("text-xs font-medium", status.text)}>{status.label}</p>
                      <p className="text-sm font-bold text-amber-400">{formatCurrency(apt.totalPrice)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <PageHeader
        icon={CalendarIcon}
        title="Agenda"
        subtitle={hasRange ? `${appointments.length} agendamento${appointments.length !== 1 ? "s" : ""} no período` : `${appointments.length} agendamentos recentes`}
        action={
          <button onClick={() => setNewApptOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-zinc-950 text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Novo agendamento
          </button>
        }
      />

      {/* Period stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <CalendarClock className="w-4 h-4 text-blue-400 mb-2" />
          <p className="text-2xl font-black text-white">{periodStats.total}</p>
          <p className="text-xs text-zinc-500">{hasRange ? "No período" : "Recentes"}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
          <p className="text-2xl font-black text-white">{periodStats.completed}</p>
          <p className="text-xs text-zinc-500">Concluídos</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <XCircle className="w-4 h-4 text-red-400 mb-2" />
          <p className="text-2xl font-black text-white">{periodStats.cancelled}</p>
          <p className="text-xs text-zinc-500">Cancelados / faltas</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <DollarSign className="w-4 h-4 text-amber-400 mb-2" />
          <p className="text-2xl font-black text-white">{formatCurrency(periodStats.revenue)}</p>
          <p className="text-xs text-zinc-500">Receita prevista</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            <button onClick={goPrev} disabled={viewMode === "list"} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} disabled={viewMode === "list"} className="px-3 h-8 text-xs font-semibold text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none">
              Hoje
            </button>
            <button onClick={goNext} disabled={viewMode === "list"} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-sm font-bold text-white capitalize">{periodLabel}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Todos os barbeiros</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            {([
              { mode: "month" as const, icon: Grid3x3, label: "Mês" },
              { mode: "week" as const, icon: LayoutGrid, label: "Semana" },
              { mode: "day" as const, icon: Columns3, label: "Dia" },
              { mode: "list" as const, icon: List, label: "Lista" },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => { setHoverPreview(null); setViewMode(mode); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg transition-all",
                  viewMode === mode ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List-view-only filters */}
      {viewMode === "list" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  statusFilter === s ? "bg-amber-500/20 border border-amber-500/40 text-amber-400" : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
                )}
              >
                {s === "all" ? "Todos" : statusOf(s).label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MONTH VIEW — a single unified calendar (not split per-barber): each
          day cell shows up to 4 colored dots (one per barber with a booking)
          plus a muted "Xh livres" hint; clicking drills straight into the
          Day view instead of a modal, and a legend row explains the colors
          with a crown on whoever's leading in revenue this period. */}
      {viewMode === "month" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {showTeamColors && (
            <div className="flex items-center gap-4 flex-wrap px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/40">
              {teamColumns.map((s) => {
                const color = barberColorOf(s.id, orderedStaffIds);
                return (
                  <div key={s.id} className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", color.dot)} />
                    <span className="text-xs text-zinc-400">{s.name.split(" ")[0]}</span>
                    {s.id === topEarnerId && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider py-2.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-zinc-800">
            {monthGrid.map((day) => {
              const k = dayKey(day);
              const dayApts = byDay.get(k) ?? [];
              const isCurrentMonth = day.getUTCMonth() === viewDate.getUTCMonth();
              const isToday = k === dayKey(todayUtc());
              const staffIdsToday = [...new Set(dayApts.map((a) => a.staff.id))];
              const { free, capacity } = hasRange ? freeCapacityForDay(k) : { free: 0, capacity: 0 };
              return (
                <div
                  key={k}
                  onClick={() => {
                    setHoverPreview(null);
                    setViewMode("day");
                    setViewDate(day);
                  }}
                  onMouseEnter={(e) => {
                    if (!showTeamColors) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverPreview({ key: k, day, top: rect.bottom + 6, left: rect.left });
                  }}
                  onMouseLeave={() => setHoverPreview(null)}
                  className={cn(
                    "min-h-[100px] p-1.5 border-r border-b border-zinc-800 flex flex-col gap-1 cursor-pointer hover:bg-white/[0.03]",
                    !isCurrentMonth && "bg-black/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0",
                      isToday ? "bg-amber-500 text-black" : isCurrentMonth ? "text-zinc-300" : "text-zinc-700"
                    )}>
                      {day.getUTCDate()}
                    </span>
                    {isCurrentMonth && capacity > 0 && (
                      <span className="text-[9px] text-zinc-600 font-medium">{formatFreeHours(free)}</span>
                    )}
                  </div>
                  {showTeamColors && staffIdsToday.length > 0 && (
                    <div className="flex items-center gap-1">
                      {staffIdsToday.slice(0, 4).map((id) => (
                        <span key={id} className={cn("w-1.5 h-1.5 rounded-full", barberColorOf(id, orderedStaffIds).dot)} />
                      ))}
                    </div>
                  )}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayApts.slice(0, 3).map((apt) => (
                      <div key={apt.id} className={cn("text-[10px] px-1.5 py-0.5 rounded truncate font-medium", statusOf(apt.status).chip)}>
                        {apt.startTime} {apt.clientName}
                      </div>
                    ))}
                    {dayApts.length > 3 && (
                      <p className="text-[10px] text-amber-400 font-semibold px-1.5">+{dayApts.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="space-y-3">
          {showTeamColors && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
              {teamColumns.map((s) => {
                const color = barberColorOf(s.id, orderedStaffIds);
                const daily = weekGrid.map((d) => (byDay.get(dayKey(d)) ?? []).filter((a) => a.staff.id === s.id && a.status !== "CANCELLED" && a.status !== "NO_SHOW"));
                const total = daily.reduce((acc, list) => acc + list.length, 0);
                const revenue = daily.reduce((acc, list) => acc + list.reduce((a, apt) => a + apt.totalPrice, 0), 0);
                const weekMax = Math.max(1, ...daily.map((list) => list.length));
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-black flex-shrink-0 overflow-hidden", color.dot)}>
                      {s.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        s.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 w-20 truncate flex items-center gap-1">
                      {s.name.split(" ")[0]}
                      {s.id === topEarnerId && <Crown className="w-3 h-3 text-amber-400" />}
                    </span>
                    <div className="flex items-end gap-1">
                      {daily.map((list, i) => (
                        <div key={i} className={cn("w-2.5 rounded-sm", list.length > 0 ? color.dot : "bg-zinc-800")} style={{ height: Math.max(4, (list.length / weekMax) * 16) }} />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-500 ml-auto flex-shrink-0">{total} · {formatCurrency(revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="border-b border-zinc-800" />
                {weekGrid.map((d) => {
                  const k = dayKey(d);
                  const isToday = k === dayKey(todayUtc());
                  const { free, capacity } = hasRange ? freeCapacityForDay(k) : { free: 0, capacity: 0 };
                  return (
                    <div
                      key={k}
                      onClick={() => { setHoverPreview(null); setViewMode("day"); setViewDate(d); }}
                      onMouseEnter={(e) => {
                        if (!showTeamColors) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoverPreview({ key: k, day: d, top: rect.bottom + 6, left: rect.left });
                      }}
                      onMouseLeave={() => setHoverPreview(null)}
                      className="border-b border-l border-zinc-800 px-2 py-2.5 text-center cursor-pointer hover:bg-white/[0.03]"
                    >
                      <p className="text-[10px] uppercase text-zinc-500 font-semibold">{WEEKDAY_SHORT[d.getUTCDay()]}</p>
                      <p className={cn("text-sm font-bold mt-1 w-7 h-7 mx-auto flex items-center justify-center rounded-full", isToday ? "bg-amber-500 text-black" : "text-white")}>
                        {d.getUTCDate()}
                      </p>
                      {capacity > 0 && <p className="text-[9px] text-zinc-600 mt-0.5">{formatFreeHours(free)} livres</p>}
                    </div>
                  );
                })}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div className="relative">
                  {Array.from({ length: RANGE_END_HOUR - RANGE_START_HOUR }, (_, i) => RANGE_START_HOUR + i).map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-zinc-600 text-right pr-2 -translate-y-2">{h}:00</div>
                  ))}
                </div>
                {weekGrid.map((d) => {
                  const k = dayKey(d);
                  const dayApts = byDay.get(k) ?? [];
                  const isToday = k === dayKey(todayUtc());
                  const nowMin = nowMinutesLocal();
                  const rangeStartMin = RANGE_START_HOUR * 60;
                  const rangeEndMin = RANGE_END_HOUR * 60;
                  return (
                    <div key={k} className="relative border-l border-zinc-800/80">
                      {Array.from({ length: RANGE_END_HOUR - RANGE_START_HOUR }, (_, i) => i).map((i) => (
                        <div key={i} style={{ height: HOUR_HEIGHT }} className="border-t border-zinc-800/40" />
                      ))}
                      {isToday && nowMin >= rangeStartMin && nowMin <= rangeEndMin && (
                        <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10" style={{ top: ((nowMin - rangeStartMin) / 60) * HOUR_HEIGHT }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5" />
                          <div className="flex-1 h-px bg-red-500" />
                        </div>
                      )}
                      {dayApts.map((apt) => {
                        const startMin = Math.min(Math.max(minutesOf(apt.startTime), rangeStartMin), rangeEndMin);
                        let endMin = minutesOf(apt.endTime || apt.startTime);
                        if (endMin <= startMin) endMin = startMin + 30;
                        endMin = Math.min(endMin, rangeEndMin);
                        const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT;
                        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);
                        const status = statusOf(apt.status);
                        const color = barberColorOf(apt.staff.id, orderedStaffIds);
                        return (
                          <button
                            key={apt.id}
                            onClick={(e) => { e.stopPropagation(); setDetailDayKey(k); }}
                            style={{ top, height }}
                            className={cn("absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left overflow-hidden border transition-transform hover:scale-[1.02] hover:z-20", status.block)}
                          >
                            <p className="text-[10px] font-bold leading-tight truncate flex items-center gap-1">
                              {showTeamColors && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", color.dot)} />}
                              {apt.startTime} {apt.clientName}
                            </p>
                            <p className="text-[9px] leading-tight truncate opacity-80">
                              {apt.service.name}
                              {staffFilter === "all" && ` · ${apt.staff.name}`}
                            </p>
                            {height >= 40 && <p className="text-[9px] leading-tight font-semibold opacity-90">{formatCurrency(apt.totalPrice)}</p>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW — one column per active barber, side by side: photo/name
          header, real free time shaded in, a live "now" line, and a
          FOLGA/FECHADO overlay when off — the same team-wide day the gestor
          gets on the web's month/week drill-down and the Flutter app. */}
      {viewMode === "day" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {teamColumns.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">Nenhum barbeiro ativo.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-w-full" style={{ minWidth: teamColumns.length * 200 + 52 }}>
                <div className="w-[52px] flex-shrink-0">
                  <div className="h-[76px] border-b border-zinc-800" />
                  {Array.from({ length: RANGE_END_HOUR - RANGE_START_HOUR }, (_, i) => RANGE_START_HOUR + i).map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-zinc-600 text-right pr-2 -translate-y-2">{h}:00</div>
                  ))}
                </div>
                {teamColumns.map((s) => {
                  const k = dayKey(viewDate);
                  const dayApts = (byDay.get(k) ?? []).filter((a) => a.staff.id === s.id);
                  const info = computeFreeInfo(s.id, k);
                  const isOff = !info.isOpen;
                  const isToday = k === dayKey(todayUtc());
                  const nowMin = nowMinutesLocal();
                  const rangeStartMin = RANGE_START_HOUR * 60;
                  const rangeEndMin = RANGE_END_HOUR * 60;
                  const color = barberColorOf(s.id, orderedStaffIds);
                  const activeCount = dayApts.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW").length;
                  return (
                    <div key={s.id} className="flex-1 min-w-[200px] border-l border-zinc-800 relative">
                      <div className="h-[76px] border-b border-zinc-800 px-3 py-2.5 flex items-center gap-2.5">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0 overflow-hidden", color.dot)}>
                          {s.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            s.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{s.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{isOff ? info.label : `${activeCount} · ${info.label}`}</p>
                        </div>
                      </div>
                      <div className="relative" style={{ height: (RANGE_END_HOUR - RANGE_START_HOUR) * HOUR_HEIGHT }}>
                        {Array.from({ length: RANGE_END_HOUR - RANGE_START_HOUR }, (_, i) => i).map((i) => (
                          <div key={i} style={{ height: HOUR_HEIGHT }} className="border-t border-zinc-800/40" />
                        ))}
                        {info.segments.map((seg, i) => (
                          <div
                            key={i}
                            className="absolute left-1 right-1 rounded-md bg-emerald-500/[0.07] pointer-events-none"
                            style={{ top: ((seg.start - rangeStartMin) / 60) * HOUR_HEIGHT, height: ((seg.end - seg.start) / 60) * HOUR_HEIGHT }}
                          />
                        ))}
                        {dayApts.map((apt) => {
                          const startMin = Math.min(Math.max(minutesOf(apt.startTime), rangeStartMin), rangeEndMin);
                          let endMin = minutesOf(apt.endTime || apt.startTime);
                          if (endMin <= startMin) endMin = startMin + 30;
                          endMin = Math.min(endMin, rangeEndMin);
                          const top = ((startMin - rangeStartMin) / 60) * HOUR_HEIGHT;
                          const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);
                          const status = statusOf(apt.status);
                          return (
                            <button
                              key={apt.id}
                              onClick={() => { setDetailStaffId(s.id); setDetailDayKey(k); }}
                              style={{ top, height }}
                              className={cn("absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-left overflow-hidden border transition-transform hover:scale-[1.02] hover:z-20", status.block)}
                            >
                              <p className="text-[10px] font-bold leading-tight truncate">{apt.startTime} {apt.clientName}</p>
                              <p className="text-[9px] leading-tight truncate opacity-80">{apt.service.name}</p>
                              {height >= 40 && <p className="text-[9px] leading-tight font-semibold opacity-90">{formatCurrency(apt.totalPrice)}</p>}
                            </button>
                          );
                        })}
                        {isOff && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                            <span className="text-xs font-bold text-zinc-600 tracking-widest -rotate-12">
                              {info.label === "Folga" ? "FOLGA" : "FECHADO"}
                            </span>
                          </div>
                        )}
                        {isToday && !isOff && nowMin >= rangeStartMin && nowMin <= rangeEndMin && (
                          <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10" style={{ top: ((nowMin - rangeStartMin) / 60) * HOUR_HEIGHT }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5" />
                            <div className="flex-1 h-px bg-red-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Serviço</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Barbeiro</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3">Data/Hora</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4" colSpan={6}>
                        <Skeleton className="h-10 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                {!isLoading && filteredList.map((apt) => {
                  const status = statusOf(apt.status);
                  return (
                    <tr key={apt.id} className="hover:bg-white/2 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 flex-shrink-0 group-hover:bg-zinc-700 transition-colors">
                            {apt.clientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{apt.clientName}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {apt.clientPhone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <p className="text-sm text-zinc-300">{apt.service.name}</p>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-sm text-zinc-400">{apt.staff.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white font-medium flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-600" />{apt.startTime}</p>
                        <p className="text-xs text-zinc-500">{formatDate(apt.date)}</p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", status.bg, status.text)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-amber-400">{formatCurrency(apt.totalPrice)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && filteredList.length === 0 && (
              <div className="text-center py-12 text-zinc-500">Nenhum agendamento encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

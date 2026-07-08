import { prisma } from "@/lib/db";

// Appointment statuses that occupy a slot (block it from being booked again).
// CANCELLED/NO_SHOW free the slot back up.
export const OCCUPYING_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;

// No barbershop timezone field exists yet — every shop using this app is in
// Brazil, and America/Sao_Paulo has been fixed at UTC-3 with no DST since
// 2019, so a constant offset is safe. WorkingHour/Availability "HH:mm"
// values are the shop's local wall-clock time.
const SHOP_UTC_OFFSET_MINUTES = -3 * 60;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Appointment.date is stored from "YYYY-MM-DD" strings, which JS parses as
// UTC midnight (see src/lib/dateRange.ts) — dayOfWeek must be read the same
// way or it drifts a day depending on the server's local timezone.
export function dayOfWeekFromDateKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

export function shopNow(): { dateKey: string; minutes: number; dayOfWeek: number } {
  const shifted = new Date(Date.now() + SHOP_UTC_OFFSET_MINUTES * 60 * 1000);
  const dateKey = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
  return {
    dateKey,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  // Where these hours came from — lets the UI explain *why* a day is closed
  // ("dia de folga" vs "barbearia fechada" vs just following the default).
  source: "blocked" | "staff" | "shop";
}

// A staff member's effective hours for one calendar day, resolved in order:
// 1. an explicit StaffTimeOff for that exact date always wins (day off/vacation)
// 2. their own weekly Availability override for that weekday, if they have one
// 3. otherwise, fall back to the barbershop's default WorkingHour
export async function getEffectiveSchedule(
  barbershopId: string,
  staffId: string,
  dateKey: string
): Promise<DaySchedule> {
  const dayOfWeek = dayOfWeekFromDateKey(dateKey);

  const timeOff = await prisma.staffTimeOff.findUnique({
    where: { staffId_date: { staffId, date: new Date(dateKey) } },
  });
  if (timeOff) {
    return { isOpen: false, openTime: null, closeTime: null, source: "blocked" };
  }

  const staffAvailability = await prisma.availability.findUnique({
    where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
  });
  if (staffAvailability) {
    return {
      isOpen: staffAvailability.isAvailable,
      openTime: staffAvailability.isAvailable ? staffAvailability.startTime : null,
      closeTime: staffAvailability.isAvailable ? staffAvailability.endTime : null,
      source: "staff",
    };
  }

  const shopHours = await prisma.workingHour.findUnique({
    where: { barbershopId_dayOfWeek: { barbershopId, dayOfWeek } },
  });
  if (!shopHours || !shopHours.isOpen) {
    return { isOpen: false, openTime: null, closeTime: null, source: "shop" };
  }
  return { isOpen: true, openTime: shopHours.openTime, closeTime: shopHours.closeTime, source: "shop" };
}

export type SlotStatus = "available" | "past" | "booked";

export interface Slot {
  time: string;
  status: SlotStatus;
}

// Builds every candidate slot for a staff member's day, tagging each as
// available / already past / already booked instead of just omitting them —
// callers decide whether to hide or grey out non-available slots.
export async function buildDaySlots(params: {
  barbershopId: string;
  staffId: string;
  dateKey: string;
  durationMinutes: number;
  intervalMinutes?: number;
}): Promise<{ schedule: DaySchedule; slots: Slot[] }> {
  const { barbershopId, staffId, dateKey, durationMinutes, intervalMinutes = 30 } = params;
  const schedule = await getEffectiveSchedule(barbershopId, staffId, dateKey);
  if (!schedule.isOpen || !schedule.openTime || !schedule.closeTime) {
    return { schedule, slots: [] };
  }

  const existing = await prisma.appointment.findMany({
    where: {
      staffId,
      date: new Date(dateKey),
      status: { in: [...OCCUPYING_STATUSES] },
    },
    select: { startTime: true, endTime: true },
  });

  const now = shopNow();
  const isToday = dateKey === now.dateKey;
  const openMin = timeToMinutes(schedule.openTime);
  const closeMin = timeToMinutes(schedule.closeTime);

  const slots: Slot[] = [];
  for (let start = openMin; start + durationMinutes <= closeMin; start += intervalMinutes) {
    const end = start + durationMinutes;
    const overlapsExisting = existing.some((apt: { startTime: string; endTime: string }) => {
      const aStart = timeToMinutes(apt.startTime);
      const aEnd = timeToMinutes(apt.endTime || apt.startTime);
      return start < aEnd && end > aStart;
    });
    const isPast = isToday && start <= now.minutes;
    slots.push({
      time: minutesToTime(start),
      status: overlapsExisting ? "booked" : isPast ? "past" : "available",
    });
  }

  return { schedule, slots };
}

// Server-side guard for POST /api/appointments — re-checks everything the
// UI already filters for, so a stale screen or a direct API call can't
// create a past/closed/double-booked appointment.
export async function validateRequestedSlot(params: {
  barbershopId: string;
  staffId: string;
  dateKey: string;
  startTime: string;
  endTime: string;
}): Promise<string | null> {
  const { barbershopId, staffId, dateKey, startTime, endTime } = params;

  const schedule = await getEffectiveSchedule(barbershopId, staffId, dateKey);
  if (!schedule.isOpen || !schedule.openTime || !schedule.closeTime) {
    return "O barbeiro não atende nesse dia.";
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime || startTime);
  const openMin = timeToMinutes(schedule.openTime);
  const closeMin = timeToMinutes(schedule.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    return `Fora do horário de atendimento (${schedule.openTime} às ${schedule.closeTime}).`;
  }

  const now = shopNow();
  if (dateKey < now.dateKey || (dateKey === now.dateKey && startMin <= now.minutes)) {
    return "Esse horário já passou.";
  }

  const sameDay = await prisma.appointment.findMany({
    where: {
      staffId,
      date: new Date(dateKey),
      status: { in: [...OCCUPYING_STATUSES] },
    },
    select: { startTime: true, endTime: true },
  });
  const conflict = sameDay.some((apt: { startTime: string; endTime: string }) => {
    const aStart = timeToMinutes(apt.startTime);
    const aEnd = timeToMinutes(apt.endTime || apt.startTime);
    return startMin < aEnd && endMin > aStart;
  });
  if (conflict) return "Esse horário já está ocupado para este barbeiro.";

  return null;
}

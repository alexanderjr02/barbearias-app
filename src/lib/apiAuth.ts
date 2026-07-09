import { prisma } from "./db";
import { getSession, type SessionPayload } from "./auth";

// Management endpoints (staff/services/finance/products/etc.) require a
// logged-in user tied to a barbershop. Barber/client-scoped endpoints will
// need their own narrower checks — this is the "gestor" baseline.
export async function requireBarbershopSession(): Promise<
  (SessionPayload & { barbershopId: string }) | null
> {
  const session = await getSession();
  if (!session || !session.barbershopId) return null;
  return session as SessionPayload & { barbershopId: string };
}

// Platform-wide admin endpoints (/api/admin/*) — the owner's control panel,
// not scoped to any single barbershop. Strict: SUPER_ADMIN only. Use this
// for anything sensitive or destructive (barbershops, users, billing,
// settings, security) — SUPPORT_ADMIN never gets these.
export async function requireSuperAdminSession(): Promise<
  (SessionPayload & { role: "SUPER_ADMIN" }) | null
> {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return null;
  return session as SessionPayload & { role: "SUPER_ADMIN" };
}

// Broader admin check for the low-risk surface a scoped SUPPORT_ADMIN can
// also reach: read-only Dashboard/Analytics, and full Suporte access (that
// is the role's entire job). Everything else stays on
// requireSuperAdminSession() above.
export async function requireAnyAdminSession(): Promise<
  (SessionPayload & { role: "SUPER_ADMIN" | "SUPPORT_ADMIN" }) | null
> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "SUPPORT_ADMIN")) return null;
  return session as SessionPayload & { role: "SUPER_ADMIN" | "SUPPORT_ADMIN" };
}

// Schedule-management endpoints (a staff member's own working hours/days
// off) are readable/writable by that barbershop's manager, or by the
// barber themself once they have a login — giving barbers real autonomy
// over their own agenda instead of only the gestor.
export async function requireStaffScheduleAccess(staffId: string) {
  const session = await getSession();
  if (!session) return null;

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return null;

  const isManager =
    (session.role === "OWNER" || session.role === "MANAGER") && staff.barbershopId === session.barbershopId;
  const isSelf = session.role === "BARBER" && staff.userId === session.sub;
  if (!isManager && !isSelf) return null;

  return { staff, session };
}

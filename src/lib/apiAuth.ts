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

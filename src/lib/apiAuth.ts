import { NextResponse } from "next/server";
import { prisma } from "./db";
import { getSession, type SessionPayload } from "./auth";

/**
 * A recusa das rotas /api/admin — e a diferença entre 401 e 403, que aqui não
 * é preciosismo de norma, é um bug real que existiu.
 *
 * Todas as 43 rotas de admin devolviam 403 para "não autenticado". Só que o
 * apiClient renova o token silenciosamente ao ver 401, e não ao ver 403. Como
 * o token de acesso dura 15 minutos, depois desse tempo dentro do painel toda
 * chamada morria em 403, nada renovava, e o gestor levava um toast vermelho
 * de "Não autenticado" ao clicar em qualquer coisa — sem nenhuma forma de se
 * recuperar a não ser recarregar a página.
 *
 * Então: 401 = "não sei quem é você" (o cliente sabe resolver sozinho,
 * renovando). 403 = "sei quem é você e não pode" (renovar não adianta,
 * insistir também não).
 */
export async function denyAdmin(): Promise<NextResponse> {
  const session = await getSession();
  return session
    ? NextResponse.json({ error: "Sem permissão para esta área" }, { status: 403 })
    : NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}

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

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

import { prisma } from "@/lib/db";

export const NOTIFICATION_TYPES = ["NEW_APPOINTMENT", "APPOINTMENT_CANCELLED", "SUPPORT_REPLY"] as const;
export type GestorNotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CLIENT_NOTIFICATION_TYPES = ["APPOINTMENT_CONFIRMED", "APPOINTMENT_CANCELLED_BY_SHOP", "APPOINTMENT_COMPLETED"] as const;
export type ClientNotificationType = (typeof CLIENT_NOTIFICATION_TYPES)[number];

// Single integration point for the gestor/staff-facing notification feed.
// Today this only writes a Notification row the Topbar/app bell reads back —
// no push is sent. TODO: once a Firebase project exists, send a push here
// too, keyed off the same (barbershopId, type, title, body) call.
export async function notifyBarbershop(barbershopId: string, type: GestorNotificationType, title: string, body: string, link?: string) {
  await prisma.notification.create({ data: { barbershopId, type, title, body, link } });
}

// Same table, same future push hook — but targeted at one client instead of
// the whole shop (their appointment status changed). Kept as a separate
// function name so call sites read clearly about who ends up seeing it.
export async function notifyClient(barbershopId: string, clientId: string, type: ClientNotificationType, title: string, body: string, link?: string) {
  await prisma.notification.create({ data: { barbershopId, clientId, type, title, body, link } });
}

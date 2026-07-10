import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";

// Clients come from two sources, merged here:
// 1. Guest/booked appointments (clientName/clientPhone/clientEmail on
//    Appointment), grouped by clientId if linked to a User, else by phone.
// 2. Clients the gestor pre-registered via POST below (BarbershopClient),
//    who may not have any appointment yet.
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [appointments, loyaltyAccounts, registeredClients, subscriptions] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId: session.barbershopId, status: { not: "CANCELLED" } },
      include: { service: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.loyaltyAccount.findMany({ where: { barbershopId: session.barbershopId } }),
    prisma.barbershopClient.findMany({
      where: { barbershopId: session.barbershopId },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true } } },
    }),
    // Active/past-due memberships at this barbershop — surfaced to whoever's
    // looking at the client list (gestor on the web, barber on the app) so
    // the person about to serve someone knows they're a subscriber before
    // ever asking.
    prisma.clientSubscription.findMany({
      where: { plan: { barbershopId: session.barbershopId }, status: { in: ["ACTIVE", "PAST_DUE"] } },
      include: { plan: { select: { name: true, color: true } } },
    }),
  ]);

  type LoyaltyAccountRow = (typeof loyaltyAccounts)[number];
  type SubscriptionRow = (typeof subscriptions)[number];
  type AppointmentRow = (typeof appointments)[number];

  const loyaltyByUserId = new Map<string, LoyaltyAccountRow>(loyaltyAccounts.map((a: LoyaltyAccountRow) => [a.userId, a]));
  const subscriptionByClientId = new Map<string, { planName: string; planColor: string; status: string }>(
    subscriptions
      .filter((s: SubscriptionRow) => s.clientId)
      .map((s: SubscriptionRow) => [s.clientId as string, { planName: s.plan.name, planColor: s.plan.color, status: s.status }])
  );

  const linkedClientIds = Array.from(new Set(appointments.map((a: AppointmentRow) => a.clientId).filter((v: string | null): v is string => !!v)));
  const linkedUsers = linkedClientIds.length
    ? await prisma.user.findMany({ where: { id: { in: linkedClientIds } }, select: { id: true, avatar: true } })
    : [];
  const avatarByUserId = new Map(linkedUsers.map((u: (typeof linkedUsers)[number]) => [u.id, u.avatar]));

  type Group = {
    key: string;
    clientId: string | null;
    name: string;
    phone: string;
    email: string | null;
    visits: number;
    totalSpent: number;
    lastVisit: Date;
    serviceCounts: Map<string, number>;
  };

  const groups = new Map<string, Group>();

  for (const apt of appointments) {
    const key = apt.clientId ?? apt.clientPhone;
    const existing = groups.get(key);
    const isCompleted = apt.status === "COMPLETED";

    if (!existing) {
      groups.set(key, {
        key,
        clientId: apt.clientId,
        name: apt.clientName,
        phone: apt.clientPhone,
        email: apt.clientEmail,
        visits: isCompleted ? 1 : 0,
        totalSpent: isCompleted ? apt.totalPrice : 0,
        lastVisit: apt.date,
        serviceCounts: new Map([[apt.service.name, 1]]),
      });
      continue;
    }
    existing.clientId = existing.clientId ?? apt.clientId;

    existing.name = apt.clientName;
    existing.phone = apt.clientPhone;
    existing.email = apt.clientEmail ?? existing.email;
    existing.lastVisit = apt.date;
    if (isCompleted) {
      existing.visits += 1;
      existing.totalSpent += apt.totalPrice;
    }
    existing.serviceCounts.set(apt.service.name, (existing.serviceCounts.get(apt.service.name) ?? 0) + 1);
  }

  const clients = Array.from(groups.values()).map((g) => {
    let favorite = "";
    let favoriteCount = 0;
    for (const [name, count] of g.serviceCounts) {
      if (count > favoriteCount) {
        favorite = name;
        favoriteCount = count;
      }
    }
    const loyalty = g.clientId ? loyaltyByUserId.get(g.clientId) : undefined;
    return {
      id: g.key,
      name: g.name,
      phone: g.phone,
      email: g.email,
      visits: g.visits,
      totalSpent: g.totalSpent,
      lastVisit: g.lastVisit,
      favorite,
      points: loyalty?.points ?? null,
      tier: loyalty?.tier ?? null,
      hasAccount: !!g.clientId,
      avatar: g.clientId ? avatarByUserId.get(g.clientId) ?? null : null,
      subscription: g.clientId ? subscriptionByClientId.get(g.clientId) ?? null : null,
    };
  });

  // Add pre-registered clients who have no appointment (and thus no group) yet.
  for (const rc of registeredClients) {
    if (groups.has(rc.userId)) continue;
    const loyalty = loyaltyByUserId.get(rc.userId);
    clients.push({
      id: rc.userId,
      name: rc.user.name,
      phone: rc.user.phone ?? "",
      email: rc.user.email,
      visits: 0,
      totalSpent: 0,
      lastVisit: rc.createdAt,
      favorite: "",
      points: loyalty?.points ?? null,
      tier: loyalty?.tier ?? null,
      hasAccount: true,
      avatar: rc.user.avatar,
      subscription: subscriptionByClientId.get(rc.userId) ?? null,
    });
  }

  clients.sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: body.email } });

  const user = existingUser
    ? existingUser
    : await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone || undefined,
          password: await bcrypt.hash(body.password, 10),
          role: "CLIENT",
        },
      });

  const existingLink = await prisma.barbershopClient.findUnique({
    where: { userId_barbershopId: { userId: user.id, barbershopId: session.barbershopId } },
  });
  if (existingLink) {
    return NextResponse.json({ error: "Esse cliente já está cadastrado nesta barbearia" }, { status: 409 });
  }

  await prisma.barbershopClient.create({
    data: { userId: user.id, barbershopId: session.barbershopId },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}

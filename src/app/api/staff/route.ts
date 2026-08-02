import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { staffCreateSchema, firstFieldError } from "@/lib/validation";
import { staffLimitError } from "@/lib/planLimits";

export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // A tela da equipe compara barbeiros no MÊS (é assim que comissão fecha), e
  // mostra ritmo dos últimos 7 dias e ocupação da agenda. Por isso vem a data e
  // os horários do atendimento, não só o preço.
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const seteDiasAtras = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 6);

  const [staff, horarios] = await Promise.all([
    prisma.staff.findMany({
      where: { barbershopId: session.barbershopId },
      include: {
        appointments: {
          where: { status: "COMPLETED" },
          select: { totalPrice: true, date: true, startTime: true, endTime: true, clientPhone: true },
        },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workingHour.findMany({ where: { barbershopId: session.barbershopId } }),
  ]);

  const minutos = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Minutos que a barbearia esteve ABERTA do dia 1 até hoje — o denominador da
  // ocupação. Sem isto, "ocupação" seria um número solto sem referência.
  let minutosAbertos = 0;
  for (let d = new Date(inicioMes); d <= agora; d.setDate(d.getDate() + 1)) {
    const h = horarios.find((x: (typeof horarios)[number]) => x.dayOfWeek === d.getDay());
    if (h && h.isOpen) minutosAbertos += Math.max(0, minutos(h.closeTime) - minutos(h.openTime));
  }

  type StaffRow = (typeof staff)[number];
  const result = staff.map((member: StaffRow) => {
    const revenue = member.appointments.reduce((acc: number, a: StaffRow["appointments"][number]) => acc + a.totalPrice, 0);
    const avgRating =
      member.reviews.length > 0
        ? member.reviews.reduce((acc: number, r: StaffRow["reviews"][number]) => acc + r.rating, 0) / member.reviews.length
        : null;
    const doMes = member.appointments.filter((a: StaffRow["appointments"][number]) => a.date >= inicioMes);
    const receitaMes = doMes.reduce((acc: number, a: StaffRow["appointments"][number]) => acc + a.totalPrice, 0);
    // Ritmo da semana: um número por dia, do mais antigo ao de hoje.
    const ultimos7 = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(seteDiasAtras.getFullYear(), seteDiasAtras.getMonth(), seteDiasAtras.getDate() + i);
      return member.appointments.filter((a: StaffRow["appointments"][number]) => mesmoDia(a.date, dia)).length;
    });
    const minutosOcupados = doMes.reduce(
      (acc: number, a: StaffRow["appointments"][number]) => acc + Math.max(0, minutos(a.endTime) - minutos(a.startTime)),
      0,
    );
    const ocupacao = minutosAbertos > 0 ? Math.min(100, Math.round((minutosOcupados / minutosAbertos) * 100)) : 0;
    const clientesUnicos = new Set(member.appointments.map((a: StaffRow["appointments"][number]) => a.clientPhone)).size;

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      specialties: member.specialties,
      avatar: member.avatar,
      commissionRate: member.commissionRate,
      cpf: member.cpf,
      employmentType: member.employmentType,
      hireDate: member.hireDate,
      pixKey: member.pixKey,
      isActive: member.isActive,
      appointmentsCount: member.appointments.length,
      revenue,
      hasLogin: !!member.userId,
      avgRating,
      reviewCount: member.reviews.length,
      monthAppointments: doMes.length,
      monthRevenue: receitaMes,
      last7: ultimos7,
      occupancy: ocupacao,
      clientsCount: clientesUnicos,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstFieldError(parsed.error) }, { status: 400 });
  }
  const { name, role, specialties, avatar, commissionRate, email, password, cpf, employmentType, hireDate, pixKey } = parsed.data;

  // Plan limit — block adding a barber beyond what the plan allows.
  const limitError = await staffLimitError(session.barbershopId);
  if (limitError) {
    return NextResponse.json({ error: limitError, upgradeRequired: true }, { status: 403 });
  }

  // Optionally create a login for this barber (Role.BARBER) so they can use
  // the mobile app. Without email/password, the Staff row is profile-only.
  let userId: string | undefined;
  if (email && password) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: "BARBER",
      },
    });
    userId = user.id;
  }

  const member = await prisma.staff.create({
    data: {
      name,
      role: role || "BARBER",
      specialties,
      avatar,
      commissionRate: commissionRate ?? 0.4,
      cpf,
      employmentType,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      pixKey,
      barbershopId: session.barbershopId,
      userId,
    },
  });

  return NextResponse.json(member, { status: 201 });
}

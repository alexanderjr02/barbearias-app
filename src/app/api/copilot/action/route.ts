import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { planHasAI } from "@/lib/billing";
import { notifyClient, notifyClientMarketing } from "@/lib/gestorNotifications";
import { churnedClients, tomorrowAppointments, emptySlotsToday } from "@/lib/copilot/insights";
import { fugaAntecipada } from "@/lib/copilot/oportunidades";
import { logAutopilot } from "@/lib/copilot/autopilot";

// POST /api/copilot/action { action }, executes one of the briefing's one-tap
// actions. Each is a real, safe operation scoped to the caller's barbershop.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const barbershopId = session.barbershopId;

  const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { plan: true } });
  if (!planHasAI(shop?.plan)) return NextResponse.json({ error: "Recurso do plano Pro" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const action: string | undefined = body?.action;

  if (action === "confirm_tomorrow") {
    const { list } = await tomorrowAppointments(barbershopId);
    const toConfirm = list.filter((a) => a.status === "SCHEDULED");
    for (const a of toConfirm) {
      await prisma.appointment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
      if (a.clientId) {
        await notifyClient(barbershopId, a.clientId, "APPOINTMENT_CONFIRMED", "Agendamento confirmado", `Confirmamos seu horário de amanhã às ${a.startTime}. Até lá!`, "/appointments");
      }
    }
    return NextResponse.json({ ok: true, count: toConfirm.length, message: `${toConfirm.length} ${toConfirm.length === 1 ? "agendamento confirmado" : "agendamentos confirmados"}.` });
  }

  // Resgate ANTECIPADO: quem passou do próprio ritmo mas ainda não virou
  // sumido. Aqui a mensagem soa como cuidado; duas semanas depois já soa como
  // cobrança, e aí custa desconto.
  if (action === "rescue_early") {
    const emFuga = await fugaAntecipada(barbershopId);
    const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });
    let enviados = 0;
    for (const c of emFuga) {
      const ok = await notifyClientMarketing(
        barbershopId,
        c.clientId,
        "APPOINTMENT_CONFIRMED",
        "Tá na hora, não tá?",
        `Oi! Já passou do seu tempo de corte na ${shop?.name ?? "barbearia"}. Quer garantir seu horário essa semana?`,
        "/appointments",
      );
      if (ok) {
        await logAutopilot(barbershopId, "winback", `Chamei ${c.nome} antes de sumir (${c.atraso} dias além do ritmo dele).`, null, c.clientId);
        enviados++;
      }
    }
    return NextResponse.json({
      ok: true,
      count: enviados,
      message:
        enviados === 0
          ? "Ninguém está atrasado no próprio ritmo agora. Isso é bom."
          : `${enviados} ${enviados === 1 ? "cliente avisado" : "clientes avisados"} antes de sumir.`,
    });
  }

  if (action === "winback_churned") {
    const churned = await churnedClients(barbershopId);
    const withAccount = churned.filter((c) => c.clientId);
    const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });
    for (const c of withAccount) {
      await notifyClientMarketing(
        barbershopId,
        c.clientId!,
        "APPOINTMENT_CONFIRMED",
        "Saudades de você!",
        `Faz um tempo que você não aparece na ${shop?.name ?? "barbearia"}. Que tal marcar um horário? Estamos te esperando.`,
        "/appointments"
      );
    }
    return NextResponse.json({
      ok: true,
      count: withAccount.length,
      total: churned.length,
      message: `${withAccount.length} ${withAccount.length === 1 ? "cliente avisado" : "clientes avisados"} pelo app.${churned.length > withAccount.length ? ` ${churned.length - withAccount.length} sem conta. Chame pelo WhatsApp.` : ""}`,
    });
  }

  if (action === "notify_waitlist") {
    const waiting = await prisma.waitlistEntry.findMany({
      where: { barbershopId, status: "WAITING", clientId: { not: null } },
      select: { id: true, clientId: true },
    });
    const shop = await prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true } });
    // Diz QUAIS horários abriram, "abriu horário" sem a hora obriga o cliente
    // a abrir o app pra descobrir. Pega os horários livres de hoje de verdade
    // (todos os barbeiros), os 3 mais cedo, e cita na mensagem.
    const { perStaff } = await emptySlotsToday(barbershopId);
    const times = [...new Set(perStaff.flatMap((s) => s.free))].sort().slice(0, 3);
    const whenTxt = times.length ? ` às ${times.join(", ")}` : "";
    const shopName = shop?.name ?? "barbearia";
    for (const w of waiting) {
      await notifyClient(barbershopId, w.clientId!, "APPOINTMENT_CONFIRMED", "Abriu horário!", `Vagou horário hoje${whenTxt} na ${shopName}. Corre pra garantir!`, "/appointments");
    }
    await prisma.waitlistEntry.updateMany({ where: { id: { in: waiting.map((w: { id: string }) => w.id) } }, data: { status: "DONE" } });
    return NextResponse.json({ ok: true, count: waiting.length, message: `${waiting.length} ${waiting.length === 1 ? "cliente da fila avisado" : "clientes da fila avisados"}.` });
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
}

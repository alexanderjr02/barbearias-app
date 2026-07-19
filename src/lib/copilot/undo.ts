import { prisma } from "@/lib/db";

// Desfazer as ações do Copiloto.
//
// Cada ferramenta que ESCREVE registra aqui o suficiente para se reverter. O
// desfazer é sempre uma operação explícita e idempotente: uma ação já desfeita
// não desfaz de novo, e reverter algo que mudou depois é recusado em vez de
// sobrescrever silenciosamente o trabalho de outra pessoa.

/** Janela em que o desfazer é oferecido. Depois disso o estado provavelmente
 * já mudou (cliente remarcou, barbeiro atendeu) e reverter faria mais mal. */
const UNDO_WINDOW_MINUTES = 60;

export type UndoData =
  | { kind: "appointment_created"; appointmentId: string }
  | { kind: "appointment_status"; appointmentId: string; previousStatus: string }
  | { kind: "appointment_moved"; appointmentId: string; previousDate: string; previousStart: string; previousEnd: string }
  | { kind: "timeoffs_created"; ids: string[] }
  | { kind: "service_price"; serviceId: string; previousPrice: number }
  | { kind: "service_created"; serviceId: string }
  | { kind: "transaction_created"; transactionId: string }
  | { kind: "product_quantity"; productId: string; previousQuantity: number };

/** Registra uma ação reversível. Nunca lança: falhar em gravar o desfazer não
 * pode impedir a ação em si de ter acontecido. */
export async function recordUndoable(
  barbershopId: string,
  userId: string,
  tool: string,
  description: string,
  undoData: UndoData,
): Promise<void> {
  try {
    await prisma.copilotAction.create({
      data: { barbershopId, userId, tool, description, undoData: JSON.stringify(undoData) },
    });
  } catch {
    // não-crítico
  }
}

/** A última ação reversível ainda dentro da janela, para oferecer "Desfazer". */
export async function latestUndoable(barbershopId: string, userId: string) {
  const since = new Date(Date.now() - UNDO_WINDOW_MINUTES * 60_000);
  const row = await prisma.copilotAction.findFirst({
    where: { barbershopId, userId, undoneAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { id: true, description: true, tool: true, createdAt: true },
  });
  return row;
}

export interface UndoResult {
  ok: boolean;
  message: string;
}

/** Executa o desfazer. Valida posse, janela e se o estado ainda bate. */
export async function undoAction(actionId: string, barbershopId: string, userId: string): Promise<UndoResult> {
  const action = await prisma.copilotAction.findUnique({ where: { id: actionId } });
  if (!action || action.barbershopId !== barbershopId || action.userId !== userId) {
    return { ok: false, message: "Ação não encontrada." };
  }
  if (action.undoneAt) return { ok: false, message: "Essa ação já foi desfeita." };
  if (action.createdAt.getTime() < Date.now() - UNDO_WINDOW_MINUTES * 60_000) {
    return { ok: false, message: "Passou o prazo para desfazer esta ação." };
  }

  let data: UndoData;
  try {
    data = JSON.parse(action.undoData) as UndoData;
  } catch {
    return { ok: false, message: "Não consegui ler os dados para desfazer." };
  }

  let message: string;
  switch (data.kind) {
    case "appointment_created": {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { status: true, startTime: true } });
      if (!appt) return { ok: false, message: "O agendamento não existe mais." };
      if (appt.status === "COMPLETED") return { ok: false, message: "O atendimento já foi concluído — não dá para desfazer." };
      await prisma.appointment.update({ where: { id: data.appointmentId }, data: { status: "CANCELLED" } });
      message = `Agendamento das ${appt.startTime} desfeito (cancelado).`;
      break;
    }
    case "appointment_status": {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { status: true, startTime: true } });
      if (!appt) return { ok: false, message: "O agendamento não existe mais." };
      await prisma.appointment.update({ where: { id: data.appointmentId }, data: { status: data.previousStatus } });
      message = `Agendamento das ${appt.startTime} restaurado.`;
      break;
    }
    case "appointment_moved": {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { id: true } });
      if (!appt) return { ok: false, message: "O agendamento não existe mais." };
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { date: new Date(data.previousDate), startTime: data.previousStart, endTime: data.previousEnd },
      });
      message = `Horário devolvido para ${data.previousDate.slice(0, 10)} às ${data.previousStart}.`;
      break;
    }
    case "timeoffs_created": {
      const { count } = await prisma.staffTimeOff.deleteMany({ where: { id: { in: data.ids } } });
      message = count > 0 ? "Agenda reaberta." : "As folgas já não existiam.";
      break;
    }
    case "service_price": {
      const svc = await prisma.service.findUnique({ where: { id: data.serviceId }, select: { name: true } });
      if (!svc) return { ok: false, message: "O serviço não existe mais." };
      await prisma.service.update({ where: { id: data.serviceId }, data: { price: data.previousPrice } });
      message = `Preço de ${svc.name} voltou para R$ ${data.previousPrice.toFixed(2)}.`;
      break;
    }
    case "service_created": {
      const svc = await prisma.service.findUnique({ where: { id: data.serviceId }, select: { name: true } });
      if (!svc) return { ok: false, message: "O serviço já não existe." };
      // Desativa em vez de apagar: pode já ter agendamento apontando pra ele.
      await prisma.service.update({ where: { id: data.serviceId }, data: { isActive: false } });
      message = `Serviço ${svc.name} desativado.`;
      break;
    }
    case "transaction_created": {
      const tx = await prisma.financialTransaction.findUnique({ where: { id: data.transactionId }, select: { amount: true, description: true } });
      if (!tx) return { ok: false, message: "O lançamento já não existe." };
      await prisma.financialTransaction.delete({ where: { id: data.transactionId } });
      message = `Lançamento "${tx.description}" (R$ ${tx.amount.toFixed(2)}) removido.`;
      break;
    }
    case "product_quantity": {
      const p = await prisma.product.findUnique({ where: { id: data.productId }, select: { name: true } });
      if (!p) return { ok: false, message: "O produto não existe mais." };
      await prisma.product.update({ where: { id: data.productId }, data: { quantity: data.previousQuantity } });
      message = `Estoque de ${p.name} voltou para ${data.previousQuantity}.`;
      break;
    }
    default:
      return { ok: false, message: "Não sei desfazer esse tipo de ação." };
  }

  await prisma.copilotAction.update({ where: { id: action.id }, data: { undoneAt: new Date() } });
  return { ok: true, message };
}

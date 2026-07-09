import { prisma } from "@/lib/db";

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allDone: boolean;
  dismissed: boolean;
}

// Same four signals as the admin panel's platform-wide getActivationFunnel
// (src/lib/analytics.ts), scoped to a single barbershop instead of
// aggregated across all of them.
export async function getOnboardingStatus(barbershopId: string): Promise<OnboardingStatus> {
  const shop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: {
      onboardingDismissed: true,
      _count: { select: { staff: true, services: true, appointments: true } },
    },
  });
  if (!shop) {
    return { steps: [], completedCount: 0, totalCount: 0, allDone: true, dismissed: true };
  }

  const hasCompletedAppointment = await prisma.appointment.count({ where: { barbershopId, status: "COMPLETED" } });

  const steps: OnboardingStep[] = [
    { key: "staff", label: "Cadastre um barbeiro", done: shop._count.staff > 0 },
    { key: "services", label: "Cadastre um serviço", done: shop._count.services > 0 },
    { key: "appointment", label: "Tenha o 1º agendamento", done: shop._count.appointments > 0 },
    { key: "completed", label: "Conclua o 1º atendimento", done: hasCompletedAppointment > 0 },
  ];
  const completedCount = steps.filter((s) => s.done).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
    dismissed: shop.onboardingDismissed,
  };
}

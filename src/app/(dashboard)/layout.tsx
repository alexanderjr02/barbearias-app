import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NpsPrompt } from "@/components/layout/NpsPrompt";
import { FloatingCopilotWidget } from "@/components/layout/FloatingCopilotWidget";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { PlanProvider } from "@/context/PlanContext";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // `imp` só existe em sessão aberta por um admin via "entrar como o gestor".
  // O nome da barbearia vem daqui (servidor) para a faixa já chegar pronta na
  // primeira pintura — um aviso que aparece meio segundo depois é um aviso
  // que alguém não leu.
  const impersonating = Boolean(session.imp);
  const shop = impersonating && session.barbershopId
    ? ((await prisma.barbershop.findUnique({ where: { id: session.barbershopId }, select: { name: true } })) as { name: string } | null)
    : null;

  // O plano só é consultado aqui dentro, onde já existe sessão garantida pelo
  // redirect acima — no layout raiz ele batia nas páginas públicas e devolvia
  // 401 na cara de quem estava só tentando entrar.
  return (
    <PlanProvider>
      <div className="min-h-screen bg-zinc-950 flex">
        <Sidebar />
        <div
          className="flex flex-col flex-1 min-w-0"
          style={{ marginLeft: "var(--sidebar-width, 240px)" }}
        >
          {impersonating && <ImpersonationBanner shopName={shop?.name ?? null} ownerName={session.name} />}
          <Topbar />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
        </div>
        <NpsPrompt />
        <FloatingCopilotWidget />
      </div>
    </PlanProvider>
  );
}

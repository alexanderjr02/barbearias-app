import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NpsPrompt } from "@/components/layout/NpsPrompt";
import { FloatingCopilotWidget } from "@/components/layout/FloatingCopilotWidget";
import { PlanProvider } from "@/context/PlanContext";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

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
          <Topbar />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
        </div>
        <NpsPrompt />
        <FloatingCopilotWidget />
      </div>
    </PlanProvider>
  );
}

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: "var(--sidebar-width, 240px)" }}
      >
        <Topbar />
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

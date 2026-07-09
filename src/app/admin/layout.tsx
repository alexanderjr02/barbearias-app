import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "SUPPORT_ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0" style={{ marginLeft: "var(--admin-sidebar-width, 240px)" }}>
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

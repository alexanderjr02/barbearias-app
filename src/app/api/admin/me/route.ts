import { NextResponse } from "next/server";
import { requireAnyAdminSession } from "@/lib/apiAuth";

// GET /api/admin/me — lets client components (like AdminSidebar) know
// whether the current admin is SUPER_ADMIN or the scoped SUPPORT_ADMIN, to
// hide navigation to pages they can't reach (the API routes are the real
// enforcement boundary — this is purely a UI convenience).
export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 403 });
  }
  return NextResponse.json({ name: session.name, email: session.email, role: session.role });
}

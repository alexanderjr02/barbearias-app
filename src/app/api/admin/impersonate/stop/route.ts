import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, signAccessToken } from "@/lib/auth";
import { setAccessCookie } from "@/lib/sessionCookies";
import { isSecureRequest, getClientIp } from "@/lib/requestIp";
import { logAdminAction } from "@/lib/audit";

// POST /api/admin/impersonate/stop — o caminho de volta.
//
// Não exige sessão de admin (a sessão atual é a do gestor, por definição) —
// exige que ela seja uma impersonação, o que só o servidor consegue afirmar,
// porque `imp` vem dentro do token assinado. Ninguém "sai" para uma conta que
// não entrou.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!session.imp) return NextResponse.json({ error: "Esta sessão não é uma impersonação" }, { status: 400 });

  // O admin pode ter sido desativado ou rebaixado enquanto estava dentro —
  // nesse caso a volta é para a tela de login, não para o painel.
  const admin = (await prisma.user.findUnique({
    where: { id: session.imp },
    select: { id: true, name: true, email: true, role: true, isActive: true, activeBarbershopId: true },
  })) as { id: string; name: string; email: string; role: string; isActive: boolean; activeBarbershopId: string | null } | null;

  if (!admin || !admin.isActive || (admin.role !== "SUPER_ADMIN" && admin.role !== "SUPPORT_ADMIN")) {
    return NextResponse.json({ error: "A conta de administrador não está mais ativa. Entre novamente." }, { status: 403 });
  }

  await logAdminAction({
    actorId: admin.id,
    action: "admin.impersonate.stop",
    targetType: "Barbershop",
    targetId: session.barbershopId ?? "",
    metadata: { ip: getClientIp(request) ?? "desconhecido", owner: session.email },
  });

  const token = await signAccessToken({
    sub: admin.id,
    role: admin.role as "SUPER_ADMIN" | "SUPPORT_ADMIN",
    name: admin.name,
    email: admin.email,
    barbershopId: null,
  });

  const response = NextResponse.json({ ok: true, redirectTo: "/admin" });
  setAccessCookie(response, token, isSecureRequest(request));
  return response;
}

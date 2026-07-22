import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession, denyAdmin } from "@/lib/apiAuth";
import { signAccessToken } from "@/lib/auth";
import { setAccessCookie } from "@/lib/sessionCookies";
import { isSecureRequest, getClientIp } from "@/lib/requestIp";
import { nameSchema, emailSchema } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";

// GET /api/admin/me — lets client components (like AdminSidebar) know
// whether the current admin is SUPER_ADMIN or the scoped SUPPORT_ADMIN, to
// hide navigation to pages they can't reach (the API routes are the real
// enforcement boundary — this is purely a UI convenience).
export async function GET() {
  const session = await requireAnyAdminSession();
  if (!session) {
    return denyAdmin();
  }
  return NextResponse.json({ name: session.name, email: session.email, role: session.role });
}

// PATCH /api/admin/me — o admin edita o próprio nome e e-mail.
//
// Trocar e-mail exige a senha atual: o e-mail é o que recupera a conta, então
// quem consegue trocá-lo consegue tomá-la. Trocar só o nome, não — é inócuo.
export async function PATCH(request: NextRequest) {
  const session = await requireAnyAdminSession();
  if (!session) return denyAdmin();

  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; currentPassword?: string } | null;
  if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

  const data: { name?: string; email?: string } = {};

  if (body.name !== undefined) {
    const parsed = nameSchema.safeParse(body.name);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Nome inválido" }, { status: 400 });
    data.name = parsed.data;
  }

  if (body.email !== undefined) {
    const parsed = emailSchema.safeParse(body.email);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "E-mail inválido" }, { status: 400 });

    if (parsed.data !== session.email.toLowerCase()) {
      const me = (await prisma.user.findUnique({ where: { id: session.sub }, select: { password: true } })) as { password: string | null } | null;
      if (!me?.password) {
        return NextResponse.json({ error: "Esta conta não usa senha (entrou pelo Google)" }, { status: 409 });
      }
      if (!body.currentPassword || !(await bcrypt.compare(body.currentPassword, me.password))) {
        return NextResponse.json({ error: "Informe a senha atual para trocar o e-mail" }, { status: 401 });
      }
      const taken = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "Esse e-mail já está em uso" }, { status: 409 });
      data.email = parsed.data;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, name: session.name, email: session.email, role: session.role });
  }

  const updated = (await prisma.user.update({
    where: { id: session.sub },
    data,
    select: { name: true, email: true },
  })) as { name: string; email: string };

  await logAdminAction({
    actorId: session.sub,
    action: "admin.account.profile_updated",
    targetType: "User",
    targetId: session.sub,
    metadata: { ip: getClientIp(request) ?? "desconhecido", campos: Object.keys(data) },
  });

  // O token carrega nome e e-mail; sem reemitir, a tela continuaria mostrando
  // os antigos até a sessão expirar.
  const response = NextResponse.json({ ok: true, name: updated.name, email: updated.email, role: session.role });
  const token = await signAccessToken({
    sub: session.sub,
    role: session.role,
    name: updated.name,
    email: updated.email,
    barbershopId: session.barbershopId,
  });
  setAccessCookie(response, token, isSecureRequest(request));
  return response;
}

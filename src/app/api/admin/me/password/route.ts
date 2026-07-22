import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAnyAdminSession } from "@/lib/apiAuth";
import { passwordSchema } from "@/lib/validation";
import { logAdminAction } from "@/lib/audit";
import { getClientIp } from "@/lib/requestIp";

// POST /api/admin/me/password — o admin troca a própria senha.
//
// Antes não existia: a única forma de trocar era o fluxo de "esqueci a senha"
// por e-mail, o que deixava o dono da plataforma dependente de o e-mail estar
// funcionando para uma operação que ele deveria conseguir fazer logado.
//
// Exige a senha atual mesmo já havendo sessão. Sessão só prova que alguém
// entrou em algum momento; a senha atual prova que é a mesma pessoa agora —
// é o que impede uma aba esquecida aberta de virar troca de dono da conta.
export async function POST(request: NextRequest) {
  const session = await requireAnyAdminSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { currentPassword?: string; newPassword?: string } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const parsed = passwordSchema.safeParse(body?.newPassword);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Senha inválida" }, { status: 400 });
  }

  const user = (await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, password: true },
  })) as { id: string; password: string | null } | null;

  if (!user?.password) {
    return NextResponse.json({ error: "Esta conta não usa senha (entrou pelo Google)" }, { status: 409 });
  }
  if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
  }
  if (await bcrypt.compare(parsed.data, user.password)) {
    return NextResponse.json({ error: "A senha nova é igual à atual" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data, 10) } });

  // Derruba as outras sessões: quem trocou a senha normalmente está trocando
  // JUSTAMENTE porque desconfia que alguém tem a antiga. Deixar os refresh
  // tokens antigos vivos manteria o intruso dentro.
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  await logAdminAction({
    actorId: user.id,
    action: "admin.account.password_changed",
    targetType: "User",
    targetId: user.id,
    metadata: { ip: getClientIp(request) ?? "desconhecido" },
  });

  return NextResponse.json({ ok: true, message: "Senha alterada. As outras sessões foram encerradas." });
}

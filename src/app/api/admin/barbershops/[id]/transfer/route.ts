import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { emailSchema } from "@/lib/validation";

// POST /api/admin/barbershops/[id]/transfer — passa a barbearia para outro dono.
//
// Barbearia é vendida, sócio sai, o cadastro foi feito no e-mail errado. Sem
// isto a única saída era criar tudo de novo — e recriar significa perder
// agenda, histórico de cliente e financeiro, ou seja, perder o negócio inteiro
// para consertar um nome.
//
// Transfere para uma conta que JÁ EXISTE, de propósito: criar o novo dono aqui
// significaria inventar senha e mandar por um e-mail que pode não chegar. O
// caminho certo é a pessoa se cadastrar (ou o admin criá-la) e então receber.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const parsed = emailSchema.safeParse(body?.email);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "E-mail inválido" }, { status: 400 });
  }

  const [shop, novoDono] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } } }),
    prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true, name: true, email: true, role: true, isActive: true } }),
  ]);

  if (!shop) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  if (!novoDono) {
    return NextResponse.json({ error: "Não existe conta com esse e-mail. Crie a conta antes de transferir." }, { status: 404 });
  }
  if (!novoDono.isActive) return NextResponse.json({ error: "Essa conta está desativada" }, { status: 409 });
  if (novoDono.id === shop.ownerId) return NextResponse.json({ error: "Essa pessoa já é a dona" }, { status: 400 });

  // Admin não vira dono de barbearia: são papéis diferentes, e misturar os
  // dois faz a conta que administra a plataforma aparecer como cliente dela.
  if (novoDono.role === "SUPER_ADMIN" || novoDono.role === "SUPPORT_ADMIN") {
    return NextResponse.json({ error: "Conta de administrador não pode ser dona de barbearia" }, { status: 409 });
  }

  await prisma.$transaction(async (tx: typeof prisma) => {
    await tx.barbershop.update({ where: { id }, data: { ownerId: novoDono.id } });
    // Quem recebe precisa poder entrar como gestor. O dono antigo mantém a
    // conta e o papel: ele pode ter outras barbearias, e rebaixar alguém como
    // efeito colateral de outra ação é como se perde acesso sem saber por quê.
    if (novoDono.role !== "OWNER") {
      await tx.user.update({ where: { id: novoDono.id }, data: { role: "OWNER" } });
    }
  });

  await logAdminAction({
    actorId: session.sub,
    action: "barbershop.owner_transferred",
    targetType: "Barbershop",
    targetId: id,
    metadata: { barbearia: shop.name, de: shop.owner?.email ?? shop.ownerId, para: novoDono.email },
  });

  return NextResponse.json({ ok: true, message: `"${shop.name}" agora é de ${novoDono.name}.` });
}

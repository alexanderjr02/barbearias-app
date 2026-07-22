import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";
import { PLANS, type PlatformPlan } from "@/lib/billing";
import { nameSchema, emailSchema, phoneSchema, slugSchema, cnpjSchema, optionalStateSchema } from "@/lib/validation";

// POST /api/admin/barbershops/create — o admin cadastra uma barbearia inteira.
//
// Existe porque a venda real acontece fora do site: fecha-se no WhatsApp, num
// evento, num piloto. Sem isto o único caminho de entrada é o autocadastro
// pagando, e todo acordo combinado por fora vira trabalho manual no banco —
// ou pior, vira "se cadastra aí que depois eu ajeito", que perde gente no meio.
//
// A senha inicial é gerada aqui e devolvida UMA vez, para o admin repassar.
// Não é enviada por e-mail de propósito: o e-mail deste sistema ainda depende
// de domínio verificado, e uma conta que nasce dependendo de um e-mail que
// pode não chegar nasce quebrada.
export async function POST(request: NextRequest) {
  const session = await requireSuperAdminSession();
  if (!session) return denyAdmin();

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

  // Mesmas regras do cadastro público. Barbearia criada pelo admin não pode
  // ser barbearia com dado pior — senão a porta dos fundos vira o buraco por
  // onde entra o que a porta da frente barra.
  const campos = {
    ownerName: nameSchema.safeParse(body.ownerName),
    email: emailSchema.safeParse(body.email),
    phone: phoneSchema.safeParse(body.phone),
    name: nameSchema.safeParse(body.name),
    slug: slugSchema.safeParse(body.slug),
    cnpj: cnpjSchema.safeParse(body.cnpj),
    state: optionalStateSchema.safeParse(body.state ?? undefined),
  };
  for (const [campo, r] of Object.entries(campos)) {
    if (!r.success) {
      return NextResponse.json({ error: `${campo}: ${r.error.issues[0]?.message ?? "inválido"}` }, { status: 400 });
    }
  }
  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (!city) return NextResponse.json({ error: "Cidade é obrigatória" }, { status: 400 });

  const plan: PlatformPlan = PLANS.includes(body.plan) ? body.plan : "FREE";
  const isComplimentary = body.isComplimentary === true;
  const compReason = typeof body.compReason === "string" ? body.compReason.trim() || null : null;

  // Validade: dias a partir de hoje, ou nulo para sem prazo.
  let planExpiresAt: Date | null = null;
  if (typeof body.durationDays === "number" && body.durationDays > 0) {
    planExpiresAt = new Date(Date.now() + body.durationDays * 86400000);
  }

  const [emailTomado, slugTomado, cnpjTomado] = await Promise.all([
    prisma.user.findUnique({ where: { email: campos.email.data! }, select: { id: true } }),
    prisma.barbershop.findUnique({ where: { slug: campos.slug.data! }, select: { id: true } }),
    prisma.barbershop.findFirst({ where: { cnpj: campos.cnpj.data! }, select: { id: true } }),
  ]);
  if (emailTomado) return NextResponse.json({ error: "Esse e-mail já tem conta" }, { status: 409 });
  if (slugTomado) return NextResponse.json({ error: "Esse link já está em uso" }, { status: 409 });
  if (cnpjTomado) return NextResponse.json({ error: "Já existe barbearia com esse CNPJ" }, { status: 409 });

  // Legível e forte: o admin vai ditar isto por WhatsApp ou telefone, então
  // caracteres ambíguos atrapalham mais do que a entropia extra ajuda.
  const senhaInicial = `cortix${randomBytes(3).toString("hex")}A1`;

  const { shop } = await prisma.$transaction(async (tx: typeof prisma) => {
    const owner = await tx.user.create({
      data: {
        name: campos.ownerName.data!,
        email: campos.email.data!,
        phone: campos.phone.data!,
        password: await bcrypt.hash(senhaInicial, 10),
        role: "OWNER",
      },
    });
    const shop = await tx.barbershop.create({
      data: {
        name: campos.name.data!,
        slug: campos.slug.data!,
        cnpj: campos.cnpj.data!,
        city,
        state: campos.state.data || null,
        address: typeof body.address === "string" ? body.address.trim() || null : null,
        whatsapp: campos.phone.data!,
        plan,
        planExpiresAt,
        isComplimentary,
        compReason: isComplimentary ? compReason ?? "criada pelo admin" : null,
        ownerId: owner.id,
      },
    });
    return { shop };
  });

  await logAdminAction({
    actorId: session.sub,
    action: "barbershop.created_by_admin",
    targetType: "Barbershop",
    targetId: shop.id,
    metadata: { name: shop.name, plan, isComplimentary, planExpiresAt: planExpiresAt?.toISOString() ?? null },
  });

  return NextResponse.json(
    {
      ok: true,
      id: shop.id,
      slug: shop.slug,
      email: campos.email.data,
      senhaInicial,
      aviso: "Anote a senha: ela não é mostrada de novo. Peça para o gestor trocá-la no primeiro acesso.",
    },
    { status: 201 },
  );
}

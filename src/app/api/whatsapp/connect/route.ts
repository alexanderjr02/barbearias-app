import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { verifyPhoneNumber, exchangeCodeForToken, embeddedSignupConfigured } from "@/lib/whatsappConnect";

// POST /api/whatsapp/connect — conecta o WhatsApp DESTA barbearia. Dois modos:
//
//   mode:"manual"   — o gestor cola o token permanente e o phone_number_id
//                     (ex.: do número de teste grátis da Meta). Testável JÁ.
//   mode:"embedded" — fecha o Embedded Signup: recebe o `code` do SDK da Meta
//                     e o phone_number_id/wabaId, troca o code por token e
//                     guarda. Só funciona depois da plataforma ser aprovada
//                     como Tech Provider (FACEBOOK_APP_ID/SECRET) — senão
//                     responde 501, sem quebrar.
//
// Em qualquer modo, as credenciais são VERIFICADAS contra a Meta antes de
// salvar (pergunta o número legível) — nada de gravar token que não presta.
export async function POST(request: NextRequest) {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const mode = body?.mode === "embedded" ? "embedded" : "manual";

  let accessToken: string;
  let phoneNumberId: string;
  let wabaId: string | null = null;

  if (mode === "embedded") {
    if (!embeddedSignupConfigured()) {
      return NextResponse.json(
        { error: "Conexão automática ainda não disponível — aguardando aprovação da sua plataforma pela Meta." },
        { status: 501 }
      );
    }
    const code = typeof body?.code === "string" ? body.code : "";
    phoneNumberId = typeof body?.phoneNumberId === "string" ? body.phoneNumberId : "";
    wabaId = typeof body?.wabaId === "string" ? body.wabaId : null;
    if (!code || !phoneNumberId) {
      return NextResponse.json({ error: "Faltou o código ou o número do Embedded Signup." }, { status: 400 });
    }
    const exchanged = await exchangeCodeForToken(code);
    if (!exchanged.ok) return NextResponse.json({ error: exchanged.error }, { status: 400 });
    accessToken = exchanged.accessToken;
  } else {
    accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
    phoneNumberId = typeof body?.phoneNumberId === "string" ? body.phoneNumberId.trim() : "";
    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: "Informe o token e o Phone Number ID." }, { status: 400 });
    }
  }

  // Verifica contra a Meta — confirma o par e já pega o número legível.
  const check = await verifyPhoneNumber(accessToken, phoneNumberId);
  if (!check.ok) {
    return NextResponse.json({ error: `Não consegui validar na Meta: ${check.error}` }, { status: 400 });
  }

  const templateName = typeof body?.templateName === "string" && body.templateName.trim() ? body.templateName.trim() : null;
  const templateLang = typeof body?.templateLang === "string" && body.templateLang.trim() ? body.templateLang.trim() : "pt_BR";

  const data = {
    phoneNumberId,
    accessToken,
    wabaId,
    displayPhone: check.displayPhone,
    templateName,
    templateLang,
    status: "connected",
  };

  await prisma.whatsappConnection.upsert({
    where: { barbershopId: session.barbershopId },
    create: { barbershopId: session.barbershopId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, displayPhone: check.displayPhone });
}

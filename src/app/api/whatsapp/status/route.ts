import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarbershopSession } from "@/lib/apiAuth";
import { embeddedSignupConfigured } from "@/lib/whatsappConnect";

// GET /api/whatsapp/status — estado da conexão de WhatsApp DESTA barbearia.
//
// Diz se está conectada, o número que aparece pro cliente, e se o botão de
// conexão automática (Embedded Signup) está disponível — que depende da
// plataforma já ter sido aprovada pela Meta (FACEBOOK_APP_ID/SECRET).
export async function GET() {
  const session = await requireBarbershopSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const conn = await prisma.whatsappConnection.findUnique({
    where: { barbershopId: session.barbershopId },
    select: { displayPhone: true, status: true, templateName: true, connectedAt: true, wabaId: true },
  });

  return NextResponse.json({
    connected: Boolean(conn),
    // Se a plataforma já está apta ao Embedded Signup (senão a UI mostra só o
    // cadastro manual com o número de teste).
    embeddedSignupAvailable: embeddedSignupConfigured(),
    connection: conn
      ? {
          displayPhone: conn.displayPhone,
          status: conn.status,
          templateName: conn.templateName,
          connectedAt: conn.connectedAt,
          hasWaba: Boolean(conn.wabaId),
        }
      : null,
  });
}

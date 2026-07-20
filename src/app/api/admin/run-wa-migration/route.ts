import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// TEMPORÁRIO — cria a tabela WhatsappConnection no Turso (mesmo motivo do
// endpoint de push: libsql não aceita migrate deploy e as credenciais não
// ficam na máquina). Idempotente, protegido por MIGRATION_SECRET. APAGAR
// depois de rodar uma vez.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "WhatsappConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barbershopId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhone" TEXT,
    "accessToken" TEXT NOT NULL,
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'pt_BR',
    "status" TEXT NOT NULL DEFAULT 'connected',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhatsappConnection_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappConnection_barbershopId_key" ON "WhatsappConnection"("barbershopId")`,
  `CREATE INDEX IF NOT EXISTS "WhatsappConnection_phoneNumberId_idx" ON "WhatsappConnection"("phoneNumberId")`,
];

async function run(request: NextRequest) {
  const secret = process.env.MIGRATION_SECRET;
  const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-migration-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const ran: string[] = [];
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    ran.push(sql.split("\n")[0].trim());
  }
  return NextResponse.json({ ok: true, ran });
}

export const GET = run;
export const POST = run;

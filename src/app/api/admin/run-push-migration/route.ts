import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// TEMPORÁRIO — cria a tabela PushSubscription no banco de produção (Turso).
//
// Existe só porque o banco de produção (libsql://) não aceita `prisma migrate
// deploy`, e as credenciais do Turso não ficam na máquina local. Este endpoint
// roda o DDL a partir do próprio app implantado, que já tem DATABASE_URL no
// ambiente. É idempotente (IF NOT EXISTS) e protegido por MIGRATION_SECRET.
//
// DEVE SER APAGADO logo após rodar uma vez — não faz parte da aplicação.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "barbershopId" TEXT,
    "role" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`,
  `CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId")`,
  `CREATE INDEX IF NOT EXISTS "PushSubscription_barbershopId_idx" ON "PushSubscription"("barbershopId")`,
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

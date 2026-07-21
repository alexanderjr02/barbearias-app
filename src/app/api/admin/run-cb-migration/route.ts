import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// TEMPORÁRIO — adiciona as colunas de chatbot na Barbershop do Turso via
// ADD COLUMN (seguro, sem dropar/recriar a tabela). Protegido por
// MIGRATION_SECRET. Cada ADD é isolado num try: rodar de novo não quebra se a
// coluna já existir. APAGAR depois de rodar.
const COLUMNS = [
  `ALTER TABLE "Barbershop" ADD COLUMN "chatbotEnabled" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "Barbershop" ADD COLUMN "chatbotName" TEXT`,
  `ALTER TABLE "Barbershop" ADD COLUMN "chatbotWelcome" TEXT`,
];

async function run(request: NextRequest) {
  const secret = process.env.MIGRATION_SECRET;
  const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-migration-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result: Record<string, string> = {};
  for (const sql of COLUMNS) {
    const col = sql.match(/ADD COLUMN "(\w+)"/)?.[1] ?? sql;
    try {
      await prisma.$executeRawUnsafe(sql);
      result[col] = "added";
    } catch (e) {
      // Já existe (rodou antes) ou erro — reporta sem derrubar as outras.
      result[col] = `skipped: ${e instanceof Error ? e.message.slice(0, 80) : "erro"}`;
    }
  }
  return NextResponse.json({ ok: true, result });
}

export const GET = run;
export const POST = run;

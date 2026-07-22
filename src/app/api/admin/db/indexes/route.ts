import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession } from "@/lib/apiAuth";

// GET/POST /api/admin/db/indexes — mostra e aplica os índices de escala.
//
// Por que isto é uma rota e não `prisma migrate deploy`: o datasource não tem
// `url` (a conexão vem do adaptador libsql em runtime), então as ferramentas
// de migração do Prisma não alcançam o Turso deste projeto. E as credenciais
// de produção são marcadas como sensíveis na Vercel — nem aparecem num
// `vercel env pull`. Quem tem acesso ao banco é a aplicação rodando. Então a
// aplicação aplica.
//
// Seguro de repetir: todo comando é IF NOT EXISTS. Índice não altera nenhum
// dado — só cria caminho de busca. Se algo der errado, `DROP INDEX <nome>`.
export const maxDuration = 300;

// Escolhidos a partir da contagem real de uso no `where` das consultas:
// barbershopId 20x, status 15x, date 9x, clientId 6x, staffId 1x.
const INDEXES: { name: string; sql: string }[] = [
  { name: "Appointment_barbershopId_date_idx", sql: `CREATE INDEX IF NOT EXISTS "Appointment_barbershopId_date_idx" ON "Appointment"("barbershopId", "date")` },
  { name: "Appointment_barbershopId_status_idx", sql: `CREATE INDEX IF NOT EXISTS "Appointment_barbershopId_status_idx" ON "Appointment"("barbershopId", "status")` },
  { name: "Appointment_clientId_date_idx", sql: `CREATE INDEX IF NOT EXISTS "Appointment_clientId_date_idx" ON "Appointment"("clientId", "date")` },
  { name: "Appointment_staffId_date_idx", sql: `CREATE INDEX IF NOT EXISTS "Appointment_staffId_date_idx" ON "Appointment"("staffId", "date")` },
  { name: "AutopilotLog_barbershopId_createdAt_idx", sql: `CREATE INDEX IF NOT EXISTS "AutopilotLog_barbershopId_createdAt_idx" ON "AutopilotLog"("barbershopId", "createdAt")` },
  { name: "ChatMessage_barbershopId_createdAt_idx", sql: `CREATE INDEX IF NOT EXISTS "ChatMessage_barbershopId_createdAt_idx" ON "ChatMessage"("barbershopId", "createdAt")` },
  { name: "FinancialTransaction_barbershopId_date_idx", sql: `CREATE INDEX IF NOT EXISTS "FinancialTransaction_barbershopId_date_idx" ON "FinancialTransaction"("barbershopId", "date")` },
  { name: "Notification_barbershopId_createdAt_idx", sql: `CREATE INDEX IF NOT EXISTS "Notification_barbershopId_createdAt_idx" ON "Notification"("barbershopId", "createdAt")` },
  { name: "Product_barbershopId_idx", sql: `CREATE INDEX IF NOT EXISTS "Product_barbershopId_idx" ON "Product"("barbershopId")` },
  { name: "Service_barbershopId_idx", sql: `CREATE INDEX IF NOT EXISTS "Service_barbershopId_idx" ON "Service"("barbershopId")` },
  { name: "Staff_barbershopId_idx", sql: `CREATE INDEX IF NOT EXISTS "Staff_barbershopId_idx" ON "Staff"("barbershopId")` },
];

async function existingIndexes(): Promise<string[]> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  )) as { name: string }[];
  return rows.map((r) => r.name);
}

/** Só mostra o estado — não altera nada. */
export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 403 });

  const present = await existingIndexes();
  const missing = INDEXES.filter((i) => !present.includes(i.name)).map((i) => i.name);
  return NextResponse.json({ total: INDEXES.length, faltando: missing.length, missing, present });
}

/** Aplica o que falta. Repetir é inofensivo. */
export async function POST() {
  const session = await requireSuperAdminSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 403 });

  const before = await existingIndexes();
  const created: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const idx of INDEXES) {
    if (before.includes(idx.name)) continue;
    try {
      // Um de cada vez: num índice grande isto leva tempo, e um erro em um
      // não pode impedir os outros de entrar.
      await prisma.$executeRawUnsafe(idx.sql);
      created.push(idx.name);
    } catch (err) {
      failed.push({ name: idx.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const after = await existingIndexes();
  const stillMissing = INDEXES.filter((i) => !after.includes(i.name)).map((i) => i.name);

  return NextResponse.json({
    ok: failed.length === 0,
    jaExistiam: INDEXES.length - created.length - stillMissing.length,
    criados: created,
    falharam: failed,
    faltando: stillMissing,
  });
}

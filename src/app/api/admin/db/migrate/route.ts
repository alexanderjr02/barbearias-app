import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";

// GET/POST /api/admin/db/migrate — aplica as mudancas de esquema pendentes.
//
// Por que existe: o datasource nao tem `url` (a conexao vem do adaptador
// libsql em runtime), entao `prisma migrate deploy` nao alcanca o Turso deste
// projeto. Quem tem acesso ao banco de producao e a aplicacao rodando.
//
// Por que o SQL e escrito a mao e nao copiado do Prisma: para adicionar
// coluna, o Prisma gera "RedefineTables" — cria uma tabela nova, copia tudo,
// DROPA a original e renomeia. Num banco de producao isso e uma faca: se
// falhar entre o DROP e o RENAME, a tabela sumiu. O SQLite aceita
// `ALTER TABLE ADD COLUMN` para coluna nula ou com padrao, que e o caso aqui.
// Aditivo, sem mover um byte de dado.
//
// Cada passo checa antes de agir, entao repetir e inofensivo.
export const maxDuration = 300;

interface Step {
  name: string;
  /** Ja esta aplicado? */
  applied: () => Promise<boolean>;
  sql: string[];
}

async function tableExists(name: string): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    name,
  )) as { name: string }[];
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = (await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)) as { name: string }[];
  return rows.some((r) => r.name === column);
}

const STEPS: Step[] = [
  {
    name: "Barbershop.planExpiresAt",
    applied: () => columnExists("Barbershop", "planExpiresAt"),
    sql: [`ALTER TABLE "Barbershop" ADD COLUMN "planExpiresAt" DATETIME`],
  },
  {
    name: "Barbershop.isComplimentary",
    applied: () => columnExists("Barbershop", "isComplimentary"),
    sql: [`ALTER TABLE "Barbershop" ADD COLUMN "isComplimentary" BOOLEAN NOT NULL DEFAULT false`],
  },
  {
    name: "Barbershop.compReason",
    applied: () => columnExists("Barbershop", "compReason"),
    sql: [`ALTER TABLE "Barbershop" ADD COLUMN "compReason" TEXT`],
  },
  {
    name: "Coupon",
    applied: () => tableExists("Coupon"),
    sql: [
      `CREATE TABLE "Coupon" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
        "durationDays" INTEGER,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "expiresAt" DATETIME,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "note" TEXT,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Coupon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code")`,
      `CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive")`,
    ],
  },
  {
    name: "CouponRedemption",
    applied: () => tableExists("CouponRedemption"),
    sql: [
      `CREATE TABLE "CouponRedemption" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "couponId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CouponRedemption_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX "CouponRedemption_couponId_barbershopId_key" ON "CouponRedemption"("couponId", "barbershopId")`,
      `CREATE INDEX "CouponRedemption_barbershopId_idx" ON "CouponRedemption"("barbershopId")`,
    ],
  },
  {
    // Atribuicao de marketing (Onda 1). Tabela nova, puramente aditiva — o caso
    // seguro: nao move nenhum dado existente. SQL identico a migration.sql.
    name: "Lead",
    applied: () => tableExists("Lead"),
    sql: [
      `CREATE TABLE "Lead" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "phoneKey" TEXT NOT NULL,
        "name" TEXT,
        "channel" TEXT NOT NULL DEFAULT 'UNKNOWN',
        "campaign" TEXT,
        "ctwaClid" TEXT,
        "sourceId" TEXT,
        "sourceUrl" TEXT,
        "adHeadline" TEXT,
        "stage" TEXT NOT NULL DEFAULT 'NEW',
        "isNewClient" BOOLEAN NOT NULL DEFAULT true,
        "clientId" TEXT,
        "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "scheduledAt" DATETIME,
        "showedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Lead_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE INDEX "Lead_barbershopId_channel_idx" ON "Lead"("barbershopId", "channel")`,
      `CREATE INDEX "Lead_barbershopId_capturedAt_idx" ON "Lead"("barbershopId", "capturedAt")`,
      `CREATE UNIQUE INDEX "Lead_barbershopId_phoneKey_key" ON "Lead"("barbershopId", "phoneKey")`,
    ],
  },
];

/** Mesma chave de emergencia das outras rotas de destravamento. */
async function autorizado(request: NextRequest): Promise<boolean> {
  if (await requireSuperAdminSession()) return true;
  const expected = process.env.ADMIN_RECOVERY_SECRET;
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(request.headers.get("x-admin-recovery-secret") ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function estado() {
  const out: { name: string; applied: boolean }[] = [];
  for (const s of STEPS) out.push({ name: s.name, applied: await s.applied() });
  return out;
}

/** So mostra o que falta. Nao altera nada. */
export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) return denyAdmin();
  const passos = await estado();
  return NextResponse.json({ total: passos.length, pendentes: passos.filter((p) => !p.applied).length, passos });
}

/** Aplica o que falta. */
export async function POST(request: NextRequest) {
  if (!(await autorizado(request))) return denyAdmin();

  const aplicados: string[] = [];
  const falhas: { name: string; error: string }[] = [];

  for (const step of STEPS) {
    if (await step.applied()) continue;
    try {
      for (const sql of step.sql) await prisma.$executeRawUnsafe(sql);
      aplicados.push(step.name);
    } catch (err) {
      falhas.push({ name: step.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const passos = await estado();
  return NextResponse.json({
    ok: falhas.length === 0,
    aplicados,
    falhas,
    pendentes: passos.filter((p) => !p.applied).map((p) => p.name),
  });
}

import { PrismaLibSql } from "@prisma/adapter-libsql";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // Turso (libsql://) exige token de autenticação; SQLite em arquivo, não.
  // Mandar authToken undefined para um "file:" é inofensivo, mas manter a
  // condição deixa explícito que são dois modos de operação diferentes:
  // arquivo local no desenvolvimento, banco na nuvem em produção.
  const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

  const adapter = new PrismaLibSql({
    url,
    ...(isRemote && { authToken: process.env.DATABASE_AUTH_TOKEN }),
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

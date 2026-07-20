// Sai com 0 (sucesso) quando o banco NÃO tem barbearia nenhuma — a condição
// que o docker-entrypoint usa para decidir se roda o seed. Qualquer erro
// também devolve "não vazio": na dúvida, é melhor não semear do que duplicar
// os dados de uma barbearia que já está rodando.
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url,
    ...(isRemote && { authToken: process.env.DATABASE_AUTH_TOKEN }),
  }),
});

prisma.barbershop
  .count()
  .then((n) => {
    console.log(`barbearias no banco: ${n}`);
    process.exit(n === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error("não consegui verificar o banco:", e.message);
    process.exit(1);
  });

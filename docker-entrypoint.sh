#!/bin/sh
set -e

# Applies any pending migrations against whatever DATABASE_URL points at
# (the mounted volume) before the server starts — safe to run on every
# container start, it's a no-op when there's nothing pending.
echo "Running database migrations..."
# Not `npx prisma` — the Next.js standalone output doesn't carry
# node_modules/.bin, so the "prisma" shim isn't on PATH. The CLI's actual
# entry file is still there, so call it directly through node instead.
node node_modules/prisma/build/index.js migrate deploy

# Popula o banco no primeiro boot.
#
# Sem isto o deploy sobe com o banco vazio: sem planos, sem barbearia e sem
# nenhuma conta — não dá nem para entrar na tela de login.
#
# Duas travas, porque o seed NÃO é idempotente (tem create direto, não só
# upsert) e rodar duas vezes duplicaria dados:
#   1. só roda com SEED_ON_FIRST_BOOT=1 (você liga no 1º deploy e desliga);
#   2. mesmo assim, só se o banco estiver vazio de verdade.
if [ "$SEED_ON_FIRST_BOOT" = "1" ]; then
  echo "SEED_ON_FIRST_BOOT=1 — verificando se o banco está vazio..."
  if node scripts/is-db-empty.js; then
    echo "Banco vazio. Populando..."
    # Sem o "if", um seed que falha passava batido e o container subia com o
    # banco vazio dizendo "concluído" — ninguém conseguia entrar e o log não
    # deixava óbvio o porquê. Melhor o deploy falhar alto.
    if node node_modules/tsx/dist/cli.mjs prisma/seed.ts; then
      echo "Seed concluído."
    else
      echo "ERRO: o seed falhou. Abortando o boot para não subir com o banco vazio." >&2
      exit 1
    fi
  else
    echo "Banco já tem dados — seed ignorado (evita duplicar)."
  fi
fi

exec "$@"

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

exec "$@"

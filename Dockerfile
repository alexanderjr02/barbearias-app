# Debian slim (glibc), not Alpine — @libsql/client ships platform-specific
# native bindings (@libsql/linux-x64-gnu etc.) that are safest to resolve
# against glibc rather than musl.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runtime image ---
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Quiets Prisma's libssl-detection warning at migrate time (cosmetic only —
# this project's driver adapter never touches the native query engine, so
# the warning was never something that could actually fail).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Full node_modules first — the Prisma CLI (used by docker-entrypoint.sh to
# run migrations) pulls in transitive deps standalone's tracing doesn't
# follow, since it only traces the Next.js app's own runtime, not the CLI.
# The standalone output copied next overlays its own pruned node_modules on
# top, so the app itself still runs from the smaller, deduped set.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown nextjs:nodejs ./docker-entrypoint.sh

# Uploaded images (public/uploads) and the SQLite file (data/dev.db) are
# meant to be mounted as named volumes — create both dirs with the right
# ownership up front. Docker copies a pre-existing directory's contents and
# ownership into a named volume on its first mount, so this is what makes
# the volume writable by the non-root "nextjs" user instead of root.
RUN mkdir -p ./public/uploads ./data \
  && chown -R nextjs:nodejs ./public/uploads ./data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

# Build context MUST be the monorepo root (npm workspaces need the root lockfile).
#   docker build -f apps/bot-server/Dockerfile -t tel-bot-server .

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# ---- deps: install full workspace (dev deps included, needed to compile) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/bot-server/package.json apps/bot-server/package.json
COPY apps/admin-panel/package.json apps/admin-panel/package.json
RUN npm ci

# ---- build: generate prisma client + compile TypeScript ----
FROM deps AS build
COPY apps/bot-server apps/bot-server
RUN npm run prisma:generate
RUN npm run build:server
RUN npm prune --omit=dev

# ---- runner: minimal production image ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
WORKDIR /app/apps/bot-server

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/bot-server/dist ./dist
COPY --from=build /app/apps/bot-server/prisma ./prisma
COPY --from=build /app/apps/bot-server/package.json ./package.json

RUN mkdir -p /app/apps/bot-server/uploads && chown -R app:app /app

USER app
EXPOSE 3000

# migrate deploy applies committed migrations; the seed script is idempotent
# (skips if the admin username already exists) so it's safe to run on every boot.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/server.js"]

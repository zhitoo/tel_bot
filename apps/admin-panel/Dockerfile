# Build context MUST be the monorepo root (npm workspaces need the root lockfile).
#   docker build -f apps/admin-panel/Dockerfile -t tel-bot-admin .

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin-panel/package.json apps/admin-panel/package.json
COPY apps/bot-server/package.json apps/bot-server/package.json
RUN npm ci

COPY apps/admin-panel apps/admin-panel
RUN npm run build:admin

FROM nginx:alpine AS runner
COPY --from=build /app/apps/admin-panel/dist /usr/share/nginx/html
COPY apps/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

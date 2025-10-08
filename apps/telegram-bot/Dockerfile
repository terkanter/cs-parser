# Base stage with common dependencies
FROM node:22-alpine AS base

RUN apk update && apk add --no-cache libc6-compat
RUN npm install -g corepack@latest && corepack enable

# Prune stage - create a subset of the monorepo with only required dependencies
FROM base AS pruner

WORKDIR /app

# Copy only the files needed for dependency resolution
COPY . .

RUN pnpm dlx turbo prune @repo/telegram-bot --docker

# Builder stage - install dependencies and build the application
FROM base AS builder

WORKDIR /app

# Copy pruned workspace files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/full/ .

# Install dependencies and generate Prisma client
RUN pnpm install --frozen-lockfile && \
    pnpm run --filter @repo/prisma... db:generate

# Build the application
RUN pnpm run --filter @repo/telegram-bot... build

# Runner stage - production environment
FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only the necessary built files and dependencies
COPY --from=builder --chown=1001:1001 /app/apps/telegram-bot/dist/ ./apps/telegram-bot/dist/
COPY --from=builder --chown=1001:1001 /app/packages/prisma/prisma/ ./packages/prisma/prisma/
COPY --from=builder --chown=1001:1001 /app/packages/prisma/generated/client/ ./packages/prisma/generated/client/
COPY --from=builder --chown=1001:1001 /app/packages/api-core/dist/ ./packages/api-core/dist/
COPY --from=builder --chown=1001:1001 /app/packages/api-errors/dist/ ./packages/api-errors/dist/
COPY --from=builder --chown=1001:1001 /app/packages/steam-api/dist/ ./packages/steam-api/dist/
COPY --from=builder --chown=1001:1001 /app/node_modules/ ./node_modules/
COPY --from=builder --chown=1001:1001 /app/apps/telegram-bot/node_modules/ ./apps/telegram-bot/node_modules/
COPY --from=builder --chown=1001:1001 /app/packages/prisma/node_modules/ ./packages/prisma/node_modules/

USER nodejs

CMD ["node", "./apps/telegram-bot/dist/index.js"]

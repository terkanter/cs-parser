# Base stage with common dependencies
FROM node:22-alpine AS base

RUN apk update && apk add --no-cache libc6-compat
RUN npm install -g corepack@latest && corepack enable

# Prune stage - create a subset of the monorepo with only required dependencies
FROM base AS pruner

WORKDIR /app

# Copy only the files needed for dependency resolution
COPY . .

RUN pnpm dlx turbo prune @repo/api --docker

# Builder stage - install dependencies and build the application
FROM base AS builder

WORKDIR /app

# Copy pruned workspace files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/full/ .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate prisma client
RUN pnpm run --filter @repo/prisma... db:generate

# Build the application
ENV CI true
RUN pnpm run --filter @repo/api... build

# Runner stage - production environment
FROM node:22-alpine AS runner

ENV NODE_ENV production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only the necessary built files and node_modules
COPY --from=builder --chown=1001:1001 /app/apps/api/dist ./
COPY --from=builder --chown=1001:1001 /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=1001:1001 /app/packages ./packages

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]

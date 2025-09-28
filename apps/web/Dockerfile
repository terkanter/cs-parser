# Base stage with common dependencies
FROM node:22-alpine AS base

RUN apk update && apk add --no-cache libc6-compat
RUN npm install -g corepack@latest && corepack enable

# Prune stage - create a subset of the monorepo with only required dependencies
FROM base AS pruner

WORKDIR /app

# Copy only the files needed for dependency resolution
COPY . .

RUN pnpm dlx turbo prune @repo/web --docker

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

# Build the application
ENV CI true
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_API_URL
RUN echo "Building with VITE_API_URL=${VITE_API_URL}"
RUN pnpm run --filter @repo/web... build

# Runner stage - production environment
FROM node:22-alpine AS runner

ENV NODE_ENV production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install serve globally
RUN npm install -g serve

# Copy built application
COPY --from=builder --chown=1001:1001 /app/apps/web/dist ./dist

USER nextjs

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]

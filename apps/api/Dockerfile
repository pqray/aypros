# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/integrations/package.json packages/integrations/package.json
COPY packages/scoring/package.json packages/scoring/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/eslint-config packages/eslint-config
COPY packages/integrations packages/integrations
COPY packages/scoring packages/scoring
COPY packages/types packages/types
COPY packages/validation packages/validation
RUN pnpm --filter api build
RUN pnpm --filter api deploy --prod --legacy /prod/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
COPY --from=builder /prod/api ./
EXPOSE 4000
CMD ["node", "dist/server.js"]

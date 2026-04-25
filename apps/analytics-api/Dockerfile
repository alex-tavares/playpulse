FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/ingest/package.json ./apps/ingest/package.json
COPY apps/analytics-api ./apps/analytics-api
COPY apps/warehouse-worker/package.json ./apps/warehouse-worker/package.json

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate && pnpm --filter @playpulse/analytics-api run build

ENV NODE_ENV=production

EXPOSE 4002

CMD ["pnpm", "--filter", "@playpulse/analytics-api", "exec", "tsx", "src/server.ts"]

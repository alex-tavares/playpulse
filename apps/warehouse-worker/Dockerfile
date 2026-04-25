FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/ingest/package.json ./apps/ingest/package.json
COPY apps/analytics-api/package.json ./apps/analytics-api/package.json
COPY apps/warehouse-worker ./apps/warehouse-worker

RUN pnpm install --frozen-lockfile

RUN pnpm exec prisma generate && pnpm --filter @playpulse/warehouse-worker run build

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@playpulse/warehouse-worker", "exec", "tsx", "src/cli.ts", "refresh:all"]

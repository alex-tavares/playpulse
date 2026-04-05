import { PrismaClient } from '@prisma/client';

import { createAnalyticsApp } from './app';
import { readAnalyticsConfig } from './config/analytics-config';
import { createLogger } from './lib/logger';

const config = readAnalyticsConfig();
const logger = createLogger();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.PLAYPULSE_DATABASE_URL,
    },
  },
});
const app = createAnalyticsApp({
  config,
  logger,
  prisma,
});

const server = app.listen(config.analyticsPort, config.analyticsHost, () => {
  logger.info({
    host: config.analyticsHost,
    port: config.analyticsPort,
    service: 'analytics',
    ts: new Date().toISOString(),
  });
});

const shutdown = async (signal: string) => {
  logger.info({
    service: 'analytics',
    signal,
    ts: new Date().toISOString(),
  });

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

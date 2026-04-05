import { PrismaClient } from '@prisma/client';

import { createIngestApp } from './app';
import { readIngestConfig } from './config/ingest-config';
import { createLogger } from './lib/logger';

const config = readIngestConfig();
const logger = createLogger();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.PLAYPULSE_DATABASE_URL,
    },
  },
});
const app = createIngestApp({
  config,
  logger,
  prisma,
});

const server = app.listen(config.ingestPort, config.ingestHost, () => {
  logger.info({
    host: config.ingestHost,
    port: config.ingestPort,
    service: 'ingest',
    ts: new Date().toISOString(),
  });
});

const shutdown = async (signal: string) => {
  logger.info({
    service: 'ingest',
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

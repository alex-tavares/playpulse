import { PrismaClient } from '@prisma/client';

import { readWarehouseConfig } from './config/warehouse-config';
import { WarehouseRepo } from './repos/warehouse-repo';
import { DateDimensionService } from './services/date-dimension-service';
import { DemoSeedService } from './services/demo-seed-service';
import { RetentionRefreshService } from './services/retention-refresh-service';
import { RollingRefreshService } from './services/rolling-refresh-service';
import { createCommandOutput, type WarehouseCommand } from './lib/command-output';

const createServices = (prisma: PrismaClient) => {
  const config = readWarehouseConfig();
  const repo = new WarehouseRepo(prisma);
  const dateDimensionService = new DateDimensionService(repo, config);
  const rollingRefreshService = new RollingRefreshService({
    ensureDimDateCoverage: () => dateDimensionService.ensureCoverage(),
    refreshCharacterPopularity: () => repo.refreshMaterializedView('mv_character_popularity'),
    refreshMetricsSummary: () => repo.refreshMaterializedView('mv_metrics_summary_current'),
    refreshSessionsDaily: () => repo.refreshMaterializedView('mv_sessions_daily'),
  });
  const retentionRefreshService = new RetentionRefreshService(repo);
  const demoSeedService = new DemoSeedService(repo);

  return {
    demoSeedService,
    retentionRefreshService,
    rollingRefreshService,
  };
};

const main = async () => {
  const command = process.argv[2] as WarehouseCommand | undefined;
  const startedAtMs = Date.now();
  const prisma = new PrismaClient();

  try {
    const { demoSeedService, retentionRefreshService, rollingRefreshService } =
      createServices(prisma);

    switch (command) {
      case 'refresh:all': {
        await rollingRefreshService.run();
        const retentionResult = await retentionRefreshService.run();
        console.info(
          JSON.stringify(
            createCommandOutput(command, startedAtMs, () => new Date(), {
              cohort_count: retentionResult.cohortCount,
            })
          )
        );
        break;
      }
      case 'refresh:retention': {
        const retentionResult = await retentionRefreshService.run();
        console.info(
          JSON.stringify(
            createCommandOutput(command, startedAtMs, () => new Date(), {
              cohort_count: retentionResult.cohortCount,
            })
          )
        );
        break;
      }
      case 'refresh:rolling': {
        await rollingRefreshService.run();
        console.info(JSON.stringify(createCommandOutput(command, startedAtMs, () => new Date())));
        break;
      }
      case 'seed:demo': {
        const seedResult = await demoSeedService.run();
        console.info(
          JSON.stringify(
            createCommandOutput(command, startedAtMs, () => new Date(), {
              generated_count: seedResult.generatedCount,
              inserted_count: seedResult.insertedCount,
            })
          )
        );
        break;
      }
      default: {
        throw new Error(
          'Unsupported command. Use refresh:rolling, refresh:retention, refresh:all, or seed:demo.'
        );
      }
    }
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown warehouse worker failure';
  console.error(
    JSON.stringify({
      error: message,
      status: 'error',
    })
  );
  process.exitCode = 1;
});

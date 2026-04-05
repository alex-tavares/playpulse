interface RollingRefreshDependencies {
  ensureDimDateCoverage(): Promise<unknown>;
  refreshCharacterPopularity(): Promise<unknown>;
  refreshMetricsSummary(): Promise<unknown>;
  refreshSessionsDaily(): Promise<unknown>;
}

export class RollingRefreshService {
  public constructor(private readonly dependencies: RollingRefreshDependencies) {}

  public async run() {
    await this.dependencies.ensureDimDateCoverage();
    await this.dependencies.refreshSessionsDaily();
    await this.dependencies.refreshCharacterPopularity();
    await this.dependencies.refreshMetricsSummary();
  }
}

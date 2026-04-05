import { deriveRetentionCohorts } from '../lib/retention';

interface RetentionRepo {
  listRetentionSessionStarts(): Promise<
    {
      gameId: string;
      occurredAt: Date;
      playerIdHash: string;
    }[]
  >;
  replaceRetentionCohorts(
    cohorts: ReturnType<typeof deriveRetentionCohorts>
  ): Promise<void>;
}

export class RetentionRefreshService {
  public constructor(
    private readonly repo: RetentionRepo,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async run() {
    const refreshedAt = this.now();
    const facts = await this.repo.listRetentionSessionStarts();
    const cohorts = deriveRetentionCohorts(facts, refreshedAt);

    await this.repo.replaceRetentionCohorts(cohorts);

    return {
      cohortCount: cohorts.length,
    };
  }
}

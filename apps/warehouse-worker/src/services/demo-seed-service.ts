import { generateDemoSeedEvents } from '../lib/demo-data';

interface DemoSeedRepo {
  resetDemoSeedData(): Promise<void>;
  seedRawEvents(events: ReturnType<typeof generateDemoSeedEvents>): Promise<number>;
}

export class DemoSeedService {
  public constructor(
    private readonly repo: DemoSeedRepo,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async run() {
    const generatedEvents = generateDemoSeedEvents(this.now());

    await this.repo.resetDemoSeedData();

    const insertedCount = await this.repo.seedRawEvents(generatedEvents);

    return {
      generatedCount: generatedEvents.length,
      insertedCount,
    };
  }
}

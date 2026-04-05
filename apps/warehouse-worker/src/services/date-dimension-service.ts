import type { WarehouseConfig } from '../config/warehouse-config';
import { enumerateCalendarDates } from '../lib/date-range';

interface DateDimensionRepo {
  upsertDimDates(dateKeys: string[]): Promise<number>;
}

export class DateDimensionService {
  public constructor(
    private readonly repo: DateDimensionRepo,
    private readonly config: Pick<WarehouseConfig, 'dimDatesEnd' | 'dimDatesStart'>
  ) {}

  public async ensureCoverage() {
    const dateKeys = enumerateCalendarDates(this.config.dimDatesStart, this.config.dimDatesEnd);
    return this.repo.upsertDimDates(dateKeys);
  }
}

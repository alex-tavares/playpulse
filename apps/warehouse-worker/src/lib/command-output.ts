export type WarehouseCommand =
  | 'refresh:all'
  | 'refresh:retention'
  | 'refresh:rolling'
  | 'seed:demo';

export interface CommandOutputFields {
  cohort_count?: number;
  generated_count?: number;
  inserted_count?: number;
}

export const createCommandOutput = (
  command: WarehouseCommand,
  startedAtMs: number,
  now: () => Date,
  fields: CommandOutputFields = {}
) => {
  const finishedAt = now();

  return {
    ...fields,
    command,
    duration_ms: finishedAt.getTime() - startedAtMs,
    refreshed_at: finishedAt.toISOString(),
    status: 'ok',
  };
};

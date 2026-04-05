import { readPlayPulseConfig, type PlayPulseConfig } from '@playpulse/config';

export interface WarehouseConfig extends PlayPulseConfig {
  dimDatesEnd: Date;
  dimDatesStart: Date;
}

export const readWarehouseConfig = (
  env: Record<string, string | undefined> = process.env
): WarehouseConfig => ({
  ...readPlayPulseConfig(env),
  dimDatesEnd: new Date('2030-12-31T00:00:00.000Z'),
  dimDatesStart: new Date('2024-01-01T00:00:00.000Z'),
});

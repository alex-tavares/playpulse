const schemaVersionPattern = /^(\d+)\.(\d+)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const findUnsupportedSchemaVersion = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.events)) {
    return null;
  }

  for (const event of payload.events) {
    if (!isRecord(event) || typeof event.schema_version !== 'string') {
      continue;
    }

    const match = schemaVersionPattern.exec(event.schema_version);
    if (match && Number.parseInt(match[1] ?? '0', 10) !== 1) {
      return event.schema_version;
    }
  }

  return null;
};

import { describe, expect, it } from 'vitest';

import { HttpError, createErrorEnvelope, toHttpError } from './http-error';

describe('http errors', () => {
  it('creates the canonical error envelope shape', () => {
    const envelope = createErrorEnvelope(
      'request-1',
      new HttpError(400, 'validation_failed', 'Validation failed', {
        details: [{ path: 'events.0', message: 'invalid' }],
      })
    );

    expect(envelope).toEqual({
      error: {
        code: 'validation_failed',
        details: [{ path: 'events.0', message: 'invalid' }],
        message: 'Validation failed',
      },
      request_id: 'request-1',
    });
  });

  it('maps oversized body parser errors to payload_too_large', () => {
    const error = toHttpError({ type: 'entity.too.large' });

    expect(error.code).toBe('payload_too_large');
    expect(error.statusCode).toBe(413);
  });
});

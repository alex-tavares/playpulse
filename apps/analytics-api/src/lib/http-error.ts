import type { NextFunction, Request, Response } from 'express';

export type ErrorCode =
  | 'bad_request'
  | 'validation_failed'
  | 'unauthorized'
  | 'signature_invalid'
  | 'timestamp_out_of_window'
  | 'replay_detected'
  | 'payload_too_large'
  | 'rate_limited_ip'
  | 'rate_limited_key'
  | 'unsupported_schema_version'
  | 'not_found'
  | 'internal_error';

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    details?: unknown;
    message: string;
  };
  request_id: string;
}

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;
  readonly statusCode: number;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options?: {
      details?: unknown;
      headers?: Record<string, string>;
    }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

export const createErrorEnvelope = (requestId: string, error: HttpError): ErrorEnvelope => {
  const envelope: ErrorEnvelope = {
    error: {
      code: error.code,
      message: error.message,
    },
    request_id: requestId,
  };

  if (error.details !== undefined) {
    envelope.error.details = error.details;
  }

  return envelope;
};

export const sendHttpError = (response: Response, requestId: string, error: HttpError) => {
  for (const [headerName, headerValue] of Object.entries(error.headers ?? {})) {
    response.setHeader(headerName, headerValue);
  }

  return response.status(error.statusCode).json(createErrorEnvelope(requestId, error));
};

export const notFoundHandler = (_request: Request, _response: Response, next: NextFunction) => {
  next(new HttpError(404, 'not_found', 'Route not found'));
};

export const toHttpError = (error: unknown): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  return new HttpError(500, 'internal_error', 'Unexpected server-side failure');
};

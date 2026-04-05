import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const buildSignaturePayload = (
  timestamp: string,
  nonce: string,
  rawBody: Buffer | string
) => `${timestamp}\n${nonce}\n${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody}`;

export const hashOpaqueValue = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const signSignaturePayload = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(payload, 'utf8').digest();

export const verifySignature = (payload: string, secret: string, receivedSignature: string) => {
  try {
    const expected = signSignaturePayload(payload, secret);
    const received = Buffer.from(receivedSignature, 'base64');

    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
};

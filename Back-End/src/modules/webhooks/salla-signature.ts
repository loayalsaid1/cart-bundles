import crypto from 'crypto';

export interface WebhookValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Verify the HMAC-SHA256 signature Salla sends on webhook requests.
 * Salla signs the raw request body; the digest must match `x-salla-signature`.
 * The comparison is constant-time to avoid leaking the digest byte by byte.
 */
export function validateWebhookRequest(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): WebhookValidationResult {
  if (!signature) {
    return { success: false, error: 'Missing signature' };
  }

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expected = Buffer.from(computedSignature, 'utf8');
  const received = Buffer.from(signature, 'utf8');

  const matches =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!matches) {
    return { success: false, error: 'Invalid signature' };
  }

  return { success: true };
}

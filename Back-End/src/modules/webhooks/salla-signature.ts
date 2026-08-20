import crypto from 'crypto';

export interface WebhookValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Verify the HMAC-SHA256 signature Salla sends on webhook requests.
 * Salla signs the raw request body; the digest must match `x-salla-signature`.
 */
export function validateWebhookRequest(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
): WebhookValidationResult {
  if (!secret) {
    return { success: false, error: 'Missing salla secret' };
  }
  if (!signature) {
    return { success: false, error: 'Missing signature' };
  }

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const signatureMatches = signature === computedSignature;
  if (!signatureMatches) {
    return { success: false, error: 'Invalid signature' };
  }

  return { success: true };
}

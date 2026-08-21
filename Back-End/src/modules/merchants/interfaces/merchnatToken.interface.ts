import { SallaTokenData } from "src/modules/auth/types/salla-token.interface";

export interface MerchantAuthorizeInput {
  merchantId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Result of asking for a valid access token. `success: false` carries a
 * `reason` so callers can react differently:
 *  - `not_found`        merchant never authorized / was deactivated
 *  - `reauth_required`  Salla rejected the refresh token; merchant must
 *                        re-install / redo OAuth
 *  - `refresh_failed`   transient error (network, Salla 5xx); safe to retry
 */
export type TokenResult =
  | { success: true; accessToken: string }
  | { success: false; reason: 'not_found' }
  | { success: false; reason: 'reauth_required' }
  | { success: false; reason: 'refresh_failed'; error: string };

/** Internal result of a raw OAuth refresh call to Salla. */
export type RefreshResult =
  | { success: true; data: SallaTokenData }
  | { success: false; reason: 'reauth_required' }
  | { success: false; reason: 'refresh_failed'; error: string };

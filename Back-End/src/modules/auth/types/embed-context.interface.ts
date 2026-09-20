/**
 * Authenticated embed context attached to `request.user` by SallaAuthGuard.
 * Derived from the local JWT issued after Salla token introspection.
 */
export interface EmbedContext {
  merchantId?: number;
  userId: number;
  role?: 'admin' | 'merchant';
}

export type EmbedTokenVerificationResult =
  | {
      success: true;
      data: EmbedContext;
    }
  | {
      success: false;
      error: string;
    };

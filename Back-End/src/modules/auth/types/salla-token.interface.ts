/** Merchant OAuth token row shape used by the token lifecycle. */
export interface SallaTokenData {
  merchantId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Successful result of the Salla exchange-authority introspect endpoint. */
export interface SallaIntrospectData {
  merchant_id: number;
  user_id: number;
  exp?: number;
}

export type SallaInspectResult =
  | { success: true; data: SallaIntrospectData }
  | { success: false; error?: string, isUpstreamError?: boolean };

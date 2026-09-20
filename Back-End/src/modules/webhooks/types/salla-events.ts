/** A gradual type for Salla app events including id, merchant. */
export interface SallaAppEventBase {
  event: string;
  merchant: number;
  created_at: string;
  data?: object;
}

export interface SallaAppAuthorizedEvent extends SallaAppEventBase {
  data: {
    access_token: string;
    refresh_token: string;
    expires: number;
  };
}

export interface SallaOrderWebhookEvent extends SallaAppEventBase {
  event: 'order.created' | 'order.updated';
  data: Record<string, unknown>;
}

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

export interface SallaAppUninstalledEvent extends SallaAppEventBase {
  event: 'app.uninstalled';
  data: {
    uninstallation_date?: string;
    refunded?: boolean;
    store_type?: string;
  };
}

export interface SallaOrderItemAmounts {
  price_without_tax?: { amount?: number };
  total?: { amount?: number };
}

export interface SallaOrderItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  amounts?: SallaOrderItemAmounts;
  product?: {
    id: number;
    type: string;
    name: string;
    sku: string;
  } | null;
}

export interface SallaOrderData {
  id: number;
  reference_id: number;
  status: {
    id: number;
    name: string;
    slug: string;
  };
  items: SallaOrderItem[];
}

export interface SallaOrderWebhookEvent extends SallaAppEventBase {
  event: 'order.created' | 'order.updated';
  data: SallaOrderData;
}

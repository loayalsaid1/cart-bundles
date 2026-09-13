export type ActivityActorType =
  | 'merchant'
  | 'admin'
  | 'system'
  | 'storefront'
  | 'salla';

export type ActivitySeverity = 'info' | 'warn' | 'error';

export interface RecordActivityInput {
  merchantId?: number | null;
  actorType: ActivityActorType;
  actorId?: string | number | null;
  action: string;
  entityType?: string | null;
  entityId?: string | number | null;
  offerId?: number | null;
  severity?: ActivitySeverity;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivityListQuery {
  merchantId?: number;
  action?: string;
  severity?: ActivitySeverity;
  offerId?: number;
  limit?: number;
  offset?: number;
}

export interface MerchantHealthSnapshot {
  merchantId: number;
  isActive: boolean;
  tokenStatus: 'valid' | 'expiring' | 'expired' | 'missing';
  tokenExpiresAt: string | null;
  lastWebhookAt: string | null;
  lastWebhookEvent: string | null;
  lastActivityAt: string | null;
  offerCounts: {
    total: number;
    active: number;
    paused: number;
    draft: number;
    expired: number;
  };
  stats: {
    impressions: number;
    clicks: number;
    addToCart: number;
    conversions: number;
  };
  redisConnected: boolean;
}

export interface AdminOverview {
  merchants: {
    total: number;
    active: number;
    inactive: number;
  };
  offers: {
    total: number;
    active: number;
  };
  webhooksLast24h: number;
  redisConnected: boolean;
  recentErrors: Array<{
    id: number;
    merchantId: number | null;
    action: string;
    message: string | null;
    createdAt: Date;
  }>;
}

export interface OfferStatsSnapshot {
  offerId: number;
  merchantId: number;
  impressions: number;
  clicks: number;
  addToCart: number;
  conversions: number;
}

export type StorefrontEventName =
  | 'offer.impression'
  | 'offer.click'
  | 'offer.add_to_cart'
  | 'offer.conversion';

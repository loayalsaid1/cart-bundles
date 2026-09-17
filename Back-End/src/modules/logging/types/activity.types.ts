import type {
  activityActorTypeEnum,
  activitySeverityEnum,
} from '../../../database/entities/activity-logs';

export type ActivityActorType =
  (typeof activityActorTypeEnum)['enumValues'][number];

export type ActivitySeverity =
  (typeof activitySeverityEnum)['enumValues'][number];

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

export const STOREFRONT_EVENTS = [
  'offer.impression',
  'offer.click',
  'offer.add_to_cart',
  'offer.conversion',
] as const;

export type StorefrontEventName = (typeof STOREFRONT_EVENTS)[number];

export type OfferStatField =
  'impressions' | 'clicks' | 'addToCart' | 'conversions';

export const STOREFRONT_EVENT_FIELD: Record<
  StorefrontEventName,
  OfferStatField
> = {
  'offer.impression': 'impressions',
  'offer.click': 'clicks',
  'offer.add_to_cart': 'addToCart',
  'offer.conversion': 'conversions',
};

/** Payload accepted by the public storefront ingest endpoint and its worker. */
export interface StorefrontEventJob {
  merchantId: number;
  offerId: number;
  event: StorefrontEventName;
  productId?: number;
  source?: string;
}

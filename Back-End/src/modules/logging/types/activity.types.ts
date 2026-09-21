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
  excludeStorefront?: boolean;
}

export interface DailyStatPoint {
  date: string;
  impressions: number;
  clicks: number;
  addToCart: number;
  conversions: number;
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
    conversionsAttributed: number;
    revenueGenerated: number;
    revenueAttributed: number;
  };
}

export interface AdminMerchantRow {
  merchantId: number;
  storeName: string | null;
  storeEmail: string | null;
  storeDomain: string | null;
  avatar: string | null;
  uninstalledAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  offerCounts: {
    total: number;
    active: number;
  };
}

export interface AdminMerchantDetail extends AdminMerchantRow {
  tokenStatus: 'valid' | 'expiring' | 'expired' | 'missing';
  lastWebhookAt: string | null;
  stats: {
    impressions: number;
    clicks: number;
    addToCart: number;
    conversions: number;
    conversionsAttributed: number;
    revenueGenerated: number;
    revenueAttributed: number;
  };
}

export interface AdminOverview {
  merchants: {
    total: number;
    active: number;
    inactive: number;
    zeroOffersCount: number;
  };
  offers: {
    total: number;
    active: number;
    kindBreakdown: Record<string, number>;
  };
  revenueAttributed: string;
  conversions: number;
  queueHealth: {
    webhooksFailed: number;
    activityFailed: number;
    storefrontFailed: number;
  };
  topMerchants: Array<{
    merchantId: number;
    storeName: string | null;
    conversions: number;
    revenueAttributed: string;
  }>;
  systemHealth: {
    status: 'healthy' | 'degraded';
    errorCount24h: number;
  };
  dailyPerformance: Array<{
    date: string;
    impressions: number;
    conversions: number;
  }>;
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
  conversionsAttributed: number;
  revenueGenerated: number;
  revenueAttributed: number;
}

export const STOREFRONT_EVENTS = [
  'offer.impression',
  'offer.click',
  'offer.add_to_cart',
  'offer.conversion',
] as const;

export type StorefrontEventName = (typeof STOREFRONT_EVENTS)[number];

export type OfferStatField =
  | 'impressions'
  | 'clicks'
  | 'addToCart'
  | 'conversions'
  | 'conversionsAttributed';

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

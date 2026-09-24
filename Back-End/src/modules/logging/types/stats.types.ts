/** Merchant dashboard snapshot — token status, offer counts, live analytics. */
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

/** Single day data point returned by DailyStatsService. */
export interface DailyStatPoint {
  date: string;
  impressions: number;
  clicks: number;
  addToCart: number;
  conversions: number;
}

/** Per-offer cumulative stats snapshot read from Redis read-model. */
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

/** Row returned by AdminStatsService.listMerchants(). */
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

/** Detailed merchant row including token health and cumulative stats. */
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

/** Platform-level overview returned by AdminStatsService.getAdminOverview(). */
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

import { Injectable, Logger } from '@nestjs/common';
import { ActivityService } from '../activity-log/activity/activity.service';
import { CatalogCacheService } from '../conversion-attribution/conversion/catalog-cache.service';
import { OrderConversionService } from '../conversion-attribution/conversion/order-conversion.service';
import { MerchantProfileService } from '../merchants/merchant-profile.service';
import { MerchantsService } from '../merchants/merchants.service';
import {
  SallaAppAuthorizedEvent,
  SallaAppEventBase,
  SallaAppUninstalledEvent,
  SallaOrderWebhookEvent,
} from './types/salla-events';

export function parseUninstalledAt(
  event: SallaAppUninstalledEvent | SallaAppEventBase,
): Date {
  const data = (event as SallaAppUninstalledEvent).data;
  const raw =
    (data && 'uninstallation_date' in data
      ? data.uninstallation_date
      : undefined) ?? event.created_at;
  if (raw) {
    const parsed = new Date(raw.replace(' ', 'T'));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly merchantProfile: MerchantProfileService,
    private readonly orderConversions: OrderConversionService,
    private readonly activityService: ActivityService,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  /**
   * Dispatch an incoming Salla webhook to the matching handler.
   * Unknown events are logged and ignored.
   */
  async processEvent(data: SallaAppEventBase): Promise<void> {
    switch (data.event) {
      case 'app.store.authorize':
        await this.handleAppAuthorized(data as SallaAppAuthorizedEvent);
        break;
      case 'app.installed':
      case 'app.updated':
      case 'app.trial.started':
      case 'app.trial.expired':
      case 'app.trial.canceled':
      case 'app.subscription.started':
      case 'app.subscription.expired':
      case 'app.subscription.canceled':
      case 'app.subscription.renewed':
      case 'app.settings.updated':
        this.logger.log(`Recorded Easy Mode app event: ${data.event}`);
        break;
      case 'app.uninstalled':
        await this.handleAppUninstalled(data as SallaAppUninstalledEvent);
        break;
      case 'product.created':
      case 'product.updated':
      case 'product.deleted':
      case 'category.created':
      case 'category.updated':
      case 'category.deleted':
        // Invalidate both the catalog lookup cache (category → product IDs)
        // and the storefront offers cache so the next order event or widget
        // load gets fresh data.
        await Promise.all([
          this.merchantsService.invalidateCatalogCache(data.merchant),
          this.catalogCache.invalidate(data.merchant),
        ]);
        break;
      case 'order.created':
      case 'order.updated':
        await this.orderConversions.handleOrderEvent(
          data as SallaOrderWebhookEvent,
        );
        break;
      default:
        this.logger.warn(`Unhandled event: ${data.event}`);
    }
  }

  /** Store / refresh the merchant OAuth credentials. */
  private async handleAppAuthorized(
    data: SallaAppAuthorizedEvent,
  ): Promise<void> {
    const { merchant, data: payload } = data;

    await this.merchantsService.upsertAuthorized({
      merchantId: merchant,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: new Date(payload.expires * 1000),
    });

    try {
      await this.merchantProfile.refresh(merchant, payload.access_token);
    } catch (error) {
      this.logger.warn(
        `Store-info sync failed for merchant ${merchant}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      await this.activityService.enqueue({
        actorType: 'system',
        action: 'merchant.profile_sync_failed',
        severity: 'warn',
        merchantId: merchant,
        message: 'Failed to sync Salla store profile',
      });
    }
  }

  /** Deactivate the merchant on uninstall. */
  private async handleAppUninstalled(
    data: SallaAppUninstalledEvent,
  ): Promise<void> {
    await this.merchantsService.deactivate(
      data.merchant,
      parseUninstalledAt(data),
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MerchantsService } from '../merchants/merchants.service';
import {
  SallaAppAuthorizedEvent,
  SallaAppEventBase,
} from './types/salla-events';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly merchantsService: MerchantsService) {}

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
        await this.handleAppUninstalled(data);
        break;
      case 'product.created':
      case 'product.updated':
      case 'product.deleted':
      case 'category.created':
      case 'category.updated':
      case 'category.deleted':
        await this.merchantsService.invalidateCatalogCache(data.merchant);
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
      // Salla sends the expiry as a Unix timestamp in seconds
      expiresAt: new Date(payload.expires * 1000),
    });
  }

  /** Deactivate the merchant on uninstall. */
  private async handleAppUninstalled(data: SallaAppEventBase): Promise<void> {
    await this.merchantsService.deactivate(data.merchant);
  }
}

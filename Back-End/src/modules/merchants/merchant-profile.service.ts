import { Injectable } from '@nestjs/common';
import { ActivityService } from '../activity-log/activity/activity.service';
import { MerchantsService } from './merchants.service';
import { mapStoreInfo } from './merchant-profile.mapper';
import type { SallaStoreInfoResponse } from './types/salla-store-info.types';

const STORE_INFO_URL = 'https://api.salla.dev/admin/v2/store/info';

@Injectable()
export class MerchantProfileService {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly activityService: ActivityService,
  ) {}

  async refresh(merchantId: number, accessToken: string): Promise<void> {
    const response = await fetch(STORE_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Salla store info ${response.status}`);
    }
    const json = (await response.json()) as SallaStoreInfoResponse;
    const fields = mapStoreInfo(json);
    const changedFields = await this.merchantsService.updateProfile(
      merchantId,
      fields,
    );
    if (changedFields.length > 0) {
      await this.activityService.enqueue({
        merchantId,
        actorType: 'salla',
        action: 'merchant.profile_updated',
        entityType: 'merchant',
        entityId: merchantId,
        metadata: { fields: changedFields },
      });
    }
  }
}

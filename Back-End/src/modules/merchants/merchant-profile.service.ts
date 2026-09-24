import { Injectable } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { mapStoreInfo } from './merchant-profile.mapper';
import type { SallaStoreInfoResponse } from './types/salla-store-info.types';

const STORE_INFO_URL = 'https://api.salla.dev/admin/v2/store/info';

@Injectable()
export class MerchantProfileService {
  constructor(private readonly merchantsService: MerchantsService) {}

  async refresh(merchantId: number, accessToken: string): Promise<void> {
    const response = await fetch(STORE_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Salla store info ${response.status}`);
    }
    const json = (await response.json()) as SallaStoreInfoResponse;
    await this.merchantsService.updateProfile(merchantId, mapStoreInfo(json));
  }
}

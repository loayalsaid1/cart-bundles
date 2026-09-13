import {
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators';
import { ActivityService } from './activity.service';
import type { ActivitySeverity } from './activity.types';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async list(
    @CurrentUser('merchantId') merchantId: number,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('offerId') offerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.list({
      merchantId,
      action,
      severity,
      offerId: offerId ? Number(offerId) : undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('status')
  async status(@CurrentUser('merchantId') merchantId: number) {
    const snapshot = await this.activityService.getMerchantHealth(merchantId);
    if (!snapshot) {
      throw new NotFoundException('Merchant not found');
    }
    return snapshot;
  }
}

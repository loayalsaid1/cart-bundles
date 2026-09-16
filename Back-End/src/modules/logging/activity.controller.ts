import {
  Controller,
  Get,
  NotFoundException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators';
import { ActivityService } from './activity.service';
import type { ActivitySeverity } from './types/activity.types';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async list(
    @CurrentUser('merchantId') merchantId: number,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('offerId', new ParseIntPipe({ optional: true })) offerId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.activityService.list({
      merchantId,
      action,
      severity,
      offerId,
      limit,
      offset,
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

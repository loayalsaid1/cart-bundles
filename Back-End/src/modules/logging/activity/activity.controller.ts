import {
  Controller,
  Get,
  NotFoundException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators';
import { ActivityService } from './activity.service';
import { DailyStatsService } from '../stats/daily-stats.service';
import { MerchantHealthService } from '../stats/merchant-health.service';
import type {
  ActivityListResponse,
  ActivitySeverity,
} from '../types/activity.types';
import type {
  DailyStatPoint,
  MerchantHealthSnapshot,
} from '../types/stats.types';

@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly merchantHealthService: MerchantHealthService,
    private readonly dailyStatsService: DailyStatsService,
  ) {}

  @Get()
  async list(
    @CurrentUser('merchantId') merchantId: number,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('offerId', new ParseIntPipe({ optional: true })) offerId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ActivityListResponse> {
    return this.activityService.list({
      merchantId,
      action,
      severity,
      offerId,
      limit,
      offset,
      excludeStorefront: true,
    });
  }

  @Get('stats/daily')
  async dailyStats(
    @CurrentUser('merchantId') merchantId: number,
  ): Promise<DailyStatPoint[]> {
    return this.dailyStatsService.getLast30Days(merchantId);
  }

  @Get('status')
  async status(
    @CurrentUser('merchantId') merchantId: number,
  ): Promise<MerchantHealthSnapshot> {
    const snapshot =
      await this.merchantHealthService.getMerchantHealth(merchantId);
    if (!snapshot) {
      throw new NotFoundException('Merchant not found');
    }
    return snapshot;
  }
}

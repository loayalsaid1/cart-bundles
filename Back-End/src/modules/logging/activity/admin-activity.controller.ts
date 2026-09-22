import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { ActivityService } from './activity.service';
import { AdminStatsService } from '../stats/admin-stats.service';
import type { ActivitySeverity } from '../types/activity.types';

@Roles([Role.Admin])
@Controller('admin')
export class AdminActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly adminStatsService: AdminStatsService,
  ) {}

  @Get('overview')
  async overview() {
    return this.adminStatsService.getAdminOverview();
  }

  @Get('merchants')
  async merchants() {
    return this.adminStatsService.listMerchants();
  }

  @Get('merchants/:merchantId')
  async merchantDetail(@Param('merchantId', ParseIntPipe) merchantId: number) {
    const detail = await this.adminStatsService.getMerchantDetail(merchantId);
    if (!detail) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }
    return detail;
  }

  @Get('activity')
  async list(
    @Query('merchantId', new ParseIntPipe({ optional: true }))
    merchantId?: number,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.activityService.list({
      merchantId,
      action,
      severity,
      limit,
      offset,
    });
  }
}

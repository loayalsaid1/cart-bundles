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
import type {
  ActivityActorType,
  ActivityListResponse,
  ActivitySeverity,
} from '../types/activity.types';
import type {
  AdminMerchantDetail,
  AdminMerchantRow,
  AdminOverview,
} from '../types/stats.types';

@Roles([Role.Admin])
@Controller('admin')
export class AdminActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly adminStatsService: AdminStatsService,
  ) {}

  @Get('overview')
  async overview(): Promise<AdminOverview> {
    return this.adminStatsService.getAdminOverview();
  }

  @Get('merchants')
  async merchants(): Promise<AdminMerchantRow[]> {
    return this.adminStatsService.listMerchants();
  }

  @Get('merchants/:merchantId')
  async merchantDetail(
    @Param('merchantId', ParseIntPipe) merchantId: number,
  ): Promise<AdminMerchantDetail> {
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
    @Query('actorType') actorType?: ActivityActorType,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('search') search?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ActivityListResponse> {
    return this.activityService.list({
      merchantId,
      actorType,
      action,
      severity,
      search,
      limit,
      offset,
    });
  }
}

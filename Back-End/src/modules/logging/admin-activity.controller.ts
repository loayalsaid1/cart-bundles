import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ActivityService } from './activity.service';
import type { ActivitySeverity } from './activity.types';

@Roles([Role.Admin])
@Controller('admin')
export class AdminActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('overview')
  async overview() {
    return this.activityService.getAdminOverview();
  }

  @Get('activity')
  async list(
    @Query('merchantId') merchantId?: string,
    @Query('action') action?: string,
    @Query('severity') severity?: ActivitySeverity,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.list({
      merchantId: merchantId ? Number(merchantId) : undefined,
      action,
      severity,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }
}

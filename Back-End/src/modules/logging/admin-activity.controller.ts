import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ActivityService } from './activity.service';
import type { ActivitySeverity } from './types/activity.types';

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

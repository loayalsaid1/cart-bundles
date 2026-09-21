import { Injectable } from '@nestjs/common';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { activityLogs } from '../../../database/entities/activity-logs';

export function isWidgetSource(found: boolean): 'widget' | 'inferred' {
  return found ? 'widget' : 'inferred';
}

export interface AttributionInput {
  merchantId: number;
  offerId: number;
  since: Date;
}

@Injectable()
export class ConversionAttributor {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  async hasWidgetSignal(input: AttributionInput): Promise<boolean> {
    const rows = await this.db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.merchantId, input.merchantId),
          eq(activityLogs.offerId, input.offerId),
          eq(activityLogs.actorType, 'storefront'),
          inArray(activityLogs.action, ['offer.click', 'offer.add_to_cart']),
          gte(activityLogs.createdAt, input.since),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }
}

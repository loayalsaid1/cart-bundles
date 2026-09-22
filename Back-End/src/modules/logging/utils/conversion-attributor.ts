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

export interface BatchAttributionInput {
  merchantId: number;
  offerIds: number[];
  since: Date;
}

@Injectable()
export class ConversionAttributor {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  /**
   * Checks whether ANY of the provided offer IDs has a widget signal
   * (click or add_to_cart from the storefront) for this merchant in the given
   * time window.
   *
   * Single DB round-trip regardless of how many offers matched.
   * Returns a Set of offerIds that have at least one widget interaction.
   */
  async batchHasWidgetSignal(
    input: BatchAttributionInput,
  ): Promise<Set<number>> {
    if (input.offerIds.length === 0) return new Set();

    const rows = await this.db
      .select({ offerId: activityLogs.offerId })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.merchantId, input.merchantId),
          inArray(activityLogs.offerId, input.offerIds),
          eq(activityLogs.actorType, 'storefront'),
          inArray(activityLogs.action, ['offer.click', 'offer.add_to_cart']),
          gte(activityLogs.createdAt, input.since),
        ),
      );

    return new Set(
      rows.map((r) => r.offerId).filter((id): id is number => id !== null),
    );
  }

  /**
   * @deprecated Use batchHasWidgetSignal for batch attribution.
   * Kept for any one-off call sites that haven't migrated yet.
   */
  async hasWidgetSignal(input: AttributionInput): Promise<boolean> {
    const set = await this.batchHasWidgetSignal({
      merchantId: input.merchantId,
      offerIds: [input.offerId],
      since: input.since,
    });
    return set.has(input.offerId);
  }
}

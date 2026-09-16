import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  suggestions,
  type SuggestionStatus,
} from '../../database/entities/suggestions';
import { ActivityService } from '../logging/activity.service';

export type { SuggestionStatus };

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly activityService: ActivityService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async create(
    merchantId: number,
    userId: number | undefined,
    input: { title: string; body: string },
  ) {
    const [row] = await this.db
      .insert(suggestions)
      .values({
        merchantId,
        userId: userId ?? null,
        title: input.title.trim(),
        body: input.body.trim(),
      })
      .returning();

    await this.activityService.enqueue({
      merchantId,
      actorType: 'merchant',
      actorId: userId,
      action: 'suggestion.created',
      entityType: 'suggestion',
      entityId: row.id,
      metadata: { title: row.title },
    });

    return row;
  }

  async listForMerchant(merchantId: number) {
    return this.db
      .select()
      .from(suggestions)
      .where(eq(suggestions.merchantId, merchantId))
      .orderBy(desc(suggestions.createdAt));
  }

  async listAll(status?: SuggestionStatus) {
    return this.db
      .select()
      .from(suggestions)
      .where(status ? eq(suggestions.status, status) : undefined)
      .orderBy(desc(suggestions.createdAt))
      .limit(200);
  }

  async updateStatus(id: number, status: SuggestionStatus, adminNote?: string) {
    const [row] = await this.db
      .update(suggestions)
      .set({
        status,
        adminNote: adminNote ?? undefined,
      })
      .where(eq(suggestions.id, id))
      .returning();

    if (row) {
      await this.activityService.enqueue({
        merchantId: row.merchantId,
        actorType: 'admin',
        action: 'suggestion.status_changed',
        entityType: 'suggestion',
        entityId: row.id,
        metadata: { status, adminNote },
      });
    }

    return row ?? null;
  }
}

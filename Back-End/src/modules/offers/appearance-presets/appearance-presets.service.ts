import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { appearancePresets } from '../../../database/schema';
import type { AppearancePreset, ServiceResult } from '../types/offers.types';
import type {
  CreateAppearancePresetDto,
  UpdateAppearancePresetDto,
} from './appearance-preset.dto';

@Injectable()
export class AppearancePresetsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  list(merchantId: number): Promise<AppearancePreset[]> {
    return this.db
      .select()
      .from(appearancePresets)
      .where(eq(appearancePresets.merchantId, merchantId))
      .orderBy(desc(appearancePresets.createdAt));
  }

  async create(
    merchantId: number,
    dto: CreateAppearancePresetDto,
  ): Promise<AppearancePreset> {
    const isFull = dto.kind === 'full';
    const [row] = await this.db
      .insert(appearancePresets)
      .values({
        merchantId,
        name: dto.name.trim(),
        kind: dto.kind,
        colors: dto.colors ?? {},
        borderRadiusPx: isFull ? (dto.borderRadiusPx ?? 12) : null,
        titleAlign: isFull ? (dto.titleAlign ?? 'start') : null,
        showBorder: isFull ? (dto.showBorder ?? true) : null,
        shadow: isFull ? (dto.shadow ?? 'sm') : null,
      })
      .returning();
    return row;
  }

  async delete(
    merchantId: number,
    id: number,
  ): Promise<ServiceResult<void>> {
    const deleted = await this.db
      .delete(appearancePresets)
      .where(
        and(
          eq(appearancePresets.id, id),
          eq(appearancePresets.merchantId, merchantId),
        ),
      )
      .returning({ id: appearancePresets.id });

    if (!deleted.length) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: undefined };
  }

  async update(
    merchantId: number,
    id: number,
    dto: UpdateAppearancePresetDto,
  ): Promise<ServiceResult<AppearancePreset>> {
    const [row] = await this.db
      .update(appearancePresets)
      .set({ name: dto.name?.trim() })
      .where(
        and(
          eq(appearancePresets.id, id),
          eq(appearancePresets.merchantId, merchantId),
        ),
      )
      .returning();

    if (!row) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: row };
  }
}

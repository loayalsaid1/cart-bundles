import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Offer } from '../types/offers.types';
import type { AppearanceShadow, TitleAlign } from '../types/offers.types';
import {
  appearanceShadowEnum,
  titleAlignEnum,
} from '../../../database/schema';
import {
  formatRiyadhDateTime,
  immediateStart,
  parseRiyadhEndOfDay,
} from '../../../common/time/riyadh-date';

export class OfferInfoDto {
  @IsString()
  internalName: string;

  @IsObject()
  title: Record<string, string>;

  @IsObject()
  @IsOptional()
  subtitle?: Record<string, string>;

  @IsISO8601()
  @IsOptional()
  expiryDate?: string;

  @IsBoolean()
  @IsOptional()
  startNow?: boolean;

  @IsISO8601()
  @IsOptional()
  startDate?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function toExpiryDate(value?: string): Date | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return parseRiyadhEndOfDay(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSallaDate(d: Date): string {
  return formatRiyadhDateTime(d);
}

export function formatSallaStartDate(): string {
  return formatRiyadhDateTime(immediateStart(new Date()));
}

export class OfferTargetingDto {
  @IsEnum(['all_products', 'selected_products', 'selected_categories'])
  type: Offer['targetType'];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  ids?: number[];
}

export class OfferAppearanceDto {
  @IsNumber()
  @IsOptional()
  borderRadiusPx?: number;

  @IsObject()
  @IsOptional()
  colors?: Record<string, string>;

  @IsEnum(titleAlignEnum.enumValues)
  @IsOptional()
  titleAlign?: TitleAlign;

  @IsBoolean()
  @IsOptional()
  showBorder?: boolean;

  @IsEnum(appearanceShadowEnum.enumValues)
  @IsOptional()
  shadow?: AppearanceShadow;
}

export class GetStorefrontOffersQueryDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  productId?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === 'string') {
      const parsed = value.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v));
      return parsed.length > 0 ? parsed : undefined;
    }
    return undefined;
  })
  categoryIds?: number[];
}


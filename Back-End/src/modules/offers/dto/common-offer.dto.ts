import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Offer } from '../types/offers.types';
import type { AppearanceShadow, TitleAlign } from '../types/offers.types';
import {
  appearanceShadowEnum,
  titleAlignEnum,
} from '../../../database/schema';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class OfferInfoDto {
  @IsString()
  internalName: string;

  @IsObject()
  title: Record<string, string>;

  @IsObject()
  @IsOptional()
  subtitle?: Record<string, string>;

  @Matches(CALENDAR_DATE_PATTERN, { message: 'expiryDate must be YYYY-MM-DD' })
  @IsOptional()
  expiryDate?: string;

  @IsBoolean()
  @IsOptional()
  startNow?: boolean;

  @Matches(CALENDAR_DATE_PATTERN, { message: 'startDate must be YYYY-MM-DD' })
  @IsOptional()
  startDate?: string;
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


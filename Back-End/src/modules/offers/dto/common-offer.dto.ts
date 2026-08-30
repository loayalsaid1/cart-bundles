import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Offer } from '../types/offers.types';

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
}

export function toExpiryDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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


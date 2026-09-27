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

export function formatSallaDate(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(d).map((p) => [p.type, p.value]),
  );

  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

export function formatSallaStartDate(): string {
  return formatSallaDate(new Date(Date.now() + 90000));
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

  @IsEnum(['start', 'center', 'end'])
  @IsOptional()
  titleAlign?: 'start' | 'center' | 'end';

  @IsBoolean()
  @IsOptional()
  showBorder?: boolean;

  @IsEnum(['none', 'sm', 'md', 'lg'])
  @IsOptional()
  shadow?: 'none' | 'sm' | 'md' | 'lg';
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


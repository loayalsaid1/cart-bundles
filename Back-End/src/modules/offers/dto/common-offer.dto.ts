import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
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
  expiryDate: string;
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

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { QuantityOfferTier } from '../types/offers.types';
import {
  OfferInfoDto,
  OfferTargetingDto,
  OfferAppearanceDto,
} from '../dto/common-offer.dto';

export class TierDto {
  @IsNumber()
  quantity: number;

  @IsObject()
  mainTitle: Record<string, string>;

  @IsObject()
  @IsOptional()
  subtitle?: Record<string, string>;

  @IsEnum(['percentage', 'fixed'])
  pricingType: QuantityOfferTier['pricingType'];

  @IsNumber()
  discountAmount: number;

  @IsBoolean()
  @IsOptional()
  isSelectedByDefault?: boolean;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsOptional()
  labelText?: string;
}

export class QuantityOfferSettingsDto {
  @IsBoolean()
  @IsOptional()
  redirectToCartAfterAdd?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSallaPopup?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDifferentOptionsPerPiece?: boolean;

  @IsBoolean()
  @IsOptional()
  hideThemeDefaultOptions?: boolean;

  @IsBoolean()
  @IsOptional()
  showPricePerPiece?: boolean;

  @IsBoolean()
  @IsOptional()
  roundPriceToNearestInteger?: boolean;

  @IsBoolean()
  @IsOptional()
  applyEvenWithCoupon?: boolean;

  @IsBoolean()
  @IsOptional()
  hideQuantityField?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierDto)
  tiers: TierDto[];
}

export class CreateQuantityOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  @IsDefined()
  info: OfferInfoDto;

  @ValidateNested()
  @Type(() => OfferTargetingDto)
  @IsDefined()
  targeting: OfferTargetingDto;

  @ValidateNested()
  @Type(() => QuantityOfferSettingsDto)
  @IsDefined()
  settings: QuantityOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateQuantityOfferDto extends CreateQuantityOfferDto {}

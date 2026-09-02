import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RelatedProductDto } from '../addon/addon-offer.dto';
import { QuantityOfferTier } from '../types/offers.types';
import {
  OfferInfoDto,
  OfferTargetingDto,
  OfferAppearanceDto,
} from '../dto/common-offer.dto';

export class BundleOfferSettingsDto {
  @IsBoolean()
  @IsOptional()
  redirectToCartAfterAdd?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSallaPopup?: boolean;

  @IsEnum(['percentage', 'fixed'])
  @IsOptional()
  discountType?: QuantityOfferTier['pricingType'];

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedProductDto)
  relatedProducts: RelatedProductDto[];
}

export class CreateBundleOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  info: OfferInfoDto;

  @ValidateNested()
  @Type(() => OfferTargetingDto)
  targeting: OfferTargetingDto;

  @ValidateNested()
  @Type(() => BundleOfferSettingsDto)
  settings: BundleOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateBundleOfferDto extends CreateBundleOfferDto {}

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RelatedProductDto } from '../addon/addon-offer.dto';
import { type BundleDiscountType } from '../types/offers.types';
import { OfferInfoDto, OfferAppearanceDto } from '../dto/common-offer.dto';

export class BundleOfferSettingsDto {
  @IsBoolean()
  @IsOptional()
  redirectToCartAfterAdd?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSallaPopup?: boolean;

  @IsEnum(['percentage', 'free-product'])
  @IsOptional()
  discountType?: BundleDiscountType;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedProductDto)
  relatedProducts: RelatedProductDto[];
}

export class BundleOfferTargetingDto {
  @IsEnum(['selected_products'])
  type: 'selected_products';

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  ids: number[];
}

export class CreateBundleOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  info: OfferInfoDto;

  @ValidateNested()
  @Type(() => BundleOfferTargetingDto)
  targeting: BundleOfferTargetingDto;

  @ValidateNested()
  @Type(() => BundleOfferSettingsDto)
  settings: BundleOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateBundleOfferDto extends CreateBundleOfferDto {}

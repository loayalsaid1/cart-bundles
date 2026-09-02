import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { type AddonDiscountType, AddonOfferSettings } from '../types/offers.types';
import {
  OfferInfoDto,
  OfferTargetingDto,
  OfferAppearanceDto,
} from '../dto/common-offer.dto';

export class RelatedProductDto {
  @IsNumber()
  sallaProductId: number;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  isPreselected?: boolean;
}

export class AddonOfferSettingsDto {
  @IsBoolean()
  @IsOptional()
  redirectToCartAfterAdd?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSallaPopup?: boolean;

  @IsNumber()
  @IsOptional()
  maxItems?: number;

  @IsBoolean()
  @IsOptional()
  productsPreselectedByDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  showProductOptions?: boolean;

  @IsEnum(['vertical', 'horizontal'])
  @IsOptional()
  displayOrientation?: AddonOfferSettings['displayOrientation'];

  @IsEnum(['percentage', 'free-product'])
  @IsOptional()
  discountType?: AddonDiscountType;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsString()
  @IsOptional()
  positionDesktop?: string;

  @IsString()
  @IsOptional()
  positionMobile?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedProductDto)
  relatedProducts: RelatedProductDto[];
}

export class AddonOfferTargetingDto {
  @IsEnum(['selected_products', 'selected_categories'])
  type: 'selected_products' | 'selected_categories';

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  ids?: number[];
}

export class CreateAddonOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  info: OfferInfoDto;

  @ValidateNested()
  @Type(() => AddonOfferTargetingDto)
  targeting: AddonOfferTargetingDto;

  @ValidateNested()
  @Type(() => AddonOfferSettingsDto)
  settings: AddonOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateAddonOfferDto extends CreateAddonOfferDto { }

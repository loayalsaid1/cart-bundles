import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RelatedProductDto } from '../addon/addon-offer.dto';
import { RecommendationOfferSettings } from '../types/offers.types';
import {
  OfferInfoDto,
  OfferTargetingDto,
  OfferAppearanceDto,
} from '../dto/common-offer.dto';

export class RecommendationOfferSettingsDto {
  @IsEnum(['cart_related', 'general'])
  mode: RecommendationOfferSettings['mode'];

  @IsNumber()
  @IsOptional()
  triggerSallaProductId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedProductDto)
  relatedProducts: RelatedProductDto[];
}

export class CreateRecommendationOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  info: OfferInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferTargetingDto)
  targeting?: OfferTargetingDto;

  @ValidateNested()
  @Type(() => RecommendationOfferSettingsDto)
  settings: RecommendationOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateRecommendationOfferDto extends CreateRecommendationOfferDto {}

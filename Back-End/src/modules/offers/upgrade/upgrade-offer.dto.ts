import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  OfferInfoDto,
  OfferTargetingDto,
  OfferAppearanceDto,
} from '../dto/common-offer.dto';

export class UpgradeOfferSettingsDto {
  @IsBoolean()
  @IsOptional()
  redirectToCartAfterAdd?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSallaPopup?: boolean;

  @IsNumber()
  baseSallaProductId: number;

  @IsNumber()
  upgradeSallaProductId: number;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsNumber()
  @IsOptional()
  sallaCouponId?: number;
}

export class CreateUpgradeOfferDto {
  @ValidateNested()
  @Type(() => OfferInfoDto)
  info: OfferInfoDto;

  @ValidateNested()
  @Type(() => OfferTargetingDto)
  targeting: OfferTargetingDto;

  @ValidateNested()
  @Type(() => UpgradeOfferSettingsDto)
  settings: UpgradeOfferSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferAppearanceDto)
  appearance?: OfferAppearanceDto;
}

export class UpdateUpgradeOfferDto extends CreateUpgradeOfferDto {}

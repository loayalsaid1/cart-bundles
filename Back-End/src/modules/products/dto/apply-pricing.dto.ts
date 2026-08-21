import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import type { DiscountType, PricingAction } from '../product.types';

export class ApplyPricingDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds!: number[];

  @IsIn(['set_sale', 'remove_sale'])
  action!: PricingAction;

  @IsIn(['percentage', 'fixed'])
  discountType?: DiscountType;

  @ValidateIf(
    (dto: ApplyPricingDto) =>
      dto.action === 'set_sale' &&
      dto.discountType === 'percentage' &&
      (dto?.amount ?? 0) > 100,
  )
  @IsNumber()
  @IsPositive()
  amount?: number;
}

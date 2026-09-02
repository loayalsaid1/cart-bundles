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

  @ValidateIf((dto: ApplyPricingDto) => dto.action === 'set_sale')
  @IsIn(['percentage', 'fixed'])
  discountType?: DiscountType;

  @ValidateIf((dto: ApplyPricingDto) => dto.action === 'set_sale')
  @IsNumber()
  @IsPositive()
  amount?: number;
}

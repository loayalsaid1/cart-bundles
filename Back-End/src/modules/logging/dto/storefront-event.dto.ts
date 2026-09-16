import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import {
  STOREFRONT_EVENTS,
  type StorefrontEventName,
} from '../types/activity.types';

export class StorefrontEventDto {
  @IsInt()
  merchantId: number;

  @IsInt()
  offerId: number;

  @IsIn(STOREFRONT_EVENTS)
  event: StorefrontEventName;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

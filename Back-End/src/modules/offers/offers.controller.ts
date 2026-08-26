import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CurrentUser, IsPublic } from '../../common/decorators';
import { FullOffer } from './types/offers.types';

@Controller('offers')
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @IsPublic()
  @Get('storefront/:merchantId')
  async getStorefrontOffers(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query('productId', new ParseIntPipe({ optional: true })) productId?: number,
  ): Promise<FullOffer[]> {
    return this.service.getActiveStorefrontOffers(merchantId, productId);
  }

  @Get()
  async findAllForMerchant(@CurrentUser('merchantId') merchantId: number): Promise<FullOffer[]> {
    return this.service.findAllForMerchant(merchantId);
  }

  @Patch(':offerId/status')
  async toggleStatus(
    @CurrentUser('merchantId') merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body('status') status: 'active' | 'paused' | 'draft',
  ): Promise<FullOffer> {
    const result = await this.service.toggleStatus(merchantId, offerId, status);
    if (!result.success) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }
    return result.data;
  }
}

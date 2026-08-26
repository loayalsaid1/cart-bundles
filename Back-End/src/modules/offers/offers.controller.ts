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
import { IsPublic } from '../../common/decorators/is-public.decorator';
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

  @Get(':merchantId')
  async findAllForMerchant(@Param('merchantId', ParseIntPipe) merchantId: number): Promise<FullOffer[]> {
    return this.service.findAllForMerchant(merchantId);
  }

  @Patch(':merchantId/:offerId/status')
  async toggleStatus(
    @Param('merchantId', ParseIntPipe) merchantId: number,
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

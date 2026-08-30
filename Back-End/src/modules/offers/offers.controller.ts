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
import { DashboardOfferShort, FullOffer, Offer, OfferKind, OfferStatus } from './types/offers.types';
import { GetStorefrontOffersQueryDto } from './dto/common-offer.dto';

@Controller('offers')
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @IsPublic()
  @Get('storefront/:merchantId')
  async getStorefrontOffers(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query() query: GetStorefrontOffersQueryDto,
  ): Promise<FullOffer[]> {
    return this.service.getActiveStorefrontOffers(
      merchantId,
      query.productId,
      query.categoryIds,
    );
  }

  @Get('dashboard')
  async getDashboard(
    @CurrentUser('merchantId') merchantId: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('productId', new ParseIntPipe({ optional: true })) productId?: number,
  ): Promise<DashboardOfferShort[]> {
    return this.service.getDashboardOffers(merchantId, {
      search,
      type: type as OfferKind,
      status: status as OfferStatus,
      productId,
    });
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
  ): Promise<Pick<Offer, 'id' | 'status'>> {
    const result = await this.service.toggleStatus(merchantId, offerId, status);
    if (!result.success) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }
    return result.data;
  }
}

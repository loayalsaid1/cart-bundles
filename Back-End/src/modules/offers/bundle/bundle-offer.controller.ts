import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { BundleOfferService } from './bundle-offer.service';
import { CreateBundleOfferDto, UpdateBundleOfferDto } from './bundle-offer.dto';
import { BundleOfferFull } from '../types/offers.types';

@Controller('offers/bundle')
export class BundleOfferController {
  constructor(private readonly service: BundleOfferService) {}

  @Get(':merchantId')
  async list(@Param('merchantId', ParseIntPipe) merchantId: number): Promise<BundleOfferFull[]> {
    return this.service.list(merchantId);
  }

  @Get(':merchantId/:offerId')
  async findOne(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<BundleOfferFull> {
    const result = await this.service.findOne(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Bundle offer ${offerId} not found`);
    }
    return result.data;
  }

  @Post(':merchantId')
  async create(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Body() dto: CreateBundleOfferDto,
  ): Promise<BundleOfferFull> {
    const result = await this.service.create(merchantId, dto);
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Failed to create bundle offer');
    }
    return result.data;
  }

  @Put(':merchantId/:offerId')
  async update(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: UpdateBundleOfferDto,
  ): Promise<BundleOfferFull> {
    const result = await this.service.update(merchantId, offerId, dto);
    if (!result.success) {
      if (result.reason === 'not_found') {
        throw new NotFoundException(`Bundle offer ${offerId} not found`);
      }
      throw new BadRequestException(result.error ?? 'Failed to update bundle offer');
    }
    return result.data;
  }

  @Delete(':merchantId/:offerId')
  async remove(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<{ success: boolean }> {
    const result = await this.service.delete(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Bundle offer ${offerId} not found`);
    }
    return { success: true };
  }
}

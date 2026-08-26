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
import { AddonOfferService } from './addon-offer.service';
import { CreateAddonOfferDto, UpdateAddonOfferDto } from './addon-offer.dto';
import { AddonOfferFull } from '../types/offers.types';

@Controller('offers/addon')
export class AddonOfferController {
  constructor(private readonly service: AddonOfferService) {}

  @Get(':merchantId')
  async list(@Param('merchantId', ParseIntPipe) merchantId: number): Promise<AddonOfferFull[]> {
    return this.service.list(merchantId);
  }

  @Get(':merchantId/:offerId')
  async findOne(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<AddonOfferFull> {
    const result = await this.service.findOne(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Addon offer ${offerId} not found`);
    }
    return result.data;
  }

  @Post(':merchantId')
  async create(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Body() dto: CreateAddonOfferDto,
  ): Promise<AddonOfferFull> {
    const result = await this.service.create(merchantId, dto);
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Failed to create addon offer');
    }
    return result.data;
  }

  @Put(':merchantId/:offerId')
  async update(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: UpdateAddonOfferDto,
  ): Promise<AddonOfferFull> {
    const result = await this.service.update(merchantId, offerId, dto);
    if (!result.success) {
      if (result.reason === 'not_found') {
        throw new NotFoundException(`Addon offer ${offerId} not found`);
      }
      throw new BadRequestException(result.error ?? 'Failed to update addon offer');
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
      throw new NotFoundException(`Addon offer ${offerId} not found`);
    }
    return { success: true };
  }
}

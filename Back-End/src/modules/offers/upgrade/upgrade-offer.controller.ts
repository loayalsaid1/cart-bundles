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
import { UpgradeOfferService } from './upgrade-offer.service';
import { CreateUpgradeOfferDto, UpdateUpgradeOfferDto } from './upgrade-offer.dto';
import { UpgradeOfferFull } from '../types/offers.types';

@Controller('offers/upgrade')
export class UpgradeOfferController {
  constructor(private readonly service: UpgradeOfferService) {}

  @Get(':merchantId')
  async list(@Param('merchantId', ParseIntPipe) merchantId: number): Promise<UpgradeOfferFull[]> {
    return this.service.list(merchantId);
  }

  @Get(':merchantId/:offerId')
  async findOne(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<UpgradeOfferFull> {
    const result = await this.service.findOne(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Upgrade offer ${offerId} not found`);
    }
    return result.data;
  }

  @Post(':merchantId')
  async create(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Body() dto: CreateUpgradeOfferDto,
  ): Promise<UpgradeOfferFull> {
    const result = await this.service.create(merchantId, dto);
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Failed to create upgrade offer');
    }
    return result.data;
  }

  @Put(':merchantId/:offerId')
  async update(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: UpdateUpgradeOfferDto,
  ): Promise<UpgradeOfferFull> {
    const result = await this.service.update(merchantId, offerId, dto);
    if (!result.success) {
      if (result.reason === 'not_found') {
        throw new NotFoundException(`Upgrade offer ${offerId} not found`);
      }
      throw new BadRequestException(result.error ?? 'Failed to update upgrade offer');
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
      throw new NotFoundException(`Upgrade offer ${offerId} not found`);
    }
    return { success: true };
  }
}

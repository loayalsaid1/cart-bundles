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
import { QuantityOfferService } from './quantity-offer.service';
import { CreateQuantityOfferDto, UpdateQuantityOfferDto } from './quantity-offer.dto';
import { QuantityOfferFull } from '../types/offers.types';

@Controller('offers/quantity')
export class QuantityOfferController {
  constructor(private readonly service: QuantityOfferService) {}

  @Get(':merchantId')
  async list(@Param('merchantId', ParseIntPipe) merchantId: number): Promise<QuantityOfferFull[]> {
    return this.service.list(merchantId);
  }

  @Get(':merchantId/:offerId')
  async findOne(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<QuantityOfferFull> {
    const result = await this.service.findOne(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Quantity offer ${offerId} not found`);
    }
    return result.data;
  }

  @Post(':merchantId')
  async create(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Body() dto: CreateQuantityOfferDto,
  ): Promise<QuantityOfferFull> {
    const result = await this.service.create(merchantId, dto);
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Failed to create quantity offer');
    }
    return result.data;
  }

  @Put(':merchantId/:offerId')
  async update(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: UpdateQuantityOfferDto,
  ): Promise<QuantityOfferFull> {
    const result = await this.service.update(merchantId, offerId, dto);
    if (!result.success) {
      if (result.reason === 'not_found') {
        throw new NotFoundException(`Quantity offer ${offerId} not found`);
      }
      throw new BadRequestException(result.error ?? 'Failed to update quantity offer');
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
      throw new NotFoundException(`Quantity offer ${offerId} not found`);
    }
    return { success: true };
  }
}

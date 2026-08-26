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
import { RecommendationOfferService } from './recommendation-offer.service';
import { CreateRecommendationOfferDto, UpdateRecommendationOfferDto } from './recommendation-offer.dto';
import { RecommendationOfferFull } from '../types/offers.types';
import { CurrentUser } from '../../../common/decorators';

@Controller('offers/recommendation')
export class RecommendationOfferController {
  constructor(private readonly service: RecommendationOfferService) {}

  @Get()
  async list(@CurrentUser('merchantId') merchantId: number): Promise<RecommendationOfferFull[]> {
    return this.service.list(merchantId);
  }

  @Get(':offerId')
  async findOne(
    @CurrentUser('merchantId') merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<RecommendationOfferFull> {
    const result = await this.service.findOne(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Recommendation offer ${offerId} not found`);
    }
    return result.data;
  }

  @Post()
  async create(
    @CurrentUser('merchantId') merchantId: number,
    @Body() dto: CreateRecommendationOfferDto,
  ): Promise<RecommendationOfferFull> {
    const result = await this.service.create(merchantId, dto);
    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Failed to create recommendation offer');
    }
    return result.data;
  }

  @Put(':offerId')
  async update(
    @CurrentUser('merchantId') merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: UpdateRecommendationOfferDto,
  ): Promise<RecommendationOfferFull> {
    const result = await this.service.update(merchantId, offerId, dto);
    if (!result.success) {
      if (result.reason === 'not_found') {
        throw new NotFoundException(`Recommendation offer ${offerId} not found`);
      }
      throw new BadRequestException(result.error ?? 'Failed to update recommendation offer');
    }
    return result.data;
  }

  @Delete(':offerId')
  async remove(
    @CurrentUser('merchantId') merchantId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
  ): Promise<{ success: boolean }> {
    const result = await this.service.delete(merchantId, offerId);
    if (!result.success) {
      throw new NotFoundException(`Recommendation offer ${offerId} not found`);
    }
    return { success: true };
  }
}

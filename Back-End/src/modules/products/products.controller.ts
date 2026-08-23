import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser, IsPublic } from '../../common/decorators';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { MerchantsService } from '../merchants/merchants.service';
import { ApplyPricingDto } from './dto';
import { ProductsService } from './products.service';
import { ApplyPricingResult, Product } from './product.types';


@Controller('salla')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly merchantsService: MerchantsService,
  ) { }

  @Get("embed/products")
  async list(
    @CurrentUser() user: EmbedContext,
    @Query('query') query?: string,
  ): Promise<Product[]> {
    const accessToken = await this.getOrThrowValidAccessToken(user.merchantId);
    return this.productsService.getProducts(accessToken, query);
  }

  @Post('embed/products/discount')
  async applyDiscount(
    @CurrentUser() user: EmbedContext,
    @Body() dto: ApplyPricingDto,
  ): Promise<ApplyPricingResult> {
    const accessToken = await this.getOrThrowValidAccessToken(user.merchantId);
    const result = await this.productsService.applyBulkPricing(
      accessToken,
      dto,
    );

    if (!result.success) {
      throw new NotFoundException(result.error);
    }

    return result;
  }

  /**
   * Returns sale products for the given store to surface as recommendations.
   * `productId` is part of the storefront contract but is currently unused.
   */
  @IsPublic()
  @Get('products/recommendations')
  async recommendations(
    @Query('storeId') storeId?: string,
    @Query('store_id') store_id?: string,
  ): Promise<Product[]> {
    const rawStoreId = storeId ?? store_id;
    if (!rawStoreId) {
      throw new NotFoundException('Missing storeId parameter');
    }

    const accessToken = await this.getOrThrowValidAccessToken(
      Number(rawStoreId),
    );
    return this.productsService.getRecommendedProducts(accessToken);
  }


  private async getOrThrowValidAccessToken(merchantId: number): Promise<string> {
    const tokenResult = await this.merchantsService.getValidAccessToken(merchantId);

    if (tokenResult.success) {
      return tokenResult.accessToken;
    }

    if (tokenResult.reason === 'not_found') {
      throw new NotFoundException('Merchant not found');
    }
    if (tokenResult.reason === 'reauth_required') {
      throw new UnauthorizedException('Reauthentication required');
    }

    // refresh_failed - transient error, safe to retry later
    throw new InternalServerErrorException('Failed to refresh merchant token');
  }
}

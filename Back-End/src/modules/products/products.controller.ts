import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, IsPublic } from '../../common/decorators';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { MerchantsService } from '../merchants/merchants.service';
import { ApplyPricingDto } from './dto';
import { ProductsService } from './products.service';
import { ApplyPricingResult, Product } from './product.types';

/**
 * Authenticated endpoints used by the Salla embedded app.
 */
@Controller('v1/salla/embed/products')
export class EmbedProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: EmbedContext,
    @Query('query') query?: string,
  ): Promise<Product[]> {
    const accessToken = await this.getValidToken(user.merchantId);
    return this.productsService.getProducts(accessToken, query);
  }

  @Post('discount')
  async applyDiscount(
    @CurrentUser() user: EmbedContext,
    @Body() dto: ApplyPricingDto,
  ): Promise<ApplyPricingResult> {
    const accessToken = await this.getValidToken(user.merchantId);
    const result = await this.productsService.applyBulkPricing(
      accessToken,
      dto,
    );

    if (!result.success) {
      throw new NotFoundException(result.error);
    }

    return result;
  }

  private async getValidToken(merchantId: number): Promise<string> {
    const accessToken =
      await this.merchantsService.getValidAccessToken(merchantId);
    if (!accessToken) {
      throw new NotFoundException(
        'Merchant access token is missing or expired',
      );
    }
    return accessToken;
  }
}

/**
 * Public endpoints callable from the Salla storefront (CORS-enabled).
 */
@IsPublic()
@Controller('v1/salla/products')
export class PublicProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  /**
   * Returns sale products for the given store to surface as recommendations.
   * `productId` is part of the storefront contract but is currently unused.
   */
  @Get('recommendations')
  async recommendations(
    @Query('storeId') storeId?: string,
    @Query('store_id') store_id?: string,
  ): Promise<Product[]> {
    const rawStoreId = storeId ?? store_id;
    if (!rawStoreId) {
      throw new NotFoundException('Missing storeId parameter');
    }

    const accessToken = await this.merchantsService.getValidAccessToken(
      Number(rawStoreId),
    );
    if (!accessToken) {
      throw new NotFoundException('Merchant not found');
    }

    return this.productsService.getRecommendedProducts(accessToken);
  }
}

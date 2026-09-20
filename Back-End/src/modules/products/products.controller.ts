import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CurrentUser,
  IsPublic,
  requireMerchantId,
} from '../../common/decorators';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { MerchantsService } from '../merchants/merchants.service';
import { ApplyPricingDto } from './dto';
import { ProductsService } from './products.service';
import { ApplyPricingResult, Category, Coupon, Product } from './product.types';

@Controller('salla')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Get('embed/products')
  async list(
    @CurrentUser() user: EmbedContext,
    @Query('query') query?: string,
  ): Promise<Product[]> {
    const merchantId = requireMerchantId(user);
    const accessToken = await this.getOrThrowValidAccessToken(merchantId);
    return this.productsService.getProducts(accessToken, query, merchantId);
  }

  @Get('embed/categories')
  async listCategories(
    @CurrentUser() user: EmbedContext,
    @Query('keyword') keyword?: string,
  ): Promise<Category[]> {
    const merchantId = requireMerchantId(user);
    const accessToken = await this.getOrThrowValidAccessToken(merchantId);
    return this.productsService.getCategories(accessToken, keyword, merchantId);
  }

  @Get('embed/coupons')
  async listCoupons(
    @CurrentUser() user: EmbedContext,
    @Query('keyword') keyword?: string,
  ): Promise<Coupon[]> {
    const merchantId = requireMerchantId(user);
    const accessToken = await this.getOrThrowValidAccessToken(merchantId);
    return this.productsService.getCoupons(accessToken, keyword, merchantId);
  }

  @Post('embed/products/discount')
  async applyDiscount(
    @CurrentUser() user: EmbedContext,
    @Body() dto: ApplyPricingDto,
  ): Promise<ApplyPricingResult> {
    const merchantId = requireMerchantId(user);
    const accessToken = await this.getOrThrowValidAccessToken(merchantId);
    const result = await this.productsService.applyBulkPricing(
      accessToken,
      dto.toPayload(),
    );

    if (!result.success) {
      throw new BadGatewayException(result.error);
    }

    await this.merchantsService.invalidateCatalogCache(merchantId);
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
      throw new BadRequestException('Missing storeId parameter');
    }

    const merchantId = Number(rawStoreId);
    const accessToken = await this.getOrThrowValidAccessToken(merchantId);
    return this.productsService.getRecommendedProducts(accessToken, merchantId);
  }

  private async getOrThrowValidAccessToken(
    merchantId: number,
  ): Promise<string> {
    const tokenResult =
      await this.merchantsService.getValidAccessToken(merchantId);

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

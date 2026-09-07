import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  ApplyPricingPayload,
  ApplyPricingResult,
  Category,
  Coupon,
  Product,
} from './product.types';

const SALLA_API_BASE_URL = 'https://api.salla.dev/admin/v2';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  /**
   * Fetch products for a merchant, with optional keyword search.
   */
  async getProducts(accessToken: string, keyword?: string): Promise<Product[]> {
    const queryParam = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    const url = `${SALLA_API_BASE_URL}/products${queryParam}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Salla API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as { data?: Product[] };
    return json.data ?? [];
  }

  async getCategories(
    accessToken: string,
    keyword?: string,
  ): Promise<Category[]> {
    const queryParam = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    const url = `${SALLA_API_BASE_URL}/categories${queryParam}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Salla API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as { data?: Category[] };
    // Apparently the category response is a gigantic object, so I'm taking only what I need
    const returnValue: Category[] = (json.data ?? []).map((category) => ({
      id: category.id,
      image: category.image,
      parent_id: category.parent_id,
      status: category.status,
      name: category.name,
    }));

    return returnValue;
  }

  async getCoupons(accessToken: string, keyword?: string): Promise<Coupon[]> {
    const queryParam = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    const url = `${SALLA_API_BASE_URL}/coupons${queryParam}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Salla API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      data?: Array<{
        id: number;
        code?: string;
        type?: string;
        amount?: {
          amount: number;
          currency: string;
        };
        status?: string;
      }>;
    };

    return (json.data ?? [])
      .filter((coupon) => coupon.code)
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.code as string,
        type: coupon.type,
        amount: coupon.amount,
        status: coupon.status,
      }));
  }

  /**
   * Fetch sale products to use as "recommendations" for a storefront.
   */
  async getRecommendedProducts(accessToken: string): Promise<Product[]> {
    const url = `${SALLA_API_BASE_URL}/products?status=sale`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new BadRequestException(
        `Salla API error: ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as { data?: Product[] };
    return json.data ?? [];
  }

  /**
   * Bulk-apply or remove a sale price via Salla's /products/actions endpoint.
   *
   * set_sale  — writes the calculated sale_price onto each product
   * remove_sale — zeroes out sale_price (restores standard price)
   */
  async applyBulkPricing(
    accessToken: string,
    payload: ApplyPricingPayload,
  ): Promise<ApplyPricingResult> {
    const { productIds, action, discountType, amount } = payload;

    try {
      if (action === 'set_sale') {
        this.assertValidDiscount(discountType, amount);
      }

      // Dynamically build the value object based on the action
      const sallaValue =
        action === 'remove_sale'
          ? {
              column: 'sale_price',
              formula: 'amount', // Salla treats 0 as "no sale"
              amount: 0,
              apply_on: 'product',
            }
          : {
              column: 'sale_price',
              formula:
                discountType === 'percentage'
                  ? 'price - (price * amount / 100)'
                  : 'price - amount',
              amount: amount ?? 0,
              apply_on: 'product',
            };

      const sallaPayload = {
        filters: { ids: productIds },
        operations: [{ action_name: 'pricing', value: sallaValue }],
      };

      this.logger.debug(
        `applyBulkPricing (${action}) → ${JSON.stringify(sallaPayload)}`,
      );

      const response = await fetch(`${SALLA_API_BASE_URL}/products/actions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sallaPayload),
      });

      const data = (await response.json()) as {
        success?: boolean;
        data?: unknown;
        error?: { message?: string };
      };

      if (!response.ok || !data.success) {
        this.logger.error(
          `applyBulkPricing (${action}) failed: ${JSON.stringify(data)}`,
        );
        return {
          success: false,
          error: data.error?.message || 'Salla API Error',
        };
      }

      return { success: true, data: data.data };
    } catch (error) {
      this.logger.error('applyBulkPricing threw', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to apply pricing',
      };
    }
  }

  private assertValidDiscount(
    discountType: 'percentage' | 'fixed' | undefined,
    amount: number | undefined,
  ): void {
    if (!discountType) {
      throw new BadRequestException(
        "discountType must be 'percentage' or 'fixed'",
      );
    }
    if (amount === undefined || amount <= 0) {
      throw new BadRequestException(
        'A valid positive discount amount is required',
      );
    }
    if (discountType === 'percentage' && amount > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }
  }
}

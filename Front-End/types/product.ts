export interface ProductPrice {
  amount: number;
  currency?: string;
}

export interface Product {
  id: number;
  name: string;
  sku?: string;
  thumbnail?: string | null;

  price: ProductPrice;
  regular_price?: ProductPrice;
  sale_price?: ProductPrice;

  quantity?: number | string;
  unlimited_quantity?: boolean;

  status?: string;
  is_available?: boolean;
  has_special_price?: boolean;

  type?: string;

  urls?: {
    customer?: string;
    admin?: string;
  };

  updated_at?: string;
}

export interface ApplyPricingPayload {
  productIds: number[];
  /** set_sale — apply a percentage or fixed sale price. remove_sale — zero out sale_price. */
  action: 'set_sale' | 'remove_sale';
  discountType?: 'percentage' | 'fixed';
  amount?: number;
}

export interface ApplyPricingResponse {
  success: boolean;
  data?: any;
  error?: string;
}

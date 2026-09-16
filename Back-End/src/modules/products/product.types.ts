export interface ProductPrice {
  amount: number;
  currency: string;
}

export interface Category {
  id: number;
  name: string;
  image: string;
  status: string;
  parent_id: number | null;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  thumbnail: string | null;

  price: ProductPrice;
  regular_price?: ProductPrice;
  sale_price: ProductPrice;

  quantity: number | string;
  unlimited_quantity: boolean;

  status: string;
  is_available: boolean;
  has_special_price: boolean;

  type: string;

  urls: {
    customer: string;
    admin: string;
  };

  updated_at: string;
}

export type DiscountType = 'percentage' | 'fixed';
export type PricingAction = 'set_sale' | 'remove_sale';

export interface SetSalePayload {
  productIds: number[];
  action: 'set_sale';
  discountType: DiscountType;
  amount: number;
}

export interface RemoveSalePayload {
  productIds: number[];
  action: 'remove_sale';
}

/** `set_sale` requires a discount; `remove_sale` must not carry one. */
export type ApplyPricingPayload = SetSalePayload | RemoveSalePayload;

export interface ApplyPricingResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Coupon {
  id: number;
  code: string;
  type?: string;
  amount?: {
    amount: number;
    currency: string;
  };
  status?: string;
}

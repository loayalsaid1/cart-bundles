import type { OfferKind } from "@/lib/schemas/common-offer";

export interface OfferKindMeta {
  labelKey: string;
  icon: string;
  accent: string;
}

export const OFFER_KIND_META: Record<OfferKind, OfferKindMeta> = {
  quantity_discount: { labelKey: "quantity_discount", icon: "SaleTag01Icon", accent: "text-chart-1" },
  product_add_on: { labelKey: "product_add_on", icon: "PackageAdd01Icon", accent: "text-chart-2" },
  bundle: { labelKey: "bundle", icon: "GiftIcon", accent: "text-chart-3" },
  upgrade_offer: { labelKey: "upgrade_offer", icon: "Rocket01Icon", accent: "text-chart-4" },
  cart_recommendation: { labelKey: "cart_recommendation", icon: "ShoppingCart01Icon", accent: "text-chart-5" },
};

export const KIND_LABEL_KEYS = {
  quantity_discount: "kind.quantity_discount",
  product_add_on: "kind.product_add_on",
  bundle: "kind.bundle",
  upgrade_offer: "kind.upgrade_offer",
  cart_recommendation: "kind.cart_recommendation",
} as const;

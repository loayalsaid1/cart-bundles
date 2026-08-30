"use client";

import type { OfferKind } from "@/lib/schemas/common-offer";
import { QuantityOfferBuilder } from "@/components/offers/builder/quantity-offer-builder";
import { AddonOfferBuilder } from "@/components/offers/builder/addon-offer-builder";
import { BundleOfferBuilder } from "@/components/offers/builder/bundle-offer-builder";
import { UpgradeOfferBuilder } from "@/components/offers/builder/upgrade-offer-builder";
import { RecommendationOfferBuilder } from "@/components/offers/builder/recommendation-offer-builder";

export function OfferBuilderByType({
  kind,
  offerId,
}: {
  kind: OfferKind;
  offerId?: number;
}) {
  switch (kind) {
    case "quantity_discount":
      return <QuantityOfferBuilder offerId={offerId} />;
    case "product_add_on":
      return <AddonOfferBuilder offerId={offerId} />;
    case "bundle":
      return <BundleOfferBuilder offerId={offerId} />;
    case "upgrade_offer":
      return <UpgradeOfferBuilder offerId={offerId} />;
    case "cart_recommendation":
      return <RecommendationOfferBuilder offerId={offerId} />;
  }
}

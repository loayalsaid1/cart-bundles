"use client";

import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SaleTag01Icon,
  PackageAdd01Icon,
  GiftIcon,
  Rocket01Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";
import { useTranslations } from "next-intl";
import type { OfferKind } from "@/lib/schemas/common-offer";

const KIND_ICONS: Record<OfferKind, typeof SaleTag01Icon> = {
  quantity_discount: SaleTag01Icon,
  product_add_on: PackageAdd01Icon,
  bundle: GiftIcon,
  upgrade_offer: Rocket01Icon,
  cart_recommendation: ShoppingCart01Icon,
};

export function OfferKindBadge({ kind }: { kind: OfferKind }) {
  const t = useTranslations("Offers");
  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-medium">
      <HugeiconsIcon icon={KIND_ICONS[kind]} size={14} className="text-muted-foreground" />
      {t(`kind.${kind}`)}
    </Badge>
  );
}

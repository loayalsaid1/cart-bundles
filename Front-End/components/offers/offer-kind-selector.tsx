"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SaleTag01Icon,
  PackageAdd01Icon,
  GiftIcon,
  Rocket01Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";
import { offerKindSchema, type OfferKind } from "@/lib/schemas/common-offer";
import { kindToSlug } from "@/lib/utils/offer-kind";

const KIND_ICONS: Record<OfferKind, typeof SaleTag01Icon> = {
  quantity_discount: SaleTag01Icon,
  product_add_on: PackageAdd01Icon,
  bundle: GiftIcon,
  upgrade_offer: Rocket01Icon,
  cart_recommendation: ShoppingCart01Icon,
};

export function OfferKindSelector() {
  const t = useTranslations("Offers");
  const router = useRouter();

  const openBuilder = (kind: OfferKind) =>
    router.push(`/salla/embed/offers/${kindToSlug(kind)}/new`);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("typeSelector.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("typeSelector.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerKindSchema.options.slice(0, 2).map((kind) => (
          <Card
            key={kind}
            className="relative flex cursor-pointer flex-col p-5 transition-all hover:shadow-md hover:border-ring"
            onClick={() => openBuilder(kind)}
          >
            <CardContent className="flex flex-col gap-3 p-0">
              <div className="rounded-lg bg-muted p-2.5">
                <HugeiconsIcon icon={KIND_ICONS[kind]} size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{t(`kind.${kind}`)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`typeSelector.${kind}.description`)}
                </p>
              </div>
              <Button size="sm" className="mt-auto" onClick={() => openBuilder(kind)}>
                {t("typeSelector.create")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

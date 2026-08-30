"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, Edit01Icon, Copy01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import {
  useDeleteQuantityOffer,
  useCreateQuantityOffer,
} from "@/hooks/use-quantity-offers";
import { useDeleteAddonOffer, useCreateAddonOffer } from "@/hooks/use-addon-offers";
import { useDeleteBundleOffer, useCreateBundleOffer } from "@/hooks/use-bundle-offers";
import { useDeleteUpgradeOffer, useCreateUpgradeOffer } from "@/hooks/use-upgrade-offers";
import {
  useDeleteRecommendationOffer,
  useCreateRecommendationOffer,
} from "@/hooks/use-recommendation-offers";
import { getQuantityOffer } from "@/lib/api/quantity-offers";
import { getAddonOffer } from "@/lib/api/addon-offers";
import { getBundleOffer } from "@/lib/api/bundle-offers";
import { getUpgradeOffer } from "@/lib/api/upgrade-offers";
import { getRecommendationOffer } from "@/lib/api/recommendation-offers";
import {
  fullOfferToQuantityDraft,
  fullOfferToAddonDraft,
  fullOfferToBundleDraft,
  fullOfferToUpgradeDraft,
  fullOfferToRecommendationDraft,
} from "@/lib/utils/offer-transformers";
import { kindToSlug } from "@/lib/utils/offer-kind";
import { SallaSDK } from "@/lib/salla-sdk";
import type { DashboardOffer, OfferKind } from "@/lib/schemas/common-offer";
import type { QuantityOfferFull } from "@/lib/schemas/quantity-offer";
import type { AddonOfferFull } from "@/lib/schemas/addon-offer";
import type { BundleOfferFull } from "@/lib/schemas/bundle-offer";
import type { UpgradeOfferFull } from "@/lib/schemas/upgrade-offer";
import type { RecommendationOfferFull } from "@/lib/schemas/recommendation-offer";

interface MutableDraft {
  info: { internalName: string };
}

const GET_FULL: Record<OfferKind, (id: number) => Promise<unknown>> = {
  quantity_discount: getQuantityOffer,
  product_add_on: getAddonOffer,
  bundle: getBundleOffer,
  upgrade_offer: getUpgradeOffer,
  cart_recommendation: getRecommendationOffer,
};

const TO_DRAFT: Record<OfferKind, (full: unknown) => MutableDraft> = {
  quantity_discount: (full) => fullOfferToQuantityDraft(full as QuantityOfferFull),
  product_add_on: (full) => fullOfferToAddonDraft(full as AddonOfferFull),
  bundle: (full) => fullOfferToBundleDraft(full as BundleOfferFull),
  upgrade_offer: (full) => fullOfferToUpgradeDraft(full as UpgradeOfferFull),
  cart_recommendation: (full) =>
    fullOfferToRecommendationDraft(full as RecommendationOfferFull),
};

export function OfferActionsMenu({ offer }: { offer: DashboardOffer }) {
  const t = useTranslations("Offers");
  const router = useRouter();

  const remove = {
    quantity_discount: useDeleteQuantityOffer(),
    product_add_on: useDeleteAddonOffer(),
    bundle: useDeleteBundleOffer(),
    upgrade_offer: useDeleteUpgradeOffer(),
    cart_recommendation: useDeleteRecommendationOffer(),
  };
  const create = {
    quantity_discount: useCreateQuantityOffer(),
    product_add_on: useCreateAddonOffer(),
    bundle: useCreateBundleOffer(),
    upgrade_offer: useCreateUpgradeOffer(),
    cart_recommendation: useCreateRecommendationOffer(),
  };

  const edit = () => {
    router.push(`/salla/embed/offers/${kindToSlug(offer.kind)}/${offer.id}/edit`);
  };

  const duplicate = async () => {
    const full = await GET_FULL[offer.kind](offer.id);
    const draft = TO_DRAFT[offer.kind](full);
    draft.info.internalName = `${draft.info.internalName} — copy`;
    await create[offer.kind].mutateAsync(draft as never);
  };

  const removeOffer = async () => {
    const confirmed = await SallaSDK.confirm({
      title: t("masterList.actions.deleteTitle"),
      text: t("masterList.actions.deleteText", { name: offer.internalName }),
      confirmText: t("masterList.actions.delete"),
      cancelText: t("masterList.actions.cancel"),
    });
    if (confirmed) await remove[offer.kind].mutateAsync(offer.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={t("masterList.actions.label")}
      >
        <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={edit}>
          <HugeiconsIcon icon={Edit01Icon} size={16} />
          {t("masterList.actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={duplicate}>
          <HugeiconsIcon icon={Copy01Icon} size={16} />
          {t("masterList.actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={removeOffer} className="text-destructive focus:text-destructive">
          <HugeiconsIcon icon={Delete01Icon} size={16} />
          {t("masterList.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

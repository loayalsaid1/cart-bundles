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
import { useDeleteQuantityOffer, useCreateQuantityOffer } from "@/hooks/use-quantity-offers";
import { getQuantityOffer } from "@/lib/api/quantity-offers";
import { fullOfferToQuantityDraft } from "@/lib/utils/offer-transformers";
import { SallaSDK } from "@/lib/salla-sdk";
import type { DashboardOffer } from "@/lib/schemas/common-offer";

export function OfferActionsMenu({ offer }: { offer: DashboardOffer }) {
  const t = useTranslations("Offers");
  const router = useRouter();
  const remove = useDeleteQuantityOffer();
  const create = useCreateQuantityOffer();

  const edit = () => {
    if (offer.kind !== "quantity_discount") return;
    router.push(`/salla/embed/offers/${offer.kind}/${offer.id}/edit`);
  };

  const duplicate = async () => {
    if (offer.kind !== "quantity_discount") return;
    const full = await getQuantityOffer(offer.id);
    const draft = fullOfferToQuantityDraft(full);
    draft.info.internalName = `${draft.info.internalName} — copy`;
    await create.mutateAsync(draft);
  };

  const removeOffer = async () => {
    if (offer.kind !== "quantity_discount") return;
    const confirmed = await SallaSDK.confirm({
      title: t("masterList.actions.deleteTitle"),
      text: t("masterList.actions.deleteText", { name: offer.internalName }),
      confirmText: t("masterList.actions.delete"),
      cancelText: t("masterList.actions.cancel"),
    });
    if (confirmed) await remove.mutateAsync(offer.id);
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
        <DropdownMenuItem onClick={edit} disabled={offer.kind !== "quantity_discount"}>
          <HugeiconsIcon icon={Edit01Icon} size={16} />
          {t("masterList.actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={duplicate} disabled={offer.kind !== "quantity_discount"}>
          <HugeiconsIcon icon={Copy01Icon} size={16} />
          {t("masterList.actions.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={removeOffer} disabled={offer.kind !== "quantity_discount"} className="text-destructive focus:text-destructive">
          <HugeiconsIcon icon={Delete01Icon} size={16} />
          {t("masterList.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

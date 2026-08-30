"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  quantityOfferDraftSchema,
  type QuantityOfferDraft,
} from "@/lib/schemas/quantity-offer";
import { defaultQuantityDraft, fullOfferToQuantityDraft } from "@/lib/utils/offer-transformers";
import {
  useCreateQuantityOffer,
  useQuantityOffer,
  useUpdateQuantityOffer,
} from "@/hooks/use-quantity-offers";
import { OfferBuilderShell } from "@/components/offers/builder/offer-builder-shell";
import type { BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { TargetingStep } from "@/components/offers/builder/steps/targeting-step";
import { TiersStep } from "@/components/offers/builder/steps/tiers-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { QuantityOfferPreview } from "@/components/offers/builder/preview/quantity-offer-preview";

const STEPS: BuilderStepDef[] = [
  { key: "info" },
  { key: "targeting" },
  { key: "settings" },
  { key: "appearance" },
];

const STEP_FIELDS: Array<Array<keyof QuantityOfferDraft>> = [
  ["info"],
  ["targeting"],
  ["settings"],
  ["appearance"],
];

export function QuantityOfferBuilder({ offerId }: { offerId?: number }) {
  const t = useTranslations("Offers");
  const [previewPrice, setPreviewPrice] = useState(100);
  const create = useCreateQuantityOffer();
  const update = useUpdateQuantityOffer();
  return (
    <OfferBuilderShell<QuantityOfferDraft>
      offerId={offerId}
      steps={STEPS}
      stepFields={STEP_FIELDS}
      draftSchema={quantityOfferDraftSchema}
      defaultDraft={defaultQuantityDraft}
      useOfferQuery={useQuantityOffer}
      fullToDraft={fullOfferToQuantityDraft}
      create={create}
      update={update}
      kindLabel={t("kind.quantity_discount")}
      renderStep={(step) => {
        switch (step) {
          case 0:
            return <GeneralInfoStep />;
          case 1:
            return (
              <TargetingStep
                onProductsPicked={(products) => {
                  const p = products[0];
                  if (p?.price?.amount) setPreviewPrice(p.price.amount);
                }}
              />
            );
          case 2:
            return <TiersStep />;
          default:
            return <AppearanceStep />;
        }
      }}
      renderPreview={(draft) => (
        <QuantityOfferPreview draft={draft} unitPrice={previewPrice} />
      )}
    />
  );
}

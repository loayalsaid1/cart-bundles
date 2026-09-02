"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  addonOfferDraftSchema,
  type AddonOfferDraft,
} from "@/lib/schemas/addon-offer";
import { defaultAddonDraft, fullOfferToAddonDraft } from "@/lib/utils/offer-transformers";
import {
  useAddonOffer,
  useCreateAddonOffer,
  useUpdateAddonOffer,
} from "@/hooks/use-addon-offers";
import { OfferBuilderShell } from "@/components/offers/builder/offer-builder-shell";
import type { BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { TargetingStep } from "@/components/offers/builder/steps/targeting-step";
import { AddonSettingsStep } from "@/components/offers/builder/steps/addon-settings-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { AddonOfferPreview } from "@/components/offers/builder/preview/addon-offer-preview";

const STEPS: BuilderStepDef[] = [
  { key: "info" },
  { key: "targeting" },
  { key: "settings" },
  { key: "appearance" },
];

const STEP_FIELDS: Array<Array<keyof AddonOfferDraft>> = [
  ["info"],
  ["targeting"],
  ["settings"],
  ["appearance"],
];

export function AddonOfferBuilder({ offerId }: { offerId?: number }) {
  const t = useTranslations("Offers");
  const [previewPrice, setPreviewPrice] = useState(100);
  const create = useCreateAddonOffer();
  const update = useUpdateAddonOffer();

  return (
    <OfferBuilderShell<AddonOfferDraft>
      offerId={offerId}
      steps={STEPS}
      stepFields={STEP_FIELDS}
      draftSchema={addonOfferDraftSchema}
      defaultDraft={defaultAddonDraft}
      useOfferQuery={useAddonOffer}
      fullToDraft={fullOfferToAddonDraft}
      create={create}
      update={update}
      kindLabel={t("kind.product_add_on")}
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
                allowedTargetTypes={["selected_products", "selected_categories"]}
              />
            );
          case 2:
            return <AddonSettingsStep />;
          default:
            return <AppearanceStep />;
        }
      }}
      renderPreview={(draft) => (
        <AddonOfferPreview draft={draft} unitPrice={previewPrice} />
      )}
    />
  );
}

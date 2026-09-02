"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  bundleOfferDraftSchema,
  type BundleOfferDraft,
} from "@/lib/schemas/bundle-offer";
import { defaultBundleDraft, fullOfferToBundleDraft } from "@/lib/utils/offer-transformers";
import {
  useBundleOffer,
  useCreateBundleOffer,
  useUpdateBundleOffer,
} from "@/hooks/use-bundle-offers";
import { OfferBuilderShell } from "@/components/offers/builder/offer-builder-shell";
import type { BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { TargetingStep } from "@/components/offers/builder/steps/targeting-step";
import { BundleSettingsStep } from "@/components/offers/builder/steps/bundle-settings-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { BundleOfferPreview } from "@/components/offers/builder/preview/bundle-offer-preview";

const STEPS: BuilderStepDef[] = [
  { key: "info" },
  { key: "targeting" },
  { key: "settings" },
  { key: "appearance" },
];

const STEP_FIELDS: Array<Array<keyof BundleOfferDraft>> = [
  ["info"],
  ["targeting"],
  ["settings"],
  ["appearance"],
];

export function BundleOfferBuilder({ offerId }: { offerId?: number }) {
  const t = useTranslations("Offers");
  const [previewPrice, setPreviewPrice] = useState(100);
  const create = useCreateBundleOffer();
  const update = useUpdateBundleOffer();

  return (
    <OfferBuilderShell<BundleOfferDraft>
      offerId={offerId}
      steps={STEPS}
      stepFields={STEP_FIELDS}
      draftSchema={bundleOfferDraftSchema}
      defaultDraft={defaultBundleDraft}
      useOfferQuery={useBundleOffer}
      fullToDraft={fullOfferToBundleDraft}
      create={create}
      update={update}
      kindLabel={t("kind.bundle")}
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
            return <BundleSettingsStep />;
          default:
            return <AppearanceStep />;
        }
      }}
      renderPreview={(draft) => (
        <BundleOfferPreview draft={draft} unitPrice={previewPrice} />
      )}
    />
  );
}

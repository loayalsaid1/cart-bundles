"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  upgradeOfferDraftSchema,
  type UpgradeOfferDraft,
} from "@/lib/schemas/upgrade-offer";
import { defaultUpgradeDraft, fullOfferToUpgradeDraft } from "@/lib/utils/offer-transformers";
import {
  useCreateUpgradeOffer,
  useUpdateUpgradeOffer,
  useUpgradeOffer,
} from "@/hooks/use-upgrade-offers";
import { OfferBuilderShell } from "@/components/offers/builder/offer-builder-shell";
import type { BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { TargetingStep } from "@/components/offers/builder/steps/targeting-step";
import { UpgradeSettingsStep } from "@/components/offers/builder/steps/upgrade-settings-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { UpgradeOfferPreview } from "@/components/offers/builder/preview/upgrade-offer-preview";

const STEPS: BuilderStepDef[] = [
  { key: "info" },
  { key: "targeting" },
  { key: "settings" },
  { key: "appearance" },
];

const STEP_FIELDS: Array<Array<keyof UpgradeOfferDraft>> = [
  ["info"],
  ["targeting"],
  ["settings"],
  ["appearance"],
];

export function UpgradeOfferBuilder({ offerId }: { offerId?: number }) {
  const t = useTranslations("Offers");
  const [previewPrice, setPreviewPrice] = useState(100);
  const create = useCreateUpgradeOffer();
  const update = useUpdateUpgradeOffer();

  return (
    <OfferBuilderShell<UpgradeOfferDraft>
      offerId={offerId}
      steps={STEPS}
      stepFields={STEP_FIELDS}
      draftSchema={upgradeOfferDraftSchema}
      defaultDraft={defaultUpgradeDraft}
      useOfferQuery={useUpgradeOffer}
      fullToDraft={fullOfferToUpgradeDraft}
      create={create}
      update={update}
      kindLabel={t("kind.upgrade_offer")}
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
            return <UpgradeSettingsStep />;
          default:
            return <AppearanceStep />;
        }
      }}
      renderPreview={(draft) => (
        <UpgradeOfferPreview draft={draft} unitPrice={previewPrice} />
      )}
    />
  );
}

"use client";

import { useTranslations } from "next-intl";
import {
  recommendationOfferDraftSchema,
  type RecommendationOfferDraft,
} from "@/lib/schemas/recommendation-offer";
import {
  defaultRecommendationDraft,
  fullOfferToRecommendationDraft,
} from "@/lib/utils/offer-transformers";
import {
  useCreateRecommendationOffer,
  useRecommendationOffer,
  useUpdateRecommendationOffer,
} from "@/hooks/use-recommendation-offers";
import { OfferBuilderShell } from "@/components/offers/builder/offer-builder-shell";
import type { BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { RecommendationSettingsStep } from "@/components/offers/builder/steps/recommendation-settings-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { RecommendationOfferPreview } from "@/components/offers/builder/preview/recommendation-offer-preview";

const STEPS: BuilderStepDef[] = [
  { key: "info" },
  { key: "settings" },
  { key: "appearance" },
];

const STEP_FIELDS: Array<Array<keyof RecommendationOfferDraft>> = [
  ["info"],
  ["settings"],
  ["appearance"],
];

export function RecommendationOfferBuilder({ offerId }: { offerId?: number }) {
  const t = useTranslations("Offers");
  const create = useCreateRecommendationOffer();
  const update = useUpdateRecommendationOffer();

  return (
    <OfferBuilderShell<RecommendationOfferDraft>
      offerId={offerId}
      steps={STEPS}
      stepFields={STEP_FIELDS}
      draftSchema={recommendationOfferDraftSchema}
      defaultDraft={defaultRecommendationDraft}
      useOfferQuery={useRecommendationOffer}
      fullToDraft={fullOfferToRecommendationDraft}
      create={create}
      update={update}
      kindLabel={t("kind.cart_recommendation")}
      renderStep={(step) => {
        switch (step) {
          case 0:
            return <GeneralInfoStep />;
          case 1:
            return <RecommendationSettingsStep />;
          default:
            return <AppearanceStep />;
        }
      }}
      renderPreview={(draft) => (
        <RecommendationOfferPreview draft={draft} unitPrice={100} />
      )}
    />
  );
}

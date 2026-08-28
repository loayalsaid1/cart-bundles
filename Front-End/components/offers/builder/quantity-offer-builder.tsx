"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  quantityOfferDraftSchema,
  type QuantityOfferDraft,
} from "@/lib/schemas/quantity-offer";
import { defaultQuantityDraft, fullOfferToQuantityDraft } from "@/lib/utils/offer-transformers";
import { useCreateQuantityOffer, useQuantityOffer, useUpdateQuantityOffer } from "@/hooks/use-quantity-offers";
import { BuilderStepNav, type BuilderStepDef } from "@/components/offers/builder/offer-builder-layout";
import { GeneralInfoStep } from "@/components/offers/builder/steps/general-info-step";
import { TargetingStep } from "@/components/offers/builder/steps/targeting-step";
import { TiersStep } from "@/components/offers/builder/steps/tiers-step";
import { AppearanceStep } from "@/components/offers/builder/steps/appearance-step";
import { QuantityOfferPreview } from "@/components/offers/builder/preview/quantity-offer-preview";
import { notify } from "@/lib/notify";
import { Skeleton } from "@/components/ui/skeleton";

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
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [previewPrice, setPreviewPrice] = useState(100);

  const { data: offer, isPending } = useQuantityOffer(offerId ?? null);

  const form = useForm<QuantityOfferDraft>({
    resolver: zodResolver(quantityOfferDraftSchema),
    defaultValues: defaultQuantityDraft,
    mode: "onTouched",
  });

  // Re-populate form when editing an existing offer (data arrives async)
  useEffect(() => {
    if (offer) {
      form.reset(fullOfferToQuantityDraft(offer));
    }
  }, [offer, form]);

  const draft = form.watch();
  const create = useCreateQuantityOffer();
  const update = useUpdateQuantityOffer();

  const handleNext = async () => {
    const ok = await form.trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSave = async () => {
    const ok = await form.trigger();
    if (!ok) {
      const errorStep = STEP_FIELDS.findIndex((fields) =>
        fields.some((f) => form.formState.errors[f]),
      );
      if (errorStep >= 0) setStep(errorStep);
      notify.error(t("builder.notifications.validationFailed"));
      return;
    }
    const values = form.getValues();
    if (offerId) {
      await update.mutateAsync({ id: offerId, draft: values });
    } else {
      await create.mutateAsync(values);
    }
    router.push("/salla/embed/offers");
  };

  if (offerId != null && isPending) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">
              {offerId ? t("builder.titleEdit") : t("builder.titleNew")}
            </h1>
            <BuilderStepNav steps={STEPS} active={step} onSelect={(i) => i <= step && setStep(i)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push("/salla/embed/offers")}>
              {t("builder.cancel")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext}>{t("builder.next")}</Button>
            ) : (
              <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
                {t("builder.save")}
              </Button>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_minmax(320px,0.9fr)]">
          <div className="max-w-2xl">
            {step === 0 && <GeneralInfoStep />}
            {step === 1 && (
              <TargetingStep onProductsPicked={(products) => {
                const p = products[0];
                if (p?.price?.amount) setPreviewPrice(p.price.amount);
              }} />
            )}
            {step === 2 && <TiersStep />}
            {step === 3 && <AppearanceStep />}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <QuantityOfferPreview draft={draft} unitPrice={previewPrice} />
          </aside>
        </div>
      </div>
    </FormProvider>
  );
}

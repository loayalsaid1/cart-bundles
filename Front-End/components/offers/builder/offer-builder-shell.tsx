"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm, FormProvider, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { ZodType } from "zod";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BuilderStepNav,
  type BuilderStepDef,
} from "@/components/offers/builder/offer-builder-layout";
import { notify } from "@/lib/notify";
import type { OfferInfo } from "@/lib/schemas/common-offer";

interface OfferBuilderShellProps<T extends { info: OfferInfo } & FieldValues> {
  offerId?: number;
  steps: BuilderStepDef[];
  stepFields: Array<Array<keyof T>>;
  draftSchema: ZodType<T>;
  defaultDraft: T;
  useOfferQuery: (id: number | null) => { data?: unknown; isPending: boolean };
  fullToDraft: (full: never) => T;
  create: {
    isPending: boolean;
    mutateAsync: (draft: T) => Promise<unknown>;
  };
  update: {
    isPending: boolean;
    mutateAsync: (args: { id: number; draft: T }) => Promise<unknown>;
  };
  kindLabel: string;
  renderStep: (index: number) => ReactNode;
  renderPreview: (draft: T) => ReactNode;
}

export function OfferBuilderShell<T extends { info: OfferInfo } & FieldValues>({
  offerId,
  steps,
  stepFields,
  draftSchema,
  defaultDraft,
  useOfferQuery,
  fullToDraft,
  create,
  update,
  kindLabel,
  renderStep,
  renderPreview,
}: OfferBuilderShellProps<T>) {
  const t = useTranslations("Offers");
  const router = useRouter();
  const [step, setStep] = useState(0);

  const { data: offer, isPending } = useOfferQuery(offerId ?? null);

  const form = useForm<T>({
    resolver: zodResolver(draftSchema as never),
    defaultValues: defaultDraft as DefaultValues<T>,
    mode: "onTouched",
  });

  useEffect(() => {
    if (offer) {
      form.reset(fullToDraft(offer as never));
    }
  }, [offer, form, fullToDraft]);

  const draft = form.watch();

  const handleNext = async () => {
    const ok = await form.trigger(stepFields[step] as Path<T>[]);
    if (ok) setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleSave = async () => {
    const ok = await form.trigger();
    if (!ok) {
      const errorStep = stepFields.findIndex((fields) =>
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

  if (isPending) {
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
              {offerId
                ? t("builder.titleEdit", { kind: kindLabel })
                : t("builder.titleNew", { kind: kindLabel })}
            </h1>
            <BuilderStepNav
              steps={steps}
              active={step}
              onSelect={(i) => i <= step && setStep(i)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push("/salla/embed/offers")}>
              {t("builder.cancel")}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={handleNext}>{t("builder.next")}</Button>
            ) : (
              <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
                {t("builder.save")}
              </Button>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_minmax(320px,0.9fr)]">
          <div className="max-w-2xl">{renderStep(step)}</div>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            {renderPreview(draft)}
          </aside>
        </div>
      </div>
    </FormProvider>
  );
}

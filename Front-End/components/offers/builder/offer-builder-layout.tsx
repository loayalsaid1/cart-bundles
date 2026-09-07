"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type BuilderStepKey = "info" | "targeting" | "settings" | "appearance";

export interface BuilderStepDef {
  key: BuilderStepKey;
}

export function BuilderStepNav({
  steps,
  active,
  onSelect,
}: {
  steps: BuilderStepDef[];
  active: number;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("Offers");
  return (
    <ol className="flex items-center gap-1">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                current
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "text-primary hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="me-1.5 font-bold">{index + 1}.</span>
              {t(`builder.steps.${step.key}`)}
            </button>
            {index < steps.length - 1 && (
              <div className="h-px w-4 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

import type { Formats } from "next-intl";

export const formats = {
  number: {
    default: {
      numberingSystem: "latn",
    },
    arabicDigits: {
      numberingSystem: "latn",
    },
    precise: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      numberingSystem: "latn",
    },
    currency: {
      style: "currency" as const,
      currency: "SAR",
      numberingSystem: "latn",
    },
  },
} satisfies Formats;

export function createFormats(locale: string): Formats {
  const numberingSystem = locale === "ar" ? "arab" : "latn";
  return {
    number: {
      default: {
        numberingSystem,
      },
      arabicDigits: {
        numberingSystem,
      },
      precise: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        numberingSystem,
      },
      currency: {
        style: "currency",
        currency: "SAR",
        numberingSystem,
      },
    },
  };
}

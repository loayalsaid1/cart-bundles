import { getRequestConfig } from "next-intl/server";
import { hasLocale, Formats } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  const isArabic = locale === "ar";
  const formats: Formats = {
    number: {
      default: {
        numberingSystem: isArabic ? "arab" : "latn",
      },
      arabicDigits: {
          numberingSystem: 'arab'
      },
      precise: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        numberingSystem: isArabic ? "arab" : "latn",
      },
      currency: {
        style: "currency",
        currency: "SAR",
        numberingSystem: isArabic ? "arab" : "latn",
      },
    },
  };

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    formats,
  };
});



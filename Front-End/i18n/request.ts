import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { createFormats } from "./formats";
import { routing } from "./routing";

export { formats } from "./formats";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    formats: createFormats(locale),
  };
});



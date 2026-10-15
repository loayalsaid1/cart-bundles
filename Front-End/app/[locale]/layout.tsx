import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { createFormats } from "@/i18n/formats";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { pingARLT } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cart Bundles",
  description: "Next.js app with Drizzle ORM configured.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const formats = createFormats(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`h-full antialiased ${pingARLT.variable}`}
      suppressHydrationWarning
    >
      <body className={`min-h-full flex flex-col ${pingARLT.className}`}>
        <ThemeProvider attribute={["class", "data-theme"]} defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextIntlClientProvider 
            messages={messages}
            locale={locale}
            formats={formats}
          >
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

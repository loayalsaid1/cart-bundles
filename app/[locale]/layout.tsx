import type { Metadata } from "next";
import { NextIntlClientProvider, Formats } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
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

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();

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

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider 
          messages={messages}
          locale={locale}
          formats={formats}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

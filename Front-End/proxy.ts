import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Check if pathname already starts with a supported locale (/ar or /en)
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  // Handle requests without locale prefix (such as /salla/embed loaded by Salla iframe)
  if (!hasLocalePrefix && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    // Detect locale from Salla query param (?locale=ar or ?locale=en) or fallback to defaultLocale
    const queryLocale = searchParams.get("locale");
    const targetLocale =
      queryLocale && (routing.locales as readonly string[]).includes(queryLocale)
        ? queryLocale
        : routing.defaultLocale;

    // Rewrite internally to /[locale]/... so Salla iframe URL doesn't get redirected
    const url = req.nextUrl.clone();
    url.pathname = `/${targetLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return intlMiddleware(req);
}

export const config = {
  // Assuming I'll only need arabic and english as per the salla documentation
  matcher: ["/", "/(ar|en)/:path*", "/((?!_next|_vercel|api|.*\\..*).*)"],
};

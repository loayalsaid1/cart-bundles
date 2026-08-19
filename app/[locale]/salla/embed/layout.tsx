'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { embedded } from '@salla.sa/embedded-sdk';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';

function applyTheme(isDark: boolean) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
        localStorage.setItem('salla_theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove('dark');
        localStorage.setItem('salla_theme', 'light');
    }
}

function DarkModeSync() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const darkParam = searchParams.get('dark');
        const themeParam = searchParams.get('theme');

        if (darkParam !== null || themeParam !== null) {
            const isDark = darkParam === 'true' || themeParam === 'dark';
            applyTheme(isDark);
        } else {
            const savedTheme = localStorage.getItem('salla_theme');
            if (savedTheme) {
                applyTheme(savedTheme === 'dark');
            }
        }
    }, [searchParams]);

    return null;
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const initialized = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('EmbedLayout');


    useEffect(() => {
        // Prevent React Strict Mode from initializing the SDK twice in dev mode
        if (initialized.current) return;
        initialized.current = true;

        (async () => {
            const initResult = await embedded.init();
            if (initResult?.layout?.theme) {
                applyTheme(initResult.layout.theme === 'dark');
            }

            // Subscribe to real-time theme changes from Salla host dashboard
            embedded.onThemeChange((theme) => {
                applyTheme(theme === 'dark');
            });

            const token = embedded.auth.getToken();
            if (!token) {
                embedded.destroy();
                return;
            }

            const res = await fetch('/api/salla/embed/auth/verify?token=' + token);
            const data = await res.json();

            if (!res.ok) {
                embedded.destroy();
                return;
            }
            localStorage.setItem("jwtToken", data.jwtToken);

            // Add navigation items to Salla embedded header
            try {
                await embedded.nav.addNavItem({
                    title: t("navProducts"),
                    value: "products-page",
                    url: "/salla/embed",
                    active: pathname === "/salla/embed",
                });

                await embedded.nav.addNavItem({
                    title: t("navTest"),
                    value: "test-page",
                    url: "/salla/embed/test",
                    active: pathname === "/salla/embed/test",
                });
            } catch (err) {
                console.warn("Failed to add nav items to embedded SDK:", err);
            }

            // Listen to sub-nav item clicks from Salla host header
            embedded.nav.onNavItemClick(({ value, url }) => {
                console.log("Salla nav item clicked:", value, url);
                if (url) {
                    router.push(url);
                    embedded.nav.updateNavItem({ value: "products-page", active: value === "products-page" });
                    embedded.nav.updateNavItem({ value: "test-page", active: value === "test-page" });
                }
            });
           embedded.ui.breadcrumbs.hide();

            setReady(true);
            embedded.ready(); // tell Salla to remove its loading overlay
        })();
    }, [router, pathname, t]);

    // Keep active state updated on path changes
    useEffect(() => {
        if (ready) {
            if (pathname === "/salla/embed") {
                embedded.nav.updateNavItem({ value: "products-page", active: true });
                embedded.nav.updateNavItem({ value: "test-page", active: false });
            } else if (pathname === "/salla/embed/test") {
                embedded.nav.updateNavItem({ value: "products-page", active: false });
                embedded.nav.updateNavItem({ value: "test-page", active: true });
            }
        }
    }, [pathname, ready]);

    if (!ready) return null; // Salla shows its own loading state until ready()

    return (
        <div className="embed-layout min-h-screen bg-background ">
            <Suspense fallback={null}>
                <DarkModeSync />
            </Suspense>
            {/* <header className="flex justify-end p-4 border-b bg-card">
                <LanguageSwitcher />
            </header>
            <main className="flex-1"> */}
                {children}
            {/* </main> */}
        </div>
    );

}

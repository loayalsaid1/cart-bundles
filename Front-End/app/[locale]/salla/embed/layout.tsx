'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { embedded } from '@salla.sa/embedded-sdk';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { Toaster } from '@/components/ui/sonner';

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

const EMBED_NAV_ITEMS = [
    { value: 'offers-page', titleKey: 'navOffers', url: '/salla/embed/offers', matcher: (p: string) => p.startsWith('/salla/embed/offers') },
    { value: 'products-page', titleKey: 'navProducts', url: '/salla/embed', matcher: (p: string) => p === '/salla/embed' },
    { value: 'test-page', titleKey: 'navTest', url: '/salla/embed/test', matcher: (p: string) => p === '/salla/embed/test' },
];

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const initialized = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('EmbedLayout');

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        (async () => {
            const initResult = await embedded.init();
            if (initResult?.layout?.theme) {
                applyTheme(initResult.layout.theme === 'dark');
            }

            embedded.onThemeChange((theme) => {
                applyTheme(theme === 'dark');
            });

            const token = embedded.auth.getToken();
            if (!token) {
                embedded.destroy();
                return;
            }

            const res = await fetch('/api/v1/salla/embed/auth/verify?token=' + token, {
                credentials: 'include',
            });

            if (!res.ok) {
                embedded.destroy();
                return;
            }

            try {
                for (const item of EMBED_NAV_ITEMS) {
                    await embedded.nav.addNavItem({
                        title: t(item.titleKey as any),
                        value: item.value,
                        url: item.url,
                        active: item.matcher(pathname),
                    });
                }
            } catch (err) {
                console.warn('Failed to add nav items to embedded SDK:', err);
            }

            embedded.nav.onNavItemClick(({ value, url }) => {
                if (url) {
                    router.push(url);
                    for (const item of EMBED_NAV_ITEMS) {
                        embedded.nav.updateNavItem({ value: item.value, active: item.value === value });
                    }
                }
            });
            embedded.ui.breadcrumbs.hide();

            setReady(true);
            embedded.ready();
        })();
    }, [router, pathname, t]);

    useEffect(() => {
        if (ready) {
            for (const item of EMBED_NAV_ITEMS) {
                embedded.nav.updateNavItem({ value: item.value, active: item.matcher(pathname) });
            }
        }
    }, [pathname, ready]);

    if (!ready) return null;

    return (
        <div className="embed-layout min-h-screen bg-background text-foreground">
            <Suspense fallback={null}>
                <DarkModeSync />
            </Suspense>
            {children}
            <Toaster position="bottom-right" />
        </div>
    );
}

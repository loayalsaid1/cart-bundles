"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Product } from "@/types/product";

interface MeResponse {
  merchantId: number;
  userId: number;
}

function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("ProductsPage");
  const hasSale =
    Boolean(product.sale_price) &&
    (product.sale_price?.amount ?? 0) > 0 &&
    product.sale_price?.amount !== product.price.amount;

  return (
    <div className="flex gap-3 rounded-xl border bg-card p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {t("noImage")}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {t("skuLabel", { sku: product.sku || "-" })}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {hasSale ? (
            <>
              <span className="text-xs font-semibold text-emerald-600">
                {t("salePrice")}: {product.sale_price?.amount}{" "}
                {product.sale_price?.currency}
              </span>
              <span className="text-xs text-muted-foreground line-through">
                {product.price.amount} {product.price.currency}
              </span>
            </>
          ) : (
            <span>
              {product.price.amount} {product.price.currency}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const t = useTranslations("ProductsPage");
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const meRes = await fetch("/api/v1/salla/oauth/me", {
          credentials: "include",
        });
        if (meRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (!meRes.ok) {
          throw new Error(t("errorFailed"));
        }
        const me = (await meRes.json()) as MeResponse;

        const [productsRes, recRes] = await Promise.all([
          fetch("/api/v1/salla/embed/products", { credentials: "include" }),
          fetch(
            `/api/v1/salla/products/recommendations?storeId=${me.merchantId}`,
            { credentials: "include" },
          ),
        ]);

        if (!productsRes.ok) {
          if (productsRes.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(t("errorFailed"));
        }

        const productData = (await productsRes.json()) as Product[];
        if (!cancelled) setProducts(productData);

        if (recRes.ok) {
          const recData = (await recRes.json()) as Product[];
          if (!cancelled) setRecommendations(recData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("errorFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  const handleLogout = async () => {
    await fetch("/api/v1/salla/oauth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          {t("logout")}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/50">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-3 rounded-xl border bg-card p-3">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("productsTitle")}</h2>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("recommendationsTitle")}</h2>
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noRecommendations")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

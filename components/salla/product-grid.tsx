"use client";

import * as React from "react";
import { Product } from "@/types/product";
import { ProductCard } from "@/components/salla/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  selectedIds: number[];
  onSelectedIdsChange: (ids: number[]) => void;
  onSetSalePriceForProducts: (products: Product[]) => void;
  onRemoveSalePriceForProducts: (products: Product[]) => void;
}

export function ProductGrid({
  products,
  loading = false,
  error = null,
  selectedIds,
  onSelectedIdsChange,
  onSetSalePriceForProducts,
  onRemoveSalePriceForProducts,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col space-y-3 p-3 border rounded-xl bg-card">
            <Skeleton className="h-[140px] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900/50">
        <p className="font-semibold">Error fetching products:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-xl bg-muted/10 my-4">
        <p className="text-muted-foreground text-sm font-medium">No products found.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search query or refresh the page.</p>
      </div>
    );
  }

  const allSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  const someSelected = selectedIds.length > 0;
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = Array.from(new Set([...selectedIds, ...products.map((p) => p.id)]));
      onSelectedIdsChange(allIds);
    } else {
      const currentProductIds = new Set(products.map((p) => p.id));
      onSelectedIdsChange(selectedIds.filter((id) => !currentProductIds.has(id)));
    }
  };

  const handleToggleSelectOne = (productId: number, checked: boolean) => {
    if (checked) {
      onSelectedIdsChange([...selectedIds, productId]);
    } else {
      onSelectedIdsChange(selectedIds.filter((id) => id !== productId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar / Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/30 border rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all-products"
            checked={allSelected}
            onCheckedChange={handleToggleSelectAll}
          />
          <label htmlFor="select-all-products" className="text-xs font-medium cursor-pointer">
            Select All ({products.length})
          </label>
        </div>

        {someSelected && (
          <div className="flex items-center gap-2 animate-in fade-in-50 flex-wrap">
            <span className="text-xs font-semibold text-primary mr-1">
              {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <Button
              size="sm"
              variant="default"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
              onClick={() => onSetSalePriceForProducts(selectedProducts)}
            >
              🏷️ Bulk Set Sale Price ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => onRemoveSalePriceForProducts(selectedProducts)}
            >
              ✕ Remove Sale Prices ({selectedIds.length})
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onSelectedIdsChange([])}
              className="text-muted-foreground"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selected={selectedIds.includes(product.id)}
            onSelectChange={(checked) => handleToggleSelectOne(product.id, checked)}
            onSetSalePrice={() => onSetSalePriceForProducts([product])}
            onRemoveSalePrice={() => onRemoveSalePriceForProducts([product])}
          />
        ))}
      </div>
    </div>
  );
}

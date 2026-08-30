"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductSearch } from "@/hooks/use-product-search";
import type { Product } from "@/types/product";

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  initialProducts?: Product[];
  onApply: (products: Product[]) => void;
  single?: boolean;
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  initialProducts = [],
  onApply,
  single = false,
}: ProductPickerDialogProps) {
  const t = useTranslations("Offers");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Map<number, Product>>(new Map());
  const { data: products, isPending } = useProductSearch(query.trim(), open);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      const initialMap = new Map<number, Product>();
      initialProducts.forEach((p) => initialMap.set(p.id, p));
      setPicked(initialMap);
    }
  }

  const selectedIdsSet = new Set(selectedIds);

  // Sync search results into picked map if their ID is in selectedIds
  useEffect(() => {
    if (open && products && products.length > 0) {
      setPicked((prev) => {
        const next = new Map(prev);
        let changed = false;
        products.forEach((p) => {
          if (selectedIds.includes(p.id) && !next.has(p.id)) {
            next.set(p.id, p);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [open, products, selectedIds]);

  const toggle = (product: Product) => {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else if (single) {
        next.clear();
        next.set(product.id, product);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  };

  const apply = () => {
    onApply([...picked.values()]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("pickers.products.title")}</DialogTitle>
          <DialogDescription>{t("pickers.products.description")}</DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false} className="rounded-lg border">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("pickers.products.searchPlaceholder")}
          />
          <CommandList className="max-h-72">
            {isPending ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : (
              <CommandEmpty>
                {query
                  ? t("pickers.products.empty")
                  : t("pickers.products.typeToSearch")}
              </CommandEmpty>
            )}
            {products && products.length > 0 && (
              <CommandGroup>
                {products.map((product) => {
                  const checked = picked.has(product.id) || selectedIdsSet.has(product.id);
                  return (
                    <CommandItem
                      key={product.id}
                      value={String(product.id)}
                      onSelect={() => toggle(product)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(product)} />
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                          {t("pickers.products.noImage")}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.price?.amount} {product.price?.currency}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("pickers.products.selectedCount", { count: picked.size })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("pickers.cancel")}
            </Button>
            <Button onClick={apply}>
              {t("pickers.apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

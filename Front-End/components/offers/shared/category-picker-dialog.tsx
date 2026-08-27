"use client";

import { useEffect, useState } from "react";
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
import { useCategorySearch } from "@/hooks/use-category-search";
import type { Category } from "@/lib/api/categories";

interface CategoryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: number[];
  onApply: (categories: Category[]) => void;
}

export function CategoryPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onApply,
}: CategoryPickerDialogProps) {
  const t = useTranslations("Offers");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Map<number, Category>>(new Map());
  const { data: categories } = useCategorySearch(query.trim(), open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPicked(new Map());
    }
  }, [open]);

  const toggle = (category: Category) => {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(category.id)) next.delete(category.id);
      else next.set(category.id, category);
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
          <DialogTitle>{t("pickers.categories.title")}</DialogTitle>
          <DialogDescription>{t("pickers.categories.description")}</DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false} className="rounded-lg border">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("pickers.categories.searchPlaceholder")}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {query
                ? t("pickers.categories.empty")
                : t("pickers.categories.typeToSearch")}
            </CommandEmpty>
            {categories && categories.length > 0 && (
              <CommandGroup>
                {categories.map((category) => {
                  const checked = picked.has(category.id);
                  return (
                    <CommandItem
                      key={category.id}
                      value={String(category.id)}
                      onSelect={() => toggle(category)}
                      className="flex items-center gap-3"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(category)} />
                      {category.thumbnail ? (
                        <img
                          src={category.thumbnail}
                          alt={category.name}
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                          {t("pickers.categories.noImage")}
                        </div>
                      )}
                      <p className="flex-1 text-sm font-medium">{category.name}</p>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("pickers.categories.selectedCount", { count: picked.size })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("pickers.cancel")}
            </Button>
            <Button onClick={apply} disabled={picked.size === 0}>
              {t("pickers.apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

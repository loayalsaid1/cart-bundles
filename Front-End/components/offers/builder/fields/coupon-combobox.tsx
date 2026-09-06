"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCouponSearch } from "@/hooks/use-coupon-search";
import { Coupon } from "@/lib/schemas/coupons";

function isSelectable(coupon: Coupon) {
  const status = (coupon.status ?? "active").toLowerCase();
  return status === "active" || status === "enabled";
}

function formatCoupon(coupon: Coupon) {
  const parts = [];

  if (coupon.type === "fixed_amount") {
    parts.push(`${coupon.amount.amount} . ${coupon.amount.currency}`);
  } else {
    parts.push(`${coupon.amount.amount}%`);
  }

  return parts.join("");
}

export function CouponCombobox({
  couponCode,
  sallaCouponId,
  onChange,
}: {
  couponCode?: string;
  sallaCouponId?: number;
  onChange: (next: { couponCode?: string; sallaCouponId?: number }) => void;
}) {
  const t = useTranslations("Offers");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: coupons, isPending, isError, refetch } = useCouponSearch(
    query.trim(),
    open,
  );
  console.log(coupons)

  const selectedLabel = couponCode?.trim() || t("upgrade.settings.chooseCoupon");

  const selectCoupon = (coupon: Coupon) => {
    if (!isSelectable(coupon)) return;
    onChange({ couponCode: coupon.code, sallaCouponId: coupon.id });
    setOpen(false);
  };

  const clear = () => {
    onChange({});
    setOpen(false);
  };

  return (
    <div className="flex max-w-sm items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
            />
          }
        >
          <span className="truncate">{selectedLabel}</span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={t("pickers.coupons.searchPlaceholder")}
            />
            <CommandList>
              {isPending ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {t("pickers.coupons.loading")}
                </div>
              ) : isError ? (
                <div className="space-y-2 p-4 text-center text-xs">
                  <p className="text-muted-foreground">
                    {t("pickers.coupons.error")}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                  >
                    {t("pickers.coupons.retry")}
                  </Button>
                </div>
              ) : (
                <CommandEmpty>{t("pickers.coupons.empty")}</CommandEmpty>
              )}
              <CommandGroup>
                <CommandItem value="__none__" onSelect={clear}>
                  {t("pickers.coupons.none")}
                </CommandItem>
                {(coupons ?? []).map((coupon) => {
                  const selectable = isSelectable(coupon);
                  const checked = sallaCouponId === coupon.id;
                  return (
                    <CommandItem
                      key={coupon.id}
                      value={`${coupon.id}-${coupon.code}`}
                      disabled={!selectable}
                      data-checked={checked}
                      onSelect={() => selectCoupon(coupon)}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{coupon.code}</span>
                        <span className="truncate text-muted-foreground">
                          {formatCoupon(coupon)}
                          {!selectable
                            ? ` · ${t("pickers.coupons.inactive")}`
                            : ""}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {couponCode ? (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          {t("upgrade.settings.clearCoupon")}
        </Button>
      ) : null}
    </div>
  );
}

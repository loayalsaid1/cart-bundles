"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductSearchProps {
  value: string;
  onChange: (query: string) => void;
  onSearch?: () => void;
  loading?: boolean;
}

export function ProductSearch({ value, onChange, onSearch, loading }: ProductSearchProps) {
  const t = useTranslations("ProductSearch");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="relative flex items-center w-full max-w-md gap-2">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pr-8 text-sm placeholder:text-muted-foreground/70"
        />
        {value && (
          <Button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold px-1 rounded"
            title="Clear"
          >
            ✕
          </Button>
        )}
      </div>

      {onSearch && (
        <Button 
          type="button" 
          onClick={onSearch} 
          disabled={loading}
          variant="default"
          size="default"
        >
          {loading ? "..." : t("searchButton")}
        </Button>
      )}
    </div>
  );
}


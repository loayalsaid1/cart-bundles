"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Store01Icon, 
  Idea01Icon, 
  Activity01Icon 
} from "@hugeicons/core-free-icons";

const QUICK_ACTIONS = [
  {
    href: "/admin/merchants",
    i18nKey: "quickActions.merchants",
    icon: Store01Icon,
  },
  {
    href: "/admin/suggestions",
    i18nKey: "quickActions.suggestions",
    icon: Idea01Icon,
  },
  {
    href: "/admin/activity",
    i18nKey: "quickActions.activity",
    icon: Activity01Icon,
  },
] as const;

export function AdminQuickActions() {
  const t = useTranslations("Admin");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {t("quickActions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "justify-start text-xs font-medium h-10 px-4 gap-2",
            )}
          >
            <HugeiconsIcon 
              icon={action.icon} 
              size={16} 
              className="text-muted-foreground shrink-0" 
            />
            {/* TODO: Invistigate why it complaints about type string */}
            {t(action.i18nKey as any)}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
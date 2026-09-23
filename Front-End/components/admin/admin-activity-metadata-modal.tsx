"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/lib/schemas/activity";

export function AdminActivityMetadataModal({
  log,
  onClose,
}: {
  log: ActivityLog | null;
  onClose: () => void;
}) {
  const t = useTranslations("Admin.activity.metadata");

  if (!log) return null;

  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-base font-bold">
              {log.action}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] uppercase">
              {log.severity}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {new Date(log.createdAt).toLocaleString()} • {t("title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div>
              <span className="font-semibold text-muted-foreground">Merchant ID:</span>{" "}
              {log.merchantId ? `#${log.merchantId}` : "—"}
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Actor Type:</span>{" "}
              <span className="capitalize">{log.actorType}</span>
            </div>
            {log.actorId && (
              <div>
                <span className="font-semibold text-muted-foreground">Actor ID:</span>{" "}
                {log.actorId}
              </div>
            )}
            {log.offerId && (
              <div>
                <span className="font-semibold text-muted-foreground">Offer ID:</span>{" "}
                #{log.offerId}
              </div>
            )}
            {log.entityType && (
              <div>
                <span className="font-semibold text-muted-foreground">Entity:</span>{" "}
                {log.entityType} {log.entityId ? `(#${log.entityId})` : ""}
              </div>
            )}
          </div>

          {log.message && (
            <div className="rounded-md bg-muted/50 p-2.5 font-mono text-[11px]">
              {log.message}
            </div>
          )}

          <div>
            <p className="mb-1 font-semibold text-muted-foreground">JSON Metadata Payload:</p>
            {hasMetadata ? (
              <pre className="max-h-64 overflow-auto rounded-lg border bg-zinc-950 p-3 text-[11px] text-zinc-100 dark:bg-zinc-900">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground italic">{t("noMetadata")}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

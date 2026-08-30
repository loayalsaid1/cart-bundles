"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createUpgradeOffer,
  deleteUpgradeOffer,
  getUpgradeOffer,
  listUpgradeOffers,
  updateUpgradeOffer,
} from "@/lib/api/upgrade-offers";
import type { UpgradeOfferDraft } from "@/lib/schemas/upgrade-offer";
import { useTranslations } from "next-intl";
import { notify } from "@/lib/notify";

export function useUpgradeOffers() {
  return useQuery({
    queryKey: ["offers", "upgrade"],
    queryFn: listUpgradeOffers,
  });
}

export function useUpgradeOffer(id: number | null) {
  return useQuery({
    queryKey: ["offers", "upgrade", id],
    queryFn: () => getUpgradeOffer(id as number),
    enabled: id !== null,
  });
}

export function useCreateUpgradeOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (draft: UpgradeOfferDraft) => createUpgradeOffer(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.created", { kind: t("kind.upgrade_offer") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useUpdateUpgradeOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: UpgradeOfferDraft }) =>
      updateUpgradeOffer(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.updated", { kind: t("kind.upgrade_offer") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useDeleteUpgradeOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (id: number) => deleteUpgradeOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.deleted", { kind: t("kind.upgrade_offer") }));
    },
  });
}

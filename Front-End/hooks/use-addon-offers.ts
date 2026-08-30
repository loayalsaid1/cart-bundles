"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createAddonOffer,
  deleteAddonOffer,
  getAddonOffer,
  listAddonOffers,
  updateAddonOffer,
} from "@/lib/api/addon-offers";
import type { AddonOfferDraft } from "@/lib/schemas/addon-offer";
import { useTranslations } from "next-intl";
import { notify } from "@/lib/notify";

export function useAddonOffers() {
  return useQuery({
    queryKey: ["offers", "addon"],
    queryFn: listAddonOffers,
  });
}

export function useAddonOffer(id: number | null) {
  return useQuery({
    queryKey: ["offers", "addon", id],
    queryFn: () => getAddonOffer(id as number),
    enabled: id !== null,
  });
}

export function useCreateAddonOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (draft: AddonOfferDraft) => createAddonOffer(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.created", { kind: t("kind.product_add_on") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useUpdateAddonOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: AddonOfferDraft }) =>
      updateAddonOffer(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.updated", { kind: t("kind.product_add_on") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useDeleteAddonOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (id: number) => deleteAddonOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.deleted", { kind: t("kind.product_add_on") }));
    },
  });
}

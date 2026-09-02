"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createBundleOffer,
  deleteBundleOffer,
  getBundleOffer,
  listBundleOffers,
  updateBundleOffer,
} from "@/lib/api/bundle-offers";
import type { BundleOfferDraft } from "@/lib/schemas/bundle-offer";
import { useTranslations } from "next-intl";
import { notify } from "@/lib/notify";

export function useBundleOffers() {
  return useQuery({
    queryKey: ["offers", "bundle"],
    queryFn: listBundleOffers,
  });
}

export function useBundleOffer(id: number | null) {
  return useQuery({
    queryKey: ["offers", "bundle", id],
    queryFn: () => getBundleOffer(id as number),
    enabled: id !== null,
  });
}

export function useCreateBundleOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (draft: BundleOfferDraft) => createBundleOffer(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.created", { kind: t("kind.bundle") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useUpdateBundleOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: BundleOfferDraft }) =>
      updateBundleOffer(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.updated", { kind: t("kind.bundle") }));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(msg || t("notify.saveFailed"));
    },
  });
}

export function useDeleteBundleOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (id: number) => deleteBundleOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.deleted", { kind: t("kind.bundle") }));
    },
  });
}

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createRecommendationOffer,
  deleteRecommendationOffer,
  getRecommendationOffer,
  listRecommendationOffers,
  updateRecommendationOffer,
} from "@/lib/api/recommendation-offers";
import type { RecommendationOfferDraft } from "@/lib/schemas/recommendation-offer";
import { useTranslations } from "next-intl";
import { notify } from "@/lib/notify";

export function useRecommendationOffers() {
  return useQuery({
    queryKey: ["offers", "recommendation"],
    queryFn: listRecommendationOffers,
  });
}

export function useRecommendationOffer(id: number | null) {
  return useQuery({
    queryKey: ["offers", "recommendation", id],
    queryFn: () => getRecommendationOffer(id as number),
    enabled: id !== null,
  });
}

export function useCreateRecommendationOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (draft: RecommendationOfferDraft) =>
      createRecommendationOffer(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.created", { kind: t("kind.cart_recommendation") }));
    },
  });
}

export function useUpdateRecommendationOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: ({
      id,
      draft,
    }: {
      id: number;
      draft: RecommendationOfferDraft;
    }) => updateRecommendationOffer(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.updated", { kind: t("kind.cart_recommendation") }));
    },
  });
}

export function useDeleteRecommendationOffer() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: (id: number) => deleteRecommendationOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success(t("notify.deleted", { kind: t("kind.cart_recommendation") }));
    },
  });
}

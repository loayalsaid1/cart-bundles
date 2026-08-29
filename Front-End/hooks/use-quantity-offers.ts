"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createQuantityOffer,
  deleteQuantityOffer,
  getQuantityOffer,
  listQuantityOffers,
  updateQuantityOffer,
} from "@/lib/api/quantity-offers";
import type { QuantityOfferDraft } from "@/lib/schemas/quantity-offer";
import { notify } from "@/lib/notify";

export function useQuantityOffers() {
  return useQuery({
    queryKey: ["offers", "quantity"],
    queryFn: listQuantityOffers,
  });
}

export function useQuantityOffer(id: number | null) {
  return useQuery({
    queryKey: ["offers", "quantity", id],
    queryFn: () => getQuantityOffer(id as number),
    enabled: id !== null,
    refetchOnWindowFocus: false,
  });
}

export function useCreateQuantityOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: QuantityOfferDraft) => createQuantityOffer(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success("Quantity offer created");
    },
  });
}

export function useUpdateQuantityOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: number; draft: QuantityOfferDraft }) =>
      updateQuantityOffer(id, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success("Quantity offer updated");
    },
  });
}

export function useDeleteQuantityOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteQuantityOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      notify.success("Quantity offer deleted");
    },
  });
}

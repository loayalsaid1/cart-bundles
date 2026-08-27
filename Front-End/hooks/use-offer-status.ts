"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleOfferStatus } from "@/lib/api/offers";
import type { OfferStatus } from "@/lib/schemas/common-offer";

export function useOfferStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OfferStatus }) =>
      toggleOfferStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["offers", "dashboard"] });
      const previous = qc.getQueriesData<{ id: number; status: OfferStatus }[]>({
        queryKey: ["offers", "dashboard"],
      });
      qc.setQueriesData<{ id: number; status: OfferStatus }[]>(
        { queryKey: ["offers", "dashboard"] },
        (old) =>
          old?.map((offer) =>
            offer.id === id ? { ...offer, status } : offer,
          ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["offers", "dashboard"] });
    },
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createSuggestion, listSuggestions } from "@/lib/api/suggestions";
import { notify } from "@/lib/notify";

export function useSuggestions() {
  return useQuery({
    queryKey: ["suggestions"],
    queryFn: listSuggestions,
  });
}

export function useCreateSuggestion() {
  const qc = useQueryClient();
  const t = useTranslations("Suggestions");
  return useMutation({
    mutationFn: createSuggestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      notify.success(t("notify.created"));
    },
    onError: () => {
      notify.error(t("notify.failed"));
    },
  });
}

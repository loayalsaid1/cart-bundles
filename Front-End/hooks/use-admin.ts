"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  adminLogin,
  adminLogout,
  getAdminActivity,
  getAdminMerchantDetail,
  getAdminMerchants,
  getAdminOverview,
  getAdminSuggestions,
  updateAdminSuggestion,
} from "@/lib/api/admin";
import type { SuggestionStatus } from "@/lib/schemas/suggestions";
import { notify } from "@/lib/notify";

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    retry: false,
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: ["admin", "activity"],
    queryFn: () => getAdminActivity({ limit: 50 }),
    retry: false,
  });
}

export function useAdminMerchants() {
  return useQuery({
    queryKey: ["admin", "merchants"],
    queryFn: getAdminMerchants,
    retry: false,
  });
}

export function useAdminMerchantDetail(merchantId: number | null) {
  return useQuery({
    queryKey: ["admin", "merchant", merchantId],
    queryFn: () => getAdminMerchantDetail(merchantId!),
    enabled: merchantId !== null,
    retry: false,
  });
}

export function useAdminSuggestions(status?: SuggestionStatus) {
  return useQuery({
    queryKey: ["admin", "suggestions", status ?? "all"],
    queryFn: () => getAdminSuggestions(status),
    retry: false,
  });
}

export function useAdminLogin() {
  const qc = useQueryClient();
  const t = useTranslations("Admin");
  return useMutation({
    mutationFn: adminLogin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      notify.success(t("login.success"));
    },
    onError: () => {
      notify.error(t("login.failed"));
    },
  });
}

export function useAdminLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminLogout,
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["admin"] });
    },
  });
}

export function useUpdateAdminSuggestion() {
  const qc = useQueryClient();
  const t = useTranslations("Admin");
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: number;
      status: SuggestionStatus;
      adminNote?: string;
    }) => updateAdminSuggestion(id, { status, adminNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "suggestions"] });
      notify.success(t("suggestions.updated"));
    },
    onError: () => {
      notify.error(t("suggestions.updateFailed"));
    },
  });
}

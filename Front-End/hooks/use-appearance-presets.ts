"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  createAppearancePreset,
  deleteAppearancePreset,
  listAppearancePresets,
  renameAppearancePreset,
} from "@/lib/api/appearance-presets";
import { notify } from "@/lib/notify";

export function useAppearancePresets() {
  return useQuery({
    queryKey: ["appearance-presets"],
    queryFn: listAppearancePresets,
  });
}

export function useCreateAppearancePreset() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: createAppearancePreset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appearance-presets"] });
      notify.success(t("appearance.presetsSaved"));
    },
    onError: () => {
      notify.error(t("appearance.presetsSaveFailed"));
    },
  });
}

export function useDeleteAppearancePreset() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: deleteAppearancePreset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appearance-presets"] });
      notify.success(t("appearance.presetsDeleted"));
    },
    onError: () => {
      notify.error(t("appearance.presetsDeleteFailed"));
    },
  });
}

export function useRenameAppearancePreset() {
  const qc = useQueryClient();
  const t = useTranslations("Offers");
  return useMutation({
    mutationFn: renameAppearancePreset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appearance-presets"] });
      notify.success(t("appearance.presetsRenamed"));
    },
    onError: () => {
      notify.error(t("appearance.presetsRenameFailed"));
    },
  });
}

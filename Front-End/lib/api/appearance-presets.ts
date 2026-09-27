import { z } from "zod";
import { http } from "@/lib/http";
import {
  appearancePresetSchema,
  type AppearancePreset,
  type AppearancePresetKind,
  type AppearanceShadow,
  type TitleAlign,
} from "@/lib/schemas/common-offer";

export async function listAppearancePresets(): Promise<AppearancePreset[]> {
  const data = await http<unknown>("/appearance-presets");
  return z.array(appearancePresetSchema).parse(data);
}

export async function createAppearancePreset(input: {
  name: string;
  kind: AppearancePresetKind;
  colors: Record<string, string>;
  borderRadiusPx?: number;
  titleAlign?: TitleAlign;
  showBorder?: boolean;
  shadow?: AppearanceShadow;
}): Promise<AppearancePreset> {
  const data = await http<unknown>("/appearance-presets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return appearancePresetSchema.parse(data);
}

export async function deleteAppearancePreset(id: number): Promise<void> {
  await http(`/appearance-presets/${id}`, { method: "DELETE" });
}

export async function renameAppearancePreset(input: {
  id: number;
  name: string;
}): Promise<AppearancePreset> {
  const data = await http<unknown>(`/appearance-presets/${input.id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: input.name }),
  });
  return appearancePresetSchema.parse(data);
}

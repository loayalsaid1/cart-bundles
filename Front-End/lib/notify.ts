"use client";

import { toast } from "sonner";
import { SallaSDK } from "@/lib/salla-sdk";

function isEmbedded(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { salla?: unknown }).salla);
}

export const notify = {
  success(message: string) {
    if (isEmbedded()) SallaSDK.notify.success(message);
    else toast.success(message);
  },
  error(message: string) {
    if (isEmbedded()) SallaSDK.notify.error(message);
    else toast.error(message);
  },
  warning(message: string) {
    if (isEmbedded()) SallaSDK.notify.warning(message);
    else toast.warning(message);
  },
};

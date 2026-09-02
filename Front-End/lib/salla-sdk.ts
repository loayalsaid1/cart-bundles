"use client";

import { embedded } from "@salla.sa/embedded-sdk";
import { toast } from "sonner";

export interface ConfirmOptions {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export const SallaSDK = {
  notify: {
    success(message: string) {
      try {
        if (embedded?.ui?.toast?.success) {
          embedded.ui.toast.success(message);
          return;
        }
      } catch (err) {
        console.warn("[SallaSDK.notify.success fallback to sonner]", err);
      }
      toast.success(message);
    },
    error(message: string) {
      try {
        if (embedded?.ui?.toast?.error) {
          embedded.ui.toast.error(message);
          return;
        }
      } catch (err) {
        console.warn("[SallaSDK.notify.error fallback to sonner]", err);
      }
      toast.error(message);
    },
    warning(message: string) {
      try {
        if (embedded?.ui?.toast?.warning) {
          embedded.ui.toast.warning(message);
          return;
        }
      } catch (err) {
        console.warn("[SallaSDK.notify.warning fallback to sonner]", err);
      }
      toast.warning(message);
    },
  },
  async confirm(options: ConfirmOptions): Promise<boolean> {
    try {
      if (embedded?.ui?.confirm) {
        const result = await embedded.ui.confirm({
          title: options.title,
          message: options.text,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          variant: options.variant || "danger",
        });
        return Boolean(result?.confirmed);
      }
    } catch (err) {
      console.warn("[SallaSDK.confirm fallback to window.confirm]", err);
    }
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return window.confirm(`${options.title}\n\n${options.text}`);
    }
    return false;
  },
};

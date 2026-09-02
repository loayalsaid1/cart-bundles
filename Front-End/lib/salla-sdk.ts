"use client";

import { embedded } from "@salla.sa/embedded-sdk";
import { toast } from "sonner";

export interface ConfirmOptions {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
}

export const SallaSDK = {
  notify: {
    success(message: string) {
      try {
        if ((embedded as any).notify?.success) {
          (embedded as any).notify.success(message);
        } else {
          toast.success(message);
        }
      } catch {
        toast.success(message);
      }
    },
    error(message: string) {
      try {
        if ((embedded as any).notify?.error) {
          (embedded as any).notify.error(message);
        } else {
          toast.error(message);
        }
      } catch {
        toast.error(message);
      }
    },
    warning(message: string) {
      try {
        if ((embedded as any).notify?.warning) {
          (embedded as any).notify.warning(message);
        } else {
          toast.warning(message);
        }
      } catch {
        toast.warning(message);
      }
    },
  },
  async confirm(options: ConfirmOptions): Promise<boolean> {
    try {
      if ((embedded as any).confirm) {
        return await (embedded as any).confirm(options);
      }
      return window.confirm(`${options.title}\n\n${options.text}`);
    } catch {
      return window.confirm(`${options.title}\n\n${options.text}`);
    }
  },
};

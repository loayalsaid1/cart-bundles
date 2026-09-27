"use client";

import { SallaSDK } from "@/lib/salla-sdk";
import { toast } from "sonner";

function showToast(type: "success" | "error" | "warning", message: string) {
  if (typeof window !== "undefined" && window.location.pathname.includes("/admin")) {
    toast[type](message);
    return;
  }

  SallaSDK.notify[type](message);
}

export const notify = {
  success(message: string) {
    showToast("success", message);
  },
  error(message: string) {
    showToast("error", message);
  },
  warning(message: string) {
    showToast("warning", message);
  },
};


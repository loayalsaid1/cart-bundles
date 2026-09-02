"use client";

import { SallaSDK } from "@/lib/salla-sdk";

export const notify = {
  success(message: string) {
    SallaSDK.notify.success(message);
  },
  error(message: string) {
    SallaSDK.notify.error(message);
  },
  warning(message: string) {
    SallaSDK.notify.warning(message);
  },
};


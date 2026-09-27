"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { ApiError } from "@/lib/http";

export function useAdminSessionRedirect() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const redirecting = useRef(false);

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.state.status !== "error") {
        return;
      }

      const { error } = event.query.state;
      const queryKey = event.query.queryKey;
      if (
        !Array.isArray(queryKey) ||
        queryKey[0] !== "admin" ||
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        redirecting.current
      ) {
        return;
      }

      redirecting.current = true;
      void (async () => {
        await queryClient.cancelQueries({ queryKey: ["admin"] });
        queryClient.removeQueries({ queryKey: ["admin"] });
        router.replace("/admin/login");
        router.refresh();
      })();
    });
  }, [queryClient, router]);
}

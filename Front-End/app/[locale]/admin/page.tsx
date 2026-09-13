"use client";

import ReactQueryProvider from "@/app/react-query-providers";
import { AdminConsole } from "@/components/admin/admin-console";
import { Toaster } from "@/components/ui/sonner";

export default function AdminPage() {
  return (
    <ReactQueryProvider>
      <AdminConsole />
      <Toaster position="bottom-right" />
    </ReactQueryProvider>
  );
}

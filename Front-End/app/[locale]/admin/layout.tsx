import React from "react";
import ReactQueryProvider from "@/app/react-query-providers";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactQueryProvider>
      {children}
      <Toaster position="bottom-right" />
    </ReactQueryProvider>
  );
}

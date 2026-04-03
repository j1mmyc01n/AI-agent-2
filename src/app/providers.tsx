"use client";

import { SessionProvider } from "next-auth/react";
import { StorageContextProvider } from "@/lib/storage/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StorageContextProvider>{children}</StorageContextProvider>
    </SessionProvider>
  );
}

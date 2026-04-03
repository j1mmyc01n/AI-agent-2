"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { StorageProvider, StorageMode, StorageStatus } from "./types";
import { LocalStorageProvider } from "./local-provider";

interface StorageContextValue {
  provider: StorageProvider;
  status: StorageStatus;
  mode: StorageMode;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within a StorageContextProvider");
  return ctx;
}

function detectStorageMode(): { mode: StorageMode; connected: boolean } {
  // In the browser, we check if the app reports a remote DB is available
  // The server sets a cookie/header or we check via an API
  // For now, we always start in local mode on the client
  // The server-side pages handle Prisma directly
  return { mode: "local", connected: true };
}

export function StorageContextProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StorageStatus>({
    mode: "local",
    connected: true,
    label: "Local Storage",
    description: "Data stored in your browser. Connect a database for cloud persistence.",
  });

  const [provider] = useState<StorageProvider>(() => new LocalStorageProvider());

  useEffect(() => {
    // Check if the server has a DB configured
    fetch("/api/storage/status")
      .then((r) => r.json())
      .then((data: { hasDatabase: boolean; mode: StorageMode }) => {
        if (data.hasDatabase) {
          setStatus({
            mode: "remote",
            connected: true,
            label: "Cloud Database",
            description: "Data synced to your cloud database.",
          });
        }
      })
      .catch(() => {
        // Stay in local mode
      });
  }, []);

  const { mode } = detectStorageMode();

  return (
    <StorageContext.Provider value={{ provider, status, mode }}>
      {children}
    </StorageContext.Provider>
  );
}

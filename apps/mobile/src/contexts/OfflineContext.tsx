/**
 * Offline status + sync context (Sprint 18).
 */
import React, { createContext, useContext } from "react";
import { useOfflineStatus, useOfflineSync } from "../hooks/useOffline";
import { useAuth } from "./AuthContext";

type OfflineContextValue = {
  isOffline: boolean;
  pendingCount: number;
  isSyncing: boolean;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOffline: false,
  pendingCount: 0,
  isSyncing: false,
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { isOffline } = useOfflineStatus();
  const { pendingCount, isSyncing } = useOfflineSync(isLoggedIn);

  return (
    <OfflineContext.Provider value={{ isOffline, pendingCount, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}

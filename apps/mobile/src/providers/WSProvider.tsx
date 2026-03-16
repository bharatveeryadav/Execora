/**
 * WSProvider — connects WebSocket when logged in, disconnects on logout.
 * Wrap app content inside QueryClientProvider.
 */
import React, { useEffect } from "react";
import { wsClient } from "../lib/ws";
import { getApiBaseUrl } from "../lib/api";

const API_BASE = getApiBaseUrl();

export function WSProvider({ children, isLoggedIn }: { children: React.ReactNode; isLoggedIn: boolean }) {
  useEffect(() => {
    if (isLoggedIn) {
      wsClient.connect(API_BASE);
    } else {
      wsClient.disconnect();
    }
    return () => wsClient.disconnect();
  }, [isLoggedIn]);

  return <>{children}</>;
}

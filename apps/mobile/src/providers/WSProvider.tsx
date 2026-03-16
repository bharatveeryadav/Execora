/**
 * WSProvider — connects WebSocket when logged in, disconnects on logout.
 * Wrap app content inside QueryClientProvider.
 */
import React, { useEffect } from "react";
import { wsClient } from "../lib/ws";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3006";

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

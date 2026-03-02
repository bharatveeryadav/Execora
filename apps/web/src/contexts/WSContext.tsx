import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { wsClient } from "@/lib/ws";

interface WSContextValue {
  isConnected: boolean;
  pendingCount: number;
  reconnect: () => void;
}

const WSContext = createContext<WSContextValue>({
  isConnected: false,
  pendingCount: 0,
  reconnect: () => undefined,
});

export function WSProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    wsClient.connect();

    const offs = [
      wsClient.on("__connected__", () => setIsConnected(true)),
      wsClient.on("__disconnected__", () => setIsConnected(false)),
      wsClient.on("pending:update", (msg) => {
        const payload = msg as { count?: number; data?: { count?: number } };
        setPendingCount(payload.data?.count ?? payload.count ?? 0);
      }),
      wsClient.on("invoice:draft", () => {
        setPendingCount((c) => c + 1);
      }),
      wsClient.on("invoice:confirmed", () => {
        setPendingCount((c) => Math.max(0, c - 1));
      }),
    ];

    return () => {
      offs.forEach((off) => off());
    };
  }, []);

  const reconnect = useCallback(() => wsClient.reconnect(), []);

  const value = useMemo<WSContextValue>(
    () => ({ isConnected, pendingCount, reconnect }),
    [isConnected, pendingCount, reconnect]
  );

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

export function useWS() {
  return useContext(WSContext);
}

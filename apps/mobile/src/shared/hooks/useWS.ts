/**
 * useWS — returns isConnected for dashboard live indicator.
 */
import { useState, useEffect } from "react";
import { wsClient } from "../../lib/ws";

export function useWS() {
  const [isConnected, setIsConnected] = useState(wsClient.isConnected);

  useEffect(() => {
    const offConn = wsClient.on("__connected__", () => setIsConnected(true));
    const offDisc = wsClient.on("__disconnected__", () =>
      setIsConnected(false),
    );
    setIsConnected(wsClient.isConnected);
    return () => {
      offConn();
      offDisc();
    };
  }, []);

  return { isConnected };
}

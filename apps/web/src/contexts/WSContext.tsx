import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "@/lib/ws";
import { QK } from "@/hooks/useQueries";

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

/** Map IntentType string → React Query keys to invalidate (matches packages/types IntentType enum) */
function queryKeysForIntent(intent: string): string[][] {
  switch (intent) {
    case "CREATE_INVOICE":
    case "CANCEL_INVOICE":
    case "CONFIRM_INVOICE":
    case "SHOW_PENDING_INVOICE":
    case "SEND_INVOICE":
      return [["invoices"], ["summary"], ["customers"]];

    case "RECORD_PAYMENT":
    case "ADD_CREDIT":
      return [["customers"], ["ledger"], ["summary"], ["invoices"]];

    case "CREATE_CUSTOMER":
    case "UPDATE_CUSTOMER":
    case "UPDATE_CUSTOMER_PHONE":
    case "DELETE_CUSTOMER_DATA":
    case "CHECK_BALANCE":
    case "GET_CUSTOMER_INFO":
    case "LIST_CUSTOMER_BALANCES":
    case "TOTAL_PENDING_AMOUNT":
      return [["customers"]];

    case "CHECK_STOCK":
      return [["products"]];

    case "CREATE_REMINDER":
    case "CANCEL_REMINDER":
    case "MODIFY_REMINDER":
    case "LIST_REMINDERS":
      return [["reminders"]];

    case "DAILY_SUMMARY":
      return [["summary"]];

    case "ADD_DISCOUNT":
    case "TOGGLE_GST":
    case "SET_SUPPLY_TYPE":
      return [["invoices"], ["summary"]];

    case "RECORD_MIXED_PAYMENT":
      return [["customers"], ["ledger"], ["summary"], ["invoices"]];

    case "EXPORT_GSTR1":
      return [["reports", "gstr1"]];

    case "EXPORT_PNL":
      return [["reports", "pnl"]];

    default:
      // UNKNOWN or any unrecognised intent — refresh all data panels
      return [["invoices"], ["customers"], ["products"], ["summary"], ["reminders"]];
  }
}

export function WSProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    wsClient.connect();

    const offs = [
      wsClient.on("__connected__", () => setIsConnected(true)),
      wsClient.on("__disconnected__", () => setIsConnected(false)),

      // ── Bell-badge pending count ────────────────────────────────────────
      wsClient.on("pending:update", (msg) => {
        const payload = msg as { count?: number; data?: { count?: number } };
        setPendingCount(payload.data?.count ?? payload.count ?? 0);
      }),

      // invoice:draft / invoice:confirmed: update badge AND invalidate caches
      wsClient.on("invoice:draft", () => {
        setPendingCount((c) => c + 1);
        qc.invalidateQueries({ queryKey: ["invoices"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
      }),
      wsClient.on("invoice:confirmed", () => {
        setPendingCount((c) => Math.max(0, c - 1));
        qc.invalidateQueries({ queryKey: ["invoices"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
        qc.invalidateQueries({ queryKey: ["customers"] });
      }),

      // ── Voice command completed — refresh whatever the AI changed ───────
      // Backend sends voice:response with { text, intent, executionResult }.
      // `intent` is the IntentType string e.g. "CREATE_INVOICE".
      wsClient.on("voice:response", (payload) => {
        const p = payload as { intent?: string; executionResult?: { intent?: string } };
        // intent may be top-level (new) or inside executionResult (fallback)
        const intent = p.intent ?? p.executionResult?.intent ?? "";
        queryKeysForIntent(intent).forEach((key) =>
          qc.invalidateQueries({ queryKey: key })
        );
      }),

      // ── Generic server-push data events (for future backend emits) ──────
      wsClient.on("customer:updated", () => {
        qc.invalidateQueries({ queryKey: ["customers"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
      }),
      wsClient.on("product:updated", () => {
        qc.invalidateQueries({ queryKey: ["products"] });
        // Also refresh low-stock panel so resolved alerts disappear immediately
        qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
      }),
      wsClient.on("product:created", () => {
        qc.invalidateQueries({ queryKey: QK.products });
        qc.invalidateQueries({ queryKey: QK.lowStock });
      }),
      wsClient.on("user:created", () => {
        qc.invalidateQueries({ queryKey: QK.users });
      }),
      wsClient.on("payment:recorded", () => {
        qc.invalidateQueries({ queryKey: ["customers"] });
        qc.invalidateQueries({ queryKey: ["ledger"] });
        qc.invalidateQueries({ queryKey: ["summary"] });
        // Payment auto-marks invoices paid — refresh invoice list too
        qc.invalidateQueries({ queryKey: ["invoices"] });
      }),
      wsClient.on("reminder:created", () => {
        qc.invalidateQueries({ queryKey: ["reminders"] });
      }),
    ];

    return () => {
      offs.forEach((off) => off());
    };
  }, [qc]);

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

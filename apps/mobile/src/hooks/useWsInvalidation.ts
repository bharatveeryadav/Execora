/**
 * useWsInvalidation — subscribe to WS events and invalidate React Query caches.
 * Usage: useWsInvalidation(['invoices', 'customers', 'summary']);
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../lib/ws";

export const WS_EVENT_QUERIES: Record<string, string[][]> = {
  "invoice:created": [["invoices"], ["summary"], ["customers"]],
  "invoice:confirmed": [["invoices"], ["summary"], ["customers"]],
  "invoice:updated": [["invoices"]],
  "invoice:cancelled": [["invoices"], ["summary"], ["customers"]],
  "payment:recorded": [["customers"], ["summary"], ["ledger"], ["cashbook"], ["invoices"]],
  "customer:created": [["customers"], ["summary"]],
  "customer:deleted": [["customers"], ["summary"]],
  "customer:updated": [["customers"]],
  "reminder:created": [["reminders"]],
  "reminder:cancelled": [["reminders"]],
  "reminders:updated": [["reminders"]],
  "stock:updated": [["products"], ["lowStock"]],
  "product:created": [["products"], ["lowStock"]],
  "product:updated": [["products"], ["lowStock"]],
  "expense:created": [["expenses"], ["incomes"], ["cashbook"]],
  "expense:deleted": [["expenses"], ["incomes"], ["cashbook"]],
  "purchase:created": [["purchases"], ["cashbook"]],
  "purchase:deleted": [["purchases"], ["cashbook"]],
  "draft:created": [["drafts"]],
  "draft:updated": [["drafts"]],
  "draft:confirmed": [["drafts"], ["purchases"], ["products"], ["expenses"]],
  "draft:discarded": [["drafts"]],
  "monitoring:event": [["monitoring"]],
  "monitoring:snap": [["monitoring"]],
};

export function useWsInvalidation(scopes: string[] | "all" = "all") {
  const qc = useQueryClient();

  useEffect(() => {
    const handlers: Array<() => void> = [];

    for (const [event, keys] of Object.entries(WS_EVENT_QUERIES)) {
      if (scopes !== "all") {
        const relevant = keys.some((k) => scopes.includes(k[0]));
        if (!relevant) continue;
      }

      const off = wsClient.on(event, () => {
        for (const key of keys) {
          qc.invalidateQueries({ queryKey: key });
        }
      });
      handlers.push(off);
    }

    return () => handlers.forEach((off) => off());
  }, [qc]);
}

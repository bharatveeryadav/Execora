/**
 * Offline status + sync (Sprint 18).
 */
import { useEffect, useState, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { invoiceApi, customerApi } from "../lib/api";
import {
  getQueuedInvoices,
  removeFromQueue,
  cacheProducts,
  cacheCustomers,
} from "../lib/offlineQueue";

export function useOfflineStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected ?? true));
    });
    return () => unsub();
  }, []);

  return { isOffline };
}

export function useOfflineSync(isLoggedIn: boolean): {
  pendingCount: number;
  isSyncing: boolean;
} {
  const qc = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    const queue = getQueuedInvoices();
    if (queue.length === 0) return;

    setIsSyncing(true);
    for (const item of queue) {
      try {
        let customerId = item.payload.customerId;
        if (customerId === "offline-walkin") {
          const { customers } = await customerApi.search("Walk-in", 5);
          const existing = customers.find((c: { name: string }) =>
            /walk\s*-?\s*in/i.test(c.name),
          );
          const walkIn = existing
            ? existing
            : (await customerApi.create({ name: "Walk-in Customer" })).customer;
          customerId = walkIn.id;
        }
        await invoiceApi.create({
          ...item.payload,
          customerId,
        });
        removeFromQueue(item.id);
      } catch {
        break;
      }
    }
    setPendingCount(getQueuedInvoices().length);
    void qc.invalidateQueries({ queryKey: ["invoices"] });
    void qc.invalidateQueries({ queryKey: ["customers"] });
    setIsSyncing(false);
  }, [qc]);

  useEffect(() => {
    if (!isLoggedIn) return;

    setPendingCount(getQueuedInvoices().length);

    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void sync();
      }
      setPendingCount(getQueuedInvoices().length);
    });

    return () => unsub();
  }, [isLoggedIn, sync]);

  return { pendingCount, isSyncing };
}


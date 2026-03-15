/**
 * OfflineBanner — shows "Offline — X queued" when offline (S11-06).
 * Replays queued requests when back online.
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, CloudUpload } from "lucide-react";
import {
  getOutboxCount,
  replayOutbox,
  OUTBOX_UPDATED_EVENT,
} from "@/lib/offline-outbox";

export function OfflineBanner() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [queuedCount, setQueuedCount] = useState(0);
  const [replaying, setReplaying] = useState(false);

  const refreshCount = async () => {
    try {
      const n = await getOutboxCount();
      setQueuedCount(n);
    } catch {
      setQueuedCount(0);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReplaying(true);
      replayOutbox()
        .then(({ sent }) => {
          if (sent > 0) {
            queryClient.invalidateQueries();
          }
        })
        .finally(() => {
          setReplaying(false);
          refreshCount();
        });
    };

    const handleOffline = () => setIsOnline(false);

    const handleOutboxUpdated = () => refreshCount();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OUTBOX_UPDATED_EVENT, handleOutboxUpdated);

    refreshCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OUTBOX_UPDATED_EVENT, handleOutboxUpdated);
    };
  }, [queryClient]);

  if (isOnline && queuedCount === 0) return null;

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200"
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            Offline — {queuedCount} action{queuedCount !== 1 ? "s" : ""} queued
          </span>
        </>
      ) : replaying ? (
        <>
          <CloudUpload className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Syncing queued actions…</span>
        </>
      ) : queuedCount > 0 ? (
        <>
          <CloudUpload className="h-4 w-4 shrink-0" />
          <span>{queuedCount} pending — will sync when online</span>
        </>
      ) : null}
    </div>
  );
}

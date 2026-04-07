/**
 * sales/pos/offline/sync-replay
 *
 * Feature: offline queue replay — replay buffered POS transactions when connectivity returns.
 */
export interface OfflineQueueEntry {
  id: string;
  tenantId: string;
  operation: string;
  payload: unknown;
  createdAt: string;
  retries: number;
}

export async function getOfflineQueue(
  _tenantId: string,
): Promise<OfflineQueueEntry[]> {
  return [];
}

export async function enqueueOfflineOp(
  _tenantId: string,
  _operation: string,
  _payload: unknown,
): Promise<OfflineQueueEntry> {
  throw new Error("Not implemented");
}

export async function replayOfflineQueue(_tenantId: string): Promise<{
  replayed: number;
  failed: number;
}> {
  return { replayed: 0, failed: 0 };
}

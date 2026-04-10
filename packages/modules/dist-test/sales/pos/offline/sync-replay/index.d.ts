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
export declare function getOfflineQueue(_tenantId: string): Promise<OfflineQueueEntry[]>;
export declare function enqueueOfflineOp(_tenantId: string, _operation: string, _payload: unknown): Promise<OfflineQueueEntry>;
export declare function replayOfflineQueue(_tenantId: string): Promise<{
    replayed: number;
    failed: number;
}>;
//# sourceMappingURL=index.d.ts.map
/**
 * platform/offline-sync
 *
 * Feature: offline-first sync — queue local mutations when offline, replay on reconnect.
 * Architecture: client queues ops in IndexedDB; server merges via CRDT / OT.
 * Stub — server-side sync endpoint spec TBD (⏳).
 */
export type SyncOpType = "create" | "update" | "delete";
export interface SyncOp {
    id: string;
    tenantId: string;
    entity: string;
    entityId: string;
    op: SyncOpType;
    payload: Record<string, unknown>;
    clientTimestamp: Date;
    serverVersion?: number;
}
export declare function replaySyncOps(_tenantId: string, _ops: SyncOp[]): Promise<{
    applied: number;
    conflicts: number;
}>;
//# sourceMappingURL=index.d.ts.map
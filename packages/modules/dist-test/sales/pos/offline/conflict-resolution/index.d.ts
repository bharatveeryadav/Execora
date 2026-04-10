/**
 * sales/pos/offline/conflict-resolution
 *
 * Feature: conflict resolution for offline data — last-write-wins, merge strategies.
 */
export type ConflictStrategy = "last-write-wins" | "server-wins" | "client-wins" | "manual";
export interface ConflictRecord {
    entityType: string;
    entityId: string;
    serverValue: unknown;
    clientValue: unknown;
    detectedAt: string;
    resolved: boolean;
    resolution?: ConflictStrategy;
}
export declare function listConflicts(_tenantId: string): Promise<ConflictRecord[]>;
export declare function resolveConflict(_conflictId: string, _strategy: ConflictStrategy): Promise<void>;
//# sourceMappingURL=index.d.ts.map
/**
 * system/audit/tamper-detection
 *
 * Feature: hash-chain integrity for audit logs — detect unauthorized modifications.
 */
export interface AuditChainEntry {
    id: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    payload: string;
    hash: string;
    previousHash: string;
    createdAt: string;
}
export declare function appendAuditEntry(_tenantId: string, _entityType: string, _entityId: string, _payload: Record<string, unknown>): Promise<AuditChainEntry>;
export declare function verifyChainIntegrity(_tenantId: string, _entityType: string): Promise<{
    valid: boolean;
    firstInvalidId?: string;
}>;
export declare function listAuditChain(_tenantId: string, _entityType: string, _entityId?: string): Promise<AuditChainEntry[]>;
//# sourceMappingURL=index.d.ts.map
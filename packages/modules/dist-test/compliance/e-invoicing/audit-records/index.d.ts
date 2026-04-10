/**
 * compliance/e-invoicing/audit-records
 *
 * Feature: read-only log of all IRN events (generation, cancellation).
 * Stub — will read from audit_log table when populated (⏳).
 */
export interface IrnAuditRecord {
    id: string;
    tenantId: string;
    invoiceId: string;
    irn: string;
    event: "generated" | "cancelled" | "amended";
    timestamp: Date;
    meta?: Record<string, unknown>;
}
export declare function listIrnAuditRecords(_tenantId: string, _invoiceId?: string): Promise<IrnAuditRecord[]>;
//# sourceMappingURL=index.d.ts.map
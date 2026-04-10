/**
 * system/audit
 *
 * Feature: immutable audit log — who did what, when, on which entity.
 * All write operations (invoice, payment, user updates) shadow-log here.
 * Stub — audit_log table required in schema (⏳).
 */
export type AuditAction = "create" | "update" | "delete" | "view" | "login" | "logout" | "export" | "import" | "admin_action";
export interface AuditLogEntry {
    id: string;
    tenantId: string;
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export declare function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void>;
export declare function queryAuditLog(tenantId: string, _filter?: {
    entity?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
}): Promise<AuditLogEntry[]>;
//# sourceMappingURL=index.d.ts.map
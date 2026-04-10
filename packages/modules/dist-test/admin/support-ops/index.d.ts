/**
 * admin/support-ops
 *
 * Feature: platform support operations — impersonate tenant, reset passwords,
 * view audit logs, run data fixes.
 * All operations require platform admin auth (x-admin-api-key).
 */
export interface SupportImpersonationToken {
    token: string;
    tenantId: string;
    expiresAt: Date;
    issuedBy: string;
}
export declare function issueImpersonationToken(_tenantId: string, _adminId: string, _durationMinutes?: number): Promise<SupportImpersonationToken>;
export declare function triggerPasswordReset(_userId: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
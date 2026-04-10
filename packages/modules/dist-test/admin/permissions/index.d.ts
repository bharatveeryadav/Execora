/**
 * admin/permissions
 *
 * Feature: fine-grained permission overrides per user above the role baseline.
 * Stub — override table not yet in schema (⏳).
 */
export interface PermissionOverride {
    userId: string;
    tenantId: string;
    permission: string;
    granted: boolean;
    grantedBy: string;
    expiresAt?: Date;
}
export declare function getUserPermissions(_userId: string, _tenantId: string): Promise<PermissionOverride[]>;
export declare function grantPermission(override: Omit<PermissionOverride, "granted"> & {
    granted: true;
}): Promise<boolean>;
export declare function revokePermission(_userId: string, _tenantId: string, _permission: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
/**
 * admin/tenants
 *
 * Feature: tenant (business account) management — list, create, suspend, delete.
 * Used by platform admins only (x-admin-api-key).
 */
export interface TenantRecord {
    id: string;
    name: string;
    gstin?: string;
    plan: string;
    status: "active" | "suspended" | "deleted";
    ownerId: string;
    createdAt: Date;
    lastActiveAt?: Date;
}
export declare function listTenants(_page?: number, _limit?: number): Promise<TenantRecord[]>;
export declare function getTenantById(_id: string): Promise<TenantRecord | null>;
export declare function suspendTenant(_id: string, _reason: string): Promise<boolean>;
export declare function unsuspendTenant(_id: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
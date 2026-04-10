/**
 * admin/roles
 *
 * Feature: role management — owner > admin > manager > staff > viewer hierarchy.
 * Roles map directly to permission sets.
 */
export declare const ROLE_HIERARCHY: readonly ["owner", "admin", "manager", "staff", "viewer"];
export type Role = typeof ROLE_HIERARCHY[number];
export interface RolePermissions {
    role: Role;
    canCreateInvoice: boolean;
    canVoidInvoice: boolean;
    canViewReports: boolean;
    canManageProducts: boolean;
    canManageCustomers: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canAccessAdmin: boolean;
}
export declare const ROLE_PERMISSIONS: Record<Role, RolePermissions>;
export declare function hasPermission(role: Role, permission: keyof Omit<RolePermissions, "role">): boolean;
export declare function isRoleAtLeast(userRole: Role, minimumRole: Role): boolean;
//# sourceMappingURL=index.d.ts.map
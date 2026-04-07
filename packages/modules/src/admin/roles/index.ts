/**
 * admin/roles
 *
 * Feature: role management — owner > admin > manager > staff > viewer hierarchy.
 * Roles map directly to permission sets.
 */
export const ROLE_HIERARCHY = ["owner", "admin", "manager", "staff", "viewer"] as const;
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
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  owner:   { role: "owner",   canCreateInvoice: true,  canVoidInvoice: true,  canViewReports: true,  canManageProducts: true,  canManageCustomers: true,  canManageUsers: true,  canManageSettings: true,  canAccessAdmin: true  },
  admin:   { role: "admin",   canCreateInvoice: true,  canVoidInvoice: true,  canViewReports: true,  canManageProducts: true,  canManageCustomers: true,  canManageUsers: true,  canManageSettings: true,  canAccessAdmin: false },
  manager: { role: "manager", canCreateInvoice: true,  canVoidInvoice: true,  canViewReports: true,  canManageProducts: true,  canManageCustomers: true,  canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
  staff:   { role: "staff",   canCreateInvoice: true,  canVoidInvoice: false, canViewReports: false, canManageProducts: false, canManageCustomers: false, canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
  viewer:  { role: "viewer",  canCreateInvoice: false, canVoidInvoice: false, canViewReports: true,  canManageProducts: false, canManageCustomers: false, canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
};
export function hasPermission(role: Role, permission: keyof Omit<RolePermissions, "role">): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
export function isRoleAtLeast(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) <= ROLE_HIERARCHY.indexOf(minimumRole);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ROLE_HIERARCHY = void 0;
exports.hasPermission = hasPermission;
exports.isRoleAtLeast = isRoleAtLeast;
/**
 * admin/roles
 *
 * Feature: role management — owner > admin > manager > staff > viewer hierarchy.
 * Roles map directly to permission sets.
 */
exports.ROLE_HIERARCHY = ["owner", "admin", "manager", "staff", "viewer"];
exports.ROLE_PERMISSIONS = {
    owner: { role: "owner", canCreateInvoice: true, canVoidInvoice: true, canViewReports: true, canManageProducts: true, canManageCustomers: true, canManageUsers: true, canManageSettings: true, canAccessAdmin: true },
    admin: { role: "admin", canCreateInvoice: true, canVoidInvoice: true, canViewReports: true, canManageProducts: true, canManageCustomers: true, canManageUsers: true, canManageSettings: true, canAccessAdmin: false },
    manager: { role: "manager", canCreateInvoice: true, canVoidInvoice: true, canViewReports: true, canManageProducts: true, canManageCustomers: true, canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
    staff: { role: "staff", canCreateInvoice: true, canVoidInvoice: false, canViewReports: false, canManageProducts: false, canManageCustomers: false, canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
    viewer: { role: "viewer", canCreateInvoice: false, canVoidInvoice: false, canViewReports: true, canManageProducts: false, canManageCustomers: false, canManageUsers: false, canManageSettings: false, canAccessAdmin: false },
};
function hasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role][permission];
}
function isRoleAtLeast(userRole, minimumRole) {
    return exports.ROLE_HIERARCHY.indexOf(userRole) <= exports.ROLE_HIERARCHY.indexOf(minimumRole);
}
//# sourceMappingURL=index.js.map
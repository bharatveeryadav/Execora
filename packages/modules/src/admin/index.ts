/**
 * admin/index.ts
 *
 * Admin domain — user lifecycle, roles, permissions, tenant management, support ops.
 * All exports require platform-level admin authentication.
 */
export * from "./users";
export * from "./users/device-sessions";
export * from "./roles";
export * from "./permissions";
export * from "./tenants";
export * from "./tenants/branch-management";
export * from "./support-ops";

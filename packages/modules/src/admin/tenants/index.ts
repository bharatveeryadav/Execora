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
export async function listTenants(_page = 1, _limit = 50): Promise<TenantRecord[]> {
  return [];
}
export async function getTenantById(_id: string): Promise<TenantRecord | null> {
  return null;
}
export async function suspendTenant(_id: string, _reason: string): Promise<boolean> {
  return false;
}
export async function unsuspendTenant(_id: string): Promise<boolean> {
  return false;
}

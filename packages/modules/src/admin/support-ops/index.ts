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
export async function issueImpersonationToken(
  _tenantId: string,
  _adminId: string,
  _durationMinutes = 30
): Promise<SupportImpersonationToken> {
  return {
    token: "",
    tenantId: _tenantId,
    expiresAt: new Date(Date.now() + _durationMinutes * 60_000),
    issuedBy: _adminId,
  };
}
export async function triggerPasswordReset(_userId: string): Promise<boolean> {
  return false;
}

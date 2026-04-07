/**
 * admin/users
 *
 * Feature: user lifecycle — invite, activate, deactivate, delete.
 * Source: platform auth layer + Prisma user/staff tables.
 * Stub — full multi-staff management is planned (⏳).
 */
export interface StaffUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  role: "owner" | "admin" | "manager" | "staff" | "viewer";
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}
export interface InviteUserInput {
  tenantId: string;
  email: string;
  name: string;
  role: StaffUser["role"];
  invitedBy: string;
}
export async function listStaffUsers(_tenantId: string): Promise<StaffUser[]> {
  return [];
}
export async function inviteUser(_input: InviteUserInput): Promise<{ inviteLink: string }> {
  return { inviteLink: "" };
}
export async function deactivateUser(_userId: string, _tenantId: string): Promise<boolean> {
  return false;
}
export async function deleteUser(_userId: string, _tenantId: string): Promise<boolean> {
  return false;
}

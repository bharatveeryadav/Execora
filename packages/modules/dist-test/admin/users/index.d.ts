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
export declare function listStaffUsers(_tenantId: string): Promise<StaffUser[]>;
export declare function inviteUser(_input: InviteUserInput): Promise<{
    inviteLink: string;
}>;
export declare function deactivateUser(_userId: string, _tenantId: string): Promise<boolean>;
export declare function deleteUser(_userId: string, _tenantId: string): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map
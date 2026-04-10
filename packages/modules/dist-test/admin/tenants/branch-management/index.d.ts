/**
 * admin/tenants/branch-management
 *
 * Feature: multi-branch CRUD — create, list, update branches per tenant.
 */
export interface Branch {
    id: string;
    tenantId: string;
    name: string;
    gstin?: string;
    address?: string;
    phone?: string;
    active: boolean;
    createdAt: string;
}
export declare function listBranches(_tenantId: string): Promise<Branch[]>;
export declare function createBranch(_tenantId: string, _input: Omit<Branch, "id" | "tenantId" | "createdAt">): Promise<Branch>;
export declare function updateBranch(_branchId: string, _input: Partial<Pick<Branch, "name" | "gstin" | "address" | "phone" | "active">>): Promise<Branch>;
export declare function deleteBranch(_branchId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map
import type { CreateSupplierInput, SupplierRecord } from "./types";
export declare function listSuppliers(tenantId: string, q?: string, limit?: number): Promise<SupplierRecord[]>;
export declare function getSupplierById(tenantId: string, supplierId: string): Promise<SupplierRecord | null>;
export declare function createSupplier(tenantId: string, input: CreateSupplierInput): Promise<SupplierRecord>;
export type { CreateSupplierInput, ListSuppliersInput, SupplierRecord, } from "./types";
//# sourceMappingURL=supplier-profile.d.ts.map
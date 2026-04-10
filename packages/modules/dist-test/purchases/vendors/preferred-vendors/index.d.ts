/**
 * purchases/vendors/preferred-vendors
 *
 * Feature: preferred vendor tagging — mark preferred vendors for auto-PO suggestions.
 */
export interface PreferredVendor {
    vendorId: string;
    productId: string;
    priority: number;
    leadTimeDays: number;
    minOrderQty?: number;
}
export declare function listPreferredVendors(_tenantId: string, _productId?: string): Promise<PreferredVendor[]>;
export declare function setPreferredVendor(_tenantId: string, _entry: PreferredVendor): Promise<PreferredVendor>;
//# sourceMappingURL=index.d.ts.map
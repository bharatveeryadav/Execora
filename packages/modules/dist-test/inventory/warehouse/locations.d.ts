/**
 * inventory/warehouse/locations
 *
 * Feature: multi-location warehouse — aisles, bins, shelf positions.
 * Stub — requires warehouse_location table in schema (⏳).
 */
export interface WarehouseLocation {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    zone?: string;
    aisle?: string;
    bin?: string;
    parentLocationId?: string;
}
export declare function listWarehouseLocations(_tenantId: string): Promise<WarehouseLocation[]>;
export declare function createWarehouseLocation(input: Omit<WarehouseLocation, "id">): Promise<WarehouseLocation>;
//# sourceMappingURL=locations.d.ts.map
/**
 * inventory/warehouse/location-policy
 *
 * Feature: capacity limits, product-category routing, FIFO/FEFO rules per location.
 * Stub (⏳).
 */
export interface LocationPolicy {
    locationId: string;
    maxCapacity?: number;
    unit?: string;
    preferredCategories?: string[];
    pickingMethod?: "fifo" | "fefo" | "lifo";
}
export declare function getLocationPolicy(_locationId: string): Promise<LocationPolicy | null>;
export declare function setLocationPolicy(policy: LocationPolicy): Promise<boolean>;
//# sourceMappingURL=location-policy.d.ts.map
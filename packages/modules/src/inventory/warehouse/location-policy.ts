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
export async function getLocationPolicy(_locationId: string): Promise<LocationPolicy | null> {
  return null;
}
export async function setLocationPolicy(policy: LocationPolicy): Promise<boolean> {
  return true;
}

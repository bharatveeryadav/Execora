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
export async function listWarehouseLocations(_tenantId: string): Promise<WarehouseLocation[]> {
  return [];
}
export async function createWarehouseLocation(
  input: Omit<WarehouseLocation, "id">
): Promise<WarehouseLocation> {
  return { ...input, id: `WL-${Date.now()}` };
}

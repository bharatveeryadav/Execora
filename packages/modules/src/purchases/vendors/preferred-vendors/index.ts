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

export async function listPreferredVendors(
  _tenantId: string,
  _productId?: string,
): Promise<PreferredVendor[]> {
  return [];
}

export async function setPreferredVendor(
  _tenantId: string,
  _entry: PreferredVendor,
): Promise<PreferredVendor> {
  throw new Error("Not implemented");
}

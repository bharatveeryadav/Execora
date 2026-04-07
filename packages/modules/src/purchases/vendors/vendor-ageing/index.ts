/**
 * purchases/vendors/vendor-ageing
 *
 * Feature: vendor payable ageing — outstanding dues broken into 0-30/31-60/60-90/90+ buckets.
 */
export interface VendorAgeingRow {
  vendorId: string;
  vendorName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export async function getVendorAgeing(
  _tenantId: string,
): Promise<VendorAgeingRow[]> {
  return [];
}

/**
 * reporting/inventory-reports/ageing
 *
 * Feature: inventory ageing — days since last movement per product (dead-stock detection).
 */
export interface InventoryAgeingRow {
  productId: string;
  productName: string;
  currentQty: number;
  lastMovementDate?: string;
  daysSinceMovement: number;
  ageCategory: "0-30" | "31-60" | "61-90" | "90+";
  estimatedValue: number;
}

export async function getInventoryAgeingReport(
  _tenantId: string,
): Promise<InventoryAgeingRow[]> {
  return [];
}

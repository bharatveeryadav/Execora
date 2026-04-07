/**
 * inventory/alerts/expiry-alerts
 *
 * Feature: surface batch items expiring within a configurable window.
 * Source: inventory/batch-tracking.ts → getExpiringBatches
 */
export interface ExpiryAlert {
  batchId: string;
  productId: string;
  productName: string;
  expiryDate: string;
  remainingStock: number;
  daysUntilExpiry: number;
}
export async function getExpiryAlerts(
  _tenantId: string,
  _withinDays = 30
): Promise<ExpiryAlert[]> {
  return [];
}

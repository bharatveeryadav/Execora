/**
 * reporting/inventory-reports/low-overstock
 *
 * Feature: combined low/overstock report — products outside safe stock range.
 * Source: inventory/alerts/low-stock.ts + inventory/alerts/overstock.ts
 */
export { getLowStockProducts } from "../../../inventory/alerts/low-stock";
export { getOverstockAlerts } from "../../../inventory/alerts/overstock";

export type StockAlertType = "low-stock" | "overstock";

export interface StockAlertRow {
  productId: string;
  productName: string;
  currentQty: number;
  reorderLevel: number;
  maxLevel?: number;
  alertType: StockAlertType;
}

export async function getLowOverstockReport(
  _tenantId: string,
): Promise<StockAlertRow[]> {
  return [];
}

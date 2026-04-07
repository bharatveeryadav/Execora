/**
 * reporting/sales-reports/item-performance
 *
 * Feature: product-level sales performance — units sold, revenue, margin.
 * Source: gstr1Service.getItemwisePnlReport (available via accounting/gst/gstr1.service)
 */
export { getTopSelling } from "../../../sales/invoice";

export interface ItemSalesEntry {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  rank: number;
}

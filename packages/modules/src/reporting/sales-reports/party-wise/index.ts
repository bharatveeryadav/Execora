/**
 * reporting/sales-reports/party-wise
 *
 * Feature: party-wise sales analysis — top customers by revenue, frequency.
 * Source: sales/invoice.ts → getCustomerInvoices
 */
export { getCustomerInvoices, getLastInvoice } from "../../../sales/invoice";

export interface PartyWiseSalesRow {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPurchaseDate: string;
}

export async function getPartyWiseSalesReport(
  _tenantId: string,
  _dateRange: { from: string; to: string },
): Promise<PartyWiseSalesRow[]> {
  return [];
}

/**
 * reporting/gst-reports/input-credit
 *
 * Feature: input tax credit (ITC) summary — eligible ITC from purchases.
 */
export interface ItcSummaryRow {
  supplierGstin: string;
  supplierName: string;
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  eligible: boolean;
  periodLabel: string;
}

export async function getInputCreditReport(
  _tenantId: string,
  _period: string,
): Promise<ItcSummaryRow[]> {
  return [];
}

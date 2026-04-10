/**
 * sales/billing/tax-calculation
 *
 * Feature: GST rate computation (CGST/SGST/IGST splits) for invoice line items.
 * Owner: sales/billing domain (modules/gst/gst.service is the source of truth)
 * Read path: gstService.computeLineItem, gstService.computeTotals
 */
export * from "./contracts/dto";
export { gstService, GST_SLABS, KIRANA_GST_RATES } from "../../../modules/gst/gst.service";
export type { SupplyType, GstLineItem, GstInvoiceTotals } from "../../../modules/gst/gst.service";
//# sourceMappingURL=index.d.ts.map
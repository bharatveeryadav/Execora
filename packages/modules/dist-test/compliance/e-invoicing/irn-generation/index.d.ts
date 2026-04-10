/**
 * compliance/e-invoicing/irn-generation
 *
 * Feature: GST tax calculation for e-invoice line items (CGST/SGST/IGST splits).
 * Owner: compliance domain
 * Source of truth: modules/gst/gst.service.ts (standalone, no DB calls)
 * Read path: gstService.computeLineItem, gstService.computeTotals
 */
export * from "./contracts/dto";
export { gstService, GST_SLABS, KIRANA_GST_RATES } from "../../../modules/gst/gst.service";
export type { SupplyType, GstLineItem, GstInvoiceTotals } from "../../../modules/gst/gst.service";
//# sourceMappingURL=index.d.ts.map
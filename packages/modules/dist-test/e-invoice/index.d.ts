/**
 * E-Invoice Module
 *
 * Covers: GST rate calculation (CGST/SGST/IGST), supply-type determination,
 * GSTR-1 report generation (B2B, B2CL, B2CS, HSN summary), P&L comparison,
 * Indian financial year helpers, and state-code lookup.
 *
 * Surfaces:
 *  - gstService            → tax calculation singleton
 *  - GST_SLABS / KIRANA_GST_RATES → constant tables
 *  - INDIAN_STATE_CODES    → GSTIN state prefix map
 *  - getIndianFY / indianFYRange   → FY date helpers
 *  - Gstr1* types / PnlReport → report shape interfaces
 */
export * from "../modules/gst/gst.service";
//# sourceMappingURL=index.d.ts.map
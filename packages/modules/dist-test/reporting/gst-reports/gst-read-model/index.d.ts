/**
 * reporting/gst-reports/gst-read-model
 *
 * Feature: GST read model for GSTR-1 return data.
 * READ-ONLY — no mutations.
 * Owner: reporting domain
 * Source of truth: compliance/gst/gstr1 (which wraps accounting/gst/gstr1.service.ts)
 *
 * Read path: gstr1Service.generate() → B2B / B2CL / B2CS / HSN summaries
 * Utilities: getIndianFY, indianFYRange, INDIAN_STATE_CODES
 */
export { gstr1Service, getIndianFY, indianFYRange, INDIAN_STATE_CODES, } from "../../../compliance/gst/gstr1";
//# sourceMappingURL=index.d.ts.map
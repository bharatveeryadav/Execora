/**
 * compliance/gst/gstr1
 *
 * Feature: GSTR-1 outward supply return data (B2B, B2CL, B2CS, HSN).
 * Owner: compliance domain
 * Source of truth: accounting/gst/gstr1.service.ts
 * Read path: gstr1Service.generate, getIndianFY, indianFYRange
 */
export * from "./contracts/dto";
export * from "./contracts/queries";
export {
  gstr1Service,
  getIndianFY,
  indianFYRange,
  INDIAN_STATE_CODES,
} from "../../../accounting/gst/gstr1.service";

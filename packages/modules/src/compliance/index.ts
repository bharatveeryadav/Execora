/**
 * Compliance Domain
 *
 * Covers Indian GST regulatory requirements: GSTR-1 return data generation,
 * e-invoice IRN-ready tax computation, and filing export (PDF).
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - gst: gstr1 (monthly/quarterly filing data), return-export (PDF)
 *  - e-invoicing: irn-generation (GST tax splits for line items)
 *
 * Dependency rule: read-only references to finance and sales data.
 */

// ── GST compliance ────────────────────────────────────────────────────────────
export * from "./gst/gstr1";
export * from "./gst/return-export";

// ── E-invoicing ───────────────────────────────────────────────────────────────
export * from "./e-invoicing/irn-generation";
export * from "./gst/gstr3b";
export * from "./gst/schema-updates";
export * from "./e-invoicing/eligibility";
export * from "./e-invoicing/schema-builder";
export * from "./e-invoicing/irp-submission";
export * from "./e-invoicing/irn-lifecycle";
export * from "./e-invoicing/cancellation";
export * from "./e-invoicing/audit-records";
export * from "./ewaybill/eligibility";
export * from "./ewaybill/payload-builder";
export * from "./ewaybill/generation";
export * from "./ewaybill/status-sync";
export * from "./ewaybill/cancellation";
export * from "./gst/audit";

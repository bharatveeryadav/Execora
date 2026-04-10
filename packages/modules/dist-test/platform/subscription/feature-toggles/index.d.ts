/**
 * platform/subscription/feature-toggles
 *
 * Feature: runtime feature flags — enable/disable features per tenant or globally.
 * Starts as in-memory map; can be backed by DB or LaunchDarkly later.
 */
export type FeatureFlag = "voice_assistant" | "e_invoicing" | "e_waybill" | "multi_warehouse" | "barcode_scanner" | "ecommerce_sync" | "payment_gateway" | "ocr_receipts" | "gstr3b_filing";
export declare function isFeatureEnabled(flag: FeatureFlag, _tenantId?: string): boolean;
export declare function getEnabledFeatures(_tenantId?: string): FeatureFlag[];
//# sourceMappingURL=index.d.ts.map
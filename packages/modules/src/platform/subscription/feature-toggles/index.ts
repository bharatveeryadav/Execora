/**
 * platform/subscription/feature-toggles
 *
 * Feature: runtime feature flags — enable/disable features per tenant or globally.
 * Starts as in-memory map; can be backed by DB or LaunchDarkly later.
 */
export type FeatureFlag =
  | "voice_assistant"
  | "e_invoicing"
  | "e_waybill"
  | "multi_warehouse"
  | "barcode_scanner"
  | "ecommerce_sync"
  | "payment_gateway"
  | "ocr_receipts"
  | "gstr3b_filing";
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  voice_assistant: true,
  e_invoicing: false,
  e_waybill: false,
  multi_warehouse: false,
  barcode_scanner: true,
  ecommerce_sync: false,
  payment_gateway: false,
  ocr_receipts: true,
  gstr3b_filing: false,
};
export function isFeatureEnabled(
  flag: FeatureFlag,
  _tenantId?: string
): boolean {
  return DEFAULT_FLAGS[flag] ?? false;
}
export function getEnabledFeatures(_tenantId?: string): FeatureFlag[] {
  return (Object.keys(DEFAULT_FLAGS) as FeatureFlag[]).filter(f => DEFAULT_FLAGS[f]);
}

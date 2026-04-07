/**
 * platform/product-config
 *
 * Feature: per-tenant product/platform configuration — business name, address,
 * GSTIN, currency, locale, theme.
 */
export interface TenantProductConfig {
  tenantId: string;
  businessName: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  currency: string;
  locale: string;
  timezone: string;
  logoUrl?: string;
  invoicePrefix?: string;
  financialYearStart: "april" | "january";
}
export async function getTenantConfig(_tenantId: string): Promise<TenantProductConfig | null> {
  return null;
}
export async function updateTenantConfig(
  tenantId: string,
  updates: Partial<TenantProductConfig>
): Promise<TenantProductConfig> {
  const defaults: TenantProductConfig = { tenantId, businessName: "My Business", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata", financialYearStart: "april" };
  return { ...defaults, ...updates, tenantId };
}

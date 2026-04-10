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
export declare function getTenantConfig(_tenantId: string): Promise<TenantProductConfig | null>;
export declare function updateTenantConfig(tenantId: string, updates: Partial<TenantProductConfig>): Promise<TenantProductConfig>;
//# sourceMappingURL=index.d.ts.map
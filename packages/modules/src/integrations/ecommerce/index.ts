/**
 * integrations/ecommerce
 *
 * Feature: sync orders / catalogue with e-commerce platforms (Shopify, WooCommerce, etc.)
 * Stub — requires individual platform OAuth credentials (⏳).
 */
export interface EcomOrder {
  platformOrderId: string;
  platform: string;
  customerName: string;
  items: { sku: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
  createdAt: Date;
}
export async function fetchPendingEcomOrders(_tenantId: string): Promise<EcomOrder[]> {
  return [];
}
export async function syncProductCatalogToEcom(
  _tenantId: string,
  _platform: string
): Promise<{ synced: number; errors: number }> {
  return { synced: 0, errors: 0 };
}

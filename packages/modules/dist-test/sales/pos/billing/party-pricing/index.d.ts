/**
 * sales/pos/billing/party-pricing
 *
 * Feature: customer/supplier-specific pricing tiers — contract rates, volume discounts.
 */
export interface PartyPriceTier {
    customerId: string;
    productId: string;
    specialRate: number;
    minQty?: number;
    validUntil?: string;
}
export declare function getPartyPriceTier(_tenantId: string, _customerId: string, _productId: string): Promise<PartyPriceTier | null>;
export declare function upsertPartyPriceTier(_tenantId: string, _tier: Omit<PartyPriceTier, never>): Promise<PartyPriceTier>;
//# sourceMappingURL=index.d.ts.map
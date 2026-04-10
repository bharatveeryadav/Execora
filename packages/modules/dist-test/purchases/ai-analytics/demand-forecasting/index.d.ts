/**
 * purchases/ai-analytics/demand-forecasting
 *
 * Feature: demand forecasting — 30/60/90 day sales projection per product.
 */
export interface DemandForecast {
    productId: string;
    productName: string;
    forecast30Days: number;
    forecast60Days: number;
    forecast90Days: number;
    confidenceScore: number;
    suggestedReorderQty: number;
}
export declare function getDemandForecasts(_tenantId: string): Promise<DemandForecast[]>;
export declare function getProductForecast(_tenantId: string, _productId: string): Promise<DemandForecast | null>;
//# sourceMappingURL=index.d.ts.map
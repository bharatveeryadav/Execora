/**
 * reporting/inventory-reports/fast-slow-movement
 *
 * Feature: classify products as fast-moving / slow-moving based on sales velocity.
 * Source: getTopSelling (sales/invoice.ts) + stock data.
 */
export { getTopSelling } from "../../../sales/invoice";
export interface MovementClass {
    productId: string;
    name: string;
    unitsSold: number;
    category: "fast" | "medium" | "slow" | "dead-stock";
}
export declare function classifyProductMovement(_tenantId: string, _dateRange: {
    from: string;
    to: string;
}): Promise<MovementClass[]>;
//# sourceMappingURL=index.d.ts.map
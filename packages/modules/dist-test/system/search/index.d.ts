/**
 * system/search
 *
 * Feature: full-text / fuzzy search across invoices, products, customers.
 * Source: utils/fuzzy-match.ts for name matching; DB ILIKE for cross-entity.
 */
export { matchIndianName, findBestMatch, findAllMatches, isSamePerson } from "../../utils/fuzzy-match";
export interface GlobalSearchResult {
    entity: "invoice" | "product" | "customer" | "supplier";
    id: string;
    label: string;
    subLabel?: string;
    score: number;
}
export declare function globalSearch(_tenantId: string, _query: string, _limit?: number): Promise<GlobalSearchResult[]>;
//# sourceMappingURL=index.d.ts.map
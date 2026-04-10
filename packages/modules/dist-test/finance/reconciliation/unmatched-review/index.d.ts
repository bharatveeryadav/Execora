/**
 * finance/reconciliation/unmatched-review
 *
 * Feature: manual review of unmatched reconciliation items.
 */
export interface UnmatchedItem {
    id: string;
    tenantId: string;
    source: "bank" | "ledger";
    amount: number;
    date: string;
    description: string;
    status: "pending" | "ignored" | "resolved";
    resolvedAt?: string;
    resolvedBy?: string;
}
export declare function listUnmatchedItems(_tenantId: string): Promise<UnmatchedItem[]>;
export declare function markItemIgnored(_itemId: string): Promise<void>;
export declare function resolveUnmatchedItem(_itemId: string, _resolutionNote: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map
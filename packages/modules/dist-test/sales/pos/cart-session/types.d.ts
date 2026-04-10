export type DraftType = "purchase_entry" | "product" | "stock_adjustment";
export type DraftStatus = "pending" | "confirmed" | "discarded";
export interface CreateDraftInput {
    type: DraftType;
    title?: string;
    data: Record<string, unknown>;
    notes?: string;
}
export interface UpdateDraftInput {
    data?: Record<string, unknown>;
    title?: string;
    notes?: string;
}
export interface ListDraftsInput {
    type?: string;
    status?: string;
    limit?: number;
}
//# sourceMappingURL=types.d.ts.map
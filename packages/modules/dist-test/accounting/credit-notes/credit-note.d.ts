import type { CreateCreditNoteInput, ListCreditNotesInput, CreditNoteRecord } from "./types";
export declare function listCreditNotes(tenantId: string, opts?: ListCreditNotesInput): Promise<CreditNoteRecord[]>;
export declare function getCreditNoteById(tenantId: string, id: string): Promise<CreditNoteRecord | null>;
export declare function createCreditNote(tenantId: string, userId: string, body: CreateCreditNoteInput): Promise<CreditNoteRecord>;
export declare function issueCreditNote(tenantId: string, id: string): Promise<CreditNoteRecord>;
export declare function cancelCreditNote(tenantId: string, id: string, reason?: string): Promise<CreditNoteRecord>;
/** Soft-delete a draft credit note. Throws if not found or already issued. */
export declare function deleteCreditNote(tenantId: string, id: string): Promise<void>;
export type { CreateCreditNoteInput, CreateCreditNoteItemInput, ListCreditNotesInput, CreditNoteRecord, } from "./types";
//# sourceMappingURL=credit-note.d.ts.map
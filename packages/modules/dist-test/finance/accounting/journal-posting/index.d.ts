/**
 * finance/accounting/journal-posting
 *
 * Feature: manual double-entry journal postings.
 * Stub — automated postings already happen on invoice/payment; manual
 * journal is a planned advanced feature (⏳).
 */
export * from "./contracts/commands";
export declare function postJournalEntry(cmd: import("./contracts/commands").PostJournalEntryCommand): Promise<import("./contracts/commands").JournalEntry>;
//# sourceMappingURL=index.d.ts.map
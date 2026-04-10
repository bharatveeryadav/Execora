"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postJournalEntry = postJournalEntry;
/**
 * finance/accounting/journal-posting
 *
 * Feature: manual double-entry journal postings.
 * Stub — automated postings already happen on invoice/payment; manual
 * journal is a planned advanced feature (⏳).
 */
__exportStar(require("./contracts/commands"), exports);
async function postJournalEntry(cmd) {
    const debitTotal = cmd.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const creditTotal = cmd.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(debitTotal - creditTotal) > 0.01)
        throw new Error("Journal entry not balanced");
    return {
        id: `JE-${Date.now()}`,
        tenantId: cmd.tenantId,
        date: cmd.date,
        reference: cmd.reference,
        narration: cmd.narration,
        lines: cmd.lines,
        postedAt: new Date(),
    };
}
//# sourceMappingURL=index.js.map
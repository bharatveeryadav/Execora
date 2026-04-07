/**
 * finance/accounting/journal-posting
 *
 * Feature: manual double-entry journal postings.
 * Stub — automated postings already happen on invoice/payment; manual
 * journal is a planned advanced feature (⏳).
 */
export * from "./contracts/commands";
export async function postJournalEntry(
  cmd: import("./contracts/commands").PostJournalEntryCommand
): Promise<import("./contracts/commands").JournalEntry> {
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

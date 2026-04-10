export interface JournalLine {
    accountCode: string;
    debit?: number;
    credit?: number;
    narration?: string;
}
export interface PostJournalEntryCommand {
    tenantId: string;
    date: string;
    reference?: string;
    narration: string;
    lines: JournalLine[];
}
export interface JournalEntry {
    id: string;
    tenantId: string;
    date: string;
    reference?: string;
    narration: string;
    lines: JournalLine[];
    postedAt: Date;
}
//# sourceMappingURL=commands.d.ts.map
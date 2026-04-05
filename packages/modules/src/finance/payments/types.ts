// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  paymentMode: "cash" | "upi" | "card" | "other";
  notes?: string;
  reference?: string;
  paymentDate?: string; // ISO date string; converted to Date in handler
}

export interface AddCreditInput {
  customerId: string;
  amount: number;
  description: string;
}

// ─── Result shapes ────────────────────────────────────────────────────────────

export type LedgerEntryRecord = Record<string, unknown>;

import { ledgerService } from "../../modules/ledger/ledger.service";
import type { LedgerEntryRecord } from "./types";

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function recordPayment(
  customerId: string,
  amount: number,
  paymentMode: "cash" | "upi" | "card" | "other",
  notes?: string,
  reference?: string,
  paymentDate?: string,
): Promise<LedgerEntryRecord> {
  return ledgerService.recordPayment(
    customerId,
    amount,
    paymentMode,
    notes,
    reference,
    paymentDate ? new Date(paymentDate) : undefined,
  );
}

export async function recordMixedPayment(
  customerId: string,
  splits: Array<{ amount: number; method: "cash" | "upi" | "card" | "other" }>,
  notes?: string,
  reference?: string,
  paymentDate?: string,
): Promise<LedgerEntryRecord> {
  return ledgerService.recordMixedPayment(
    customerId,
    splits,
    notes,
    reference,
    paymentDate ? new Date(paymentDate) : undefined,
  );
}

export async function addCredit(
  customerId: string,
  amount: number,
  description: string,
): Promise<LedgerEntryRecord> {
  return ledgerService.addCredit(customerId, amount, description);
}

export async function reversePayment(
  invoiceId: string,
  amount: number,
): Promise<LedgerEntryRecord> {
  return ledgerService.reversePayment(invoiceId, amount);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCustomerLedger(
  customerId: string,
  limit: number,
): Promise<LedgerEntryRecord[]> {
  return ledgerService.getCustomerLedger(customerId, limit);
}

export async function getLedgerSummary(
  startDate: Date,
  endDate: Date,
): Promise<LedgerEntryRecord> {
  return ledgerService.getLedgerSummary(startDate, endDate);
}

export async function getRecentTransactions(
  limit: number,
): Promise<LedgerEntryRecord[]> {
  return ledgerService.getRecentTransactions(limit);
}

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  RecordPaymentInput,
  AddCreditInput,
  LedgerEntryRecord,
} from "./types";

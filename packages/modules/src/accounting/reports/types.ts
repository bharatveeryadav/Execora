/**
 * Shared type definitions for accounting & financial reports.
 *
 * All monetary values are in the tenant's base currency (INR).
 * All date/datetime strings are ISO-8601.
 */

// ─── Aging Report ────────────────────────────────────────────────────────────

export interface AgingBucket {
  /** Human-readable label, e.g. "0-30 days" */
  label: string;
  /** Inclusive day range [min, max]. max = Infinity for the last bucket. */
  minDays: number;
  maxDays: number;
  count: number;
  amount: number;
}

export interface AgingCustomerRow {
  customerId: string;
  customerName: string;
  phone?: string;
  invoiceCount: number;
  totalDue: number;
  /** ISO date of the oldest unpaid invoice */
  oldestInvoice: string;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket91plus: number;
}

export interface AgingReport {
  /** ISO date-time the report was generated */
  asOf: string;
  totalOutstanding: number;
  customerCount: number;
  buckets: AgingBucket[];
  /** Per-customer breakdown (sorted by totalDue desc) */
  customers: AgingCustomerRow[];
}

// ─── Payment Velocity ─────────────────────────────────────────────────────────

export interface PaymentVelocityRow {
  customerId: string;
  customerName: string;
  phone?: string;
  /** Average calendar days from invoice date to payment received */
  avgDaysToPay: number;
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  totalRevenue: number;
  totalCollected: number;
  /** 0–100 percentage */
  collectionRate: number;
}

export interface PaymentVelocityReport {
  from: string;
  to: string;
  /** Overall average across all customers */
  avgDaysToPay: number;
  /** Sorted by collectionRate ascending (worst payers first) */
  customers: PaymentVelocityRow[];
}

// ─── Day Book (Daily Journal) ─────────────────────────────────────────────────

export type DayBookEntryType =
  | "invoice"
  | "payment"
  | "credit_note"
  | "expense"
  | "purchase";

export interface DayBookEntry {
  id: string;
  /** ISO datetime */
  date: string;
  type: DayBookEntryType;
  description: string;
  /** Customer or supplier name */
  party?: string;
  /** Money going out (expense, refund) */
  debit: number;
  /** Money coming in (payment, invoice) */
  credit: number;
  /** Running cash balance after this entry */
  balance: number;
  /** e.g. invoiceNo, paymentNo, creditNoteNo */
  reference?: string;
}

export interface DayBookReport {
  /** The day this report covers: YYYY-MM-DD */
  date: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  entries: DayBookEntry[];
}

// ─── Account Statement ────────────────────────────────────────────────────────

export type StatementEntryType =
  | "invoice"
  | "payment"
  | "credit_note"
  | "advance"
  | "opening_balance";

export interface StatementEntry {
  id: string;
  /** ISO datetime */
  date: string;
  type: StatementEntryType;
  description: string;
  /** Amount the customer owes (new invoice, debit note) */
  debit: number;
  /** Amount received / credited to customer */
  credit: number;
  /** Running balance — positive means customer still owes */
  balance: number;
  reference?: string;
}

export interface AccountStatement {
  customerId: string;
  customerName: string;
  phone?: string;
  gstin?: string;
  from: string;
  to: string;
  /** Balance owed by customer at start of the period */
  openingBalance: number;
  /** Balance owed by customer at end of the period */
  closingBalance: number;
  entries: StatementEntry[];
  totalInvoiced: number;
  totalPaid: number;
  totalCreditNotes: number;
}

// ─── Outstanding Receivables ──────────────────────────────────────────────────

export interface OutstandingInvoiceRow {
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  phone?: string;
  invoiceDate: string;
  dueAmount: number;
  /** Elapsed calendar days since invoiceDate */
  ageDays: number;
  status: string;
}

export interface OutstandingReceivablesReport {
  asOf: string;
  totalOutstanding: number;
  invoiceCount: number;
  customerCount: number;
  invoices: OutstandingInvoiceRow[];
}

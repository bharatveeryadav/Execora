export interface CashbookEntry {
  id: string;
  type: "in" | "out" | string;
  date: string;
  category?: string;
  note?: string;
  amount: string | number;
}

export interface LedgerEntry {
  id: string;
  type: string;
  description: string;
  amount: string | number;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  balance?: number;
  reconciled?: boolean;
}

export interface TaxReport {
  fy: string;
  b2b: unknown[];
  b2cs: unknown[];
  hsn: unknown[];
}

export interface PnLMonth {
  month: string;
  invoiceCount: number;
  revenue: number;
  discounts: number;
  netRevenue: number;
  taxCollected: number;
  collected: number;
  outstanding: number;
}

export interface PnLReport {
  period: { from: string; to: string };
  months: PnLMonth[];
  totals: PnLMonth & { collectionRate: number };
}

export interface DailySummary {
  totalSales: number;
  totalPayments: number;
  invoiceCount: number;
  pendingAmount: number;
  cashPayments: number;
  upiPayments: number;
}

export interface CashbookSummary {
  entries: CashbookEntry[];
  totalIn: number;
  totalOut: number;
  balance: number;
}

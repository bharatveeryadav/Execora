// ── Shared domain types ───────────────────────────────────────────────────────
// Single source of truth for both apps/web and apps/mobile.

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  balance: number; // positive = owes money; negative = advance credit
  totalPurchases: number;
  totalPayments: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  tenantId?: string;
  name: string;
  price?: number | string;
  unit?: string;
  stock?: number | string;
  category?: string;
  sku?: string;
  hsnCode?: string;
  barcode?: string;
}

export interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice?: number;
  lineDiscountPercent?: number;
  amount?: number;
  hsnCode?: string;
}

export interface Invoice {
  id: string;
  invoiceNo?: string;
  customerId: string;
  customer?: Pick<Customer, "name" | "phone">;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount?: number;
  gstAmount?: number;
  total: number;
  notes?: string;
  status: "draft" | "confirmed" | "paid" | "partial" | "overdue";
  createdAt: string;
  updatedAt: string;
}

// ── Billing screen state types ────────────────────────────────────────────────

export type PaymentMode = "cash" | "upi" | "card" | "credit";

export interface BillingItem {
  id: number;
  name: string;
  qty: string;
  rate: string;
  unit: string;
  discount: string; // percentage per line
  amount: number; // computed
  productId?: string;
  hsnCode?: string;
}

export interface PaymentSplit {
  id: number;
  mode: PaymentMode;
  amount: string;
}

export interface BillingDraft {
  items: BillingItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  withGst: boolean;
  discountPct: string;
  discountFlat: string;
  paymentMode: PaymentMode;
  paymentAmount: string;
  splitEnabled: boolean;
  notes: string;
  buyerGstin: string;
  dueDate: string;
  savedAt: number;
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface PaginatedCustomers {
  customers: Customer[];
  total: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface PaginatedInvoices {
  invoices: Invoice[];
  total: number;
}

export interface CreateInvoicePayload {
  customerId: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice?: number;
    lineDiscountPercent?: number;
    hsnCode?: string;
  }[];
  notes?: string;
  withGst?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  initialPayment?: {
    amount: number;
    method: "cash" | "upi" | "card" | "other";
  };
}

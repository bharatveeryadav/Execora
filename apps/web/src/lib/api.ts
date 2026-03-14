// ── Execora API client ────────────────────────────────────────────────────────
// Fetch-based client that reads JWT from localStorage automatically.

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "execora_token";
const REFRESH_KEY = "execora_refresh";
const AUTH_EXPIRED_EVENT = "execora:auth-expired";

// ── helpers ───────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("execora_user");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthStorage();
      return null;
    }

    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthStorage();
      return null;
    }

    const payload = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
      user?: unknown;
    };

    if (!payload.accessToken || !payload.refreshToken) {
      clearAuthStorage();
      return null;
    }

    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    localStorage.setItem(REFRESH_KEY, payload.refreshToken);
    if (payload.user) {
      localStorage.setItem("execora_user", JSON.stringify(payload.user));
    }

    return payload.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    // Only set Content-Type when there's a body — Fastify 400s on DELETE/GET with Content-Type but no body
    ...(options.body != null ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !retried) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return request<T>(path, options, true);
    }
  }

  if (res.status === 401) {
    clearAuthStorage();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    // Safely extract a string message — body.message may itself be an object
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : body?.message
            ? JSON.stringify(body.message)
            : `Request failed: ${res.status}`;
    const err = new Error(msg);
    // Attach full response body for structured error handling (e.g. CREDIT_LIMIT_EXCEEDED)
    (err as any).body = body;
    throw err;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function formatCurrency(v: number | string = 0): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `₹${(isNaN(n) ? 0 : n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  email?: string;
  nickname?: string | string[];
  landmark?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  notes?: string;
  balance: string | number;
  totalPurchases: string | number;
  totalPayments: string | number;
  creditLimit?: string | number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommPrefs {
  id?: string;
  customerId: string;
  whatsappEnabled: boolean;
  whatsappNumber?: string | null;
  emailEnabled: boolean;
  emailAddress?: string | null;
  smsEnabled: boolean;
  preferredLanguage: string;
  optedOut: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  plan: string;
  status: string;
  features?: Record<string, boolean>;
  gstin?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  currency?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  settings?: Record<string, unknown>;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  permissions: string[];
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  tenantId?: string;
  tenant?: TenantProfile;
  preferences?: Record<string, unknown>;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: string | number;
  unit: string;
  stock: number;
  minStock?: number;
  barcode?: string | null;
  sku?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  unit: string;
  category: string;
  price: string;
  stock: number;
  soldQty: number;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName?: string;
  /** Populated when backend includes the product relation (getRecentInvoices, getInvoiceById) */
  product?: { id: string; name: string; unit?: string };
  quantity: number;
  unitPrice: string | number;
  itemTotal: string | number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customer?: Customer;
  invoiceNo: string;
  status: "draft" | "proforma" | "pending" | "partial" | "paid" | "cancelled";
  subtotal: string | number;
  discount: string | number;
  discountType?: string | null;
  tax: string | number;
  cgst: string | number;
  sgst: string | number;
  igst: string | number;
  total: string | number;
  paidAmount: string | number;
  buyerGstin?: string | null;
  placeOfSupply?: string | null;
  reverseCharge?: boolean;
  notes?: string;
  items?: InvoiceItem[];
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  type: "payment" | "credit" | "invoice";
  amount: string | number;
  description: string;
  method?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  customerId: string;
  customer?: Customer;
  amount: string | number;
  status: "pending" | "sent" | "failed" | "cancelled";
  scheduledTime: string;
  message?: string;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  invoiceCount: number;
  totalSales: number;
  totalPayments: number;
  cashPayments: number;
  upiPayments: number;
  pendingAmount: number;
  extraPayments: number;
}

// ── API methods ───────────────────────────────────────────────────────────────

export interface SummaryRange {
  from: string;
  to: string;
  invoiceCount: number;
  totalSales: number;
  totalPayments: number;
  pendingAmount: number;
  cashPayments: number;
  upiPayments: number;
}

export const summaryApi = {
  daily: (date?: string) =>
    request<{ summary: DailySummary }>(
      `/api/v1/summary/daily${date ? `?date=${date}` : ""}`,
    ),
  range: (from: string, to: string) =>
    request<{ summary: SummaryRange }>(
      `/api/v1/summary/range?from=${from}&to=${to}`,
    ),
};

export const customerApi = {
  // Backend route is /customers/search — NOT /customers?q=
  search: (q = "", limit = 50) =>
    request<{ customers: Customer[] }>(
      `/api/v1/customers/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
  getById: (id: string) =>
    request<{ customer: Customer }>(`/api/v1/customers/${id}`),
  create: (data: {
    name: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
    openingBalance?: number;
    creditLimit?: number;
    tags?: string[];
  }) =>
    request<{ customer: Customer }>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/customers/${id}`, { method: "DELETE" }),
  invoices: (customerId: string, limit = 50) =>
    request<{ invoices: Invoice[] }>(
      `/api/v1/customers/${customerId}/invoices?limit=${limit}`,
    ),
  update: (
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      nickname?: string;
      landmark?: string;
      creditLimit?: number;
      tags?: string[];
      notes?: string;
    },
  ) =>
    request<{ customer: Customer }>(`/api/v1/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getCommPrefs: (customerId: string) =>
    request<{ prefs: CommPrefs | null }>(
      `/api/v1/customers/${customerId}/communication-prefs`,
    ),
  lastOrder: (customerId: string) =>
    request<{
      invoice: {
        id: string;
        invoiceNo: string;
        total: string;
        items: Array<{ productName: string; quantity: string }>;
      };
    }>(`/api/v1/customers/${customerId}/last-order`),
  updateCommPrefs: (
    customerId: string,
    data: {
      whatsappEnabled?: boolean;
      whatsappNumber?: string;
      emailEnabled?: boolean;
      emailAddress?: string;
      smsEnabled?: boolean;
      preferredLanguage?: string;
    },
  ) =>
    request<{ prefs: CommPrefs }>(
      `/api/v1/customers/${customerId}/communication-prefs`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),
};

export interface InvoiceCreateOptions {
  discountPercent?: number;
  discountAmount?: number;
  withGst?: boolean;
  supplyType?: "INTRASTATE" | "INTERSTATE";
  buyerGstin?: string;
  placeOfSupply?: string;
  recipientAddress?: string;
  reverseCharge?: boolean;
  initialPayment?: {
    amount: number;
    method: "cash" | "upi" | "card" | "other";
  };
}

export const invoiceApi = {
  list: (limit = 50) =>
    request<{ invoices: Invoice[] }>(`/api/v1/invoices?limit=${limit}`),
  getById: (id: string) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`),
  create: (
    data: {
      customerId: string;
      items: { productName: string; quantity: number; unitPrice?: number }[];
      notes?: string;
      overrideCreditLimit?: boolean;
    } & InvoiceCreateOptions,
  ) =>
    request<{ invoice: Invoice; autoCreatedProducts?: string[] }>(
      "/api/v1/invoices",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
  proforma: (
    data: {
      customerId: string;
      items: { productName: string; quantity: number; unitPrice?: number }[];
      notes?: string;
    } & Omit<InvoiceCreateOptions, "initialPayment">,
  ) =>
    request<{ invoice: Invoice }>("/api/v1/invoices/proforma", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      items?: { productName: string; quantity: number; unitPrice?: number }[];
      notes?: string;
    } & InvoiceCreateOptions,
  ) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  convertProforma: (id: string, payment?: { amount: number; method: string }) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(payment ?? {}),
    }),
  cancel: (id: string) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}/cancel`, {
      method: "POST",
    }),
  sendEmail: (id: string) =>
    request<{ ok: boolean; invoiceId: string }>(
      `/api/v1/invoices/${id}/send-email`,
      { method: "POST" },
    ),
  portalToken: (id: string) =>
    request<{ token: string }>(`/api/v1/invoices/${id}/portal-token`),
};

export const productApi = {
  list: () => request<{ products: Product[] }>("/api/v1/products"),
  lowStock: () =>
    request<{ products: Product[] }>("/api/v1/products/low-stock"),
  topSelling: (limit = 5, days = 30) =>
    request<{ products: TopSellingProduct[] }>(
      `/api/v1/products/top-selling?limit=${limit}&days=${days}`,
    ),
  expiringBatches: (days = 30) =>
    request<{
      batches: Array<{
        id: string;
        batchNo: string;
        expiryDate: string;
        quantity: number;
        product: { name: string; unit: string };
      }>;
    }>(`/api/v1/products/expiring?days=${days}`),
  expiryPage: (filter: "expired" | "7d" | "30d" | "90d" | "all" = "30d") =>
    request<{
      batches: Array<{
        id: string;
        batchNo: string;
        expiryDate: string;
        manufacturingDate: string | null;
        quantity: number;
        purchasePrice: string | null;
        status: string;
        product: { name: string; unit: string; category: string | null };
      }>;
      summary: {
        expiredCount: number;
        critical7: number;
        warning30: number;
        valueAtRisk: number;
      };
    }>(`/api/v1/products/expiry-page?filter=${filter}`),
  writeOffBatch: (batchId: string) =>
    request<{ ok: boolean; batchNo: string; qtyWrittenOff: number }>(
      `/api/v1/products/batches/${batchId}/write-off`,
      { method: "PATCH" },
    ),
  byBarcode: (barcode: string) =>
    request<{ product: Product }>(
      `/api/v1/products/barcode/${encodeURIComponent(barcode)}`,
    ),
  search: (q: string, limit = 8) =>
    request<{ products: Product[] }>(
      `/api/v1/products/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
  create: (data: {
    name: string;
    price: number;
    stock: number;
    unit?: string;
    category?: string;
    description?: string;
    barcode?: string;
    sku?: string;
  }) =>
    request<{ product: Product }>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      name?: string;
      price?: number;
      stock?: number;
      unit?: string;
      category?: string;
      description?: string;
      barcode?: string;
      sku?: string;
      minStock?: number;
    },
  ) =>
    request<{ product: Product }>(`/api/v1/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  adjustStock: (
    id: string,
    data: { quantity: number; operation: "add" | "subtract"; reason?: string },
  ) =>
    request<{ product: Product }>(`/api/v1/products/${id}/stock`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export const ledgerApi = {
  getByCustomer: (customerId: string, limit = 30) =>
    request<{ entries: LedgerEntry[] }>(
      `/api/v1/ledger/${customerId}?limit=${limit}`,
    ),
  recordPayment: (data: {
    customerId: string;
    amount: number;
    paymentMode: string;
    notes?: string;
    reference?: string;
    paymentDate?: string;
  }) => {
    // Backend enum: cash | upi | card | other — map 'bank' to 'other'
    const mode = data.paymentMode === "bank" ? "other" : data.paymentMode;
    return request<{ entry: LedgerEntry }>("/api/v1/ledger/payment", {
      method: "POST",
      body: JSON.stringify({ ...data, paymentMode: mode }),
    });
  },
  addCredit: (data: {
    customerId: string;
    amount: number;
    description: string;
  }) =>
    request<{ entry: LedgerEntry }>("/api/v1/ledger/credit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const reminderApi = {
  list: (customerId?: string) =>
    request<{ reminders: Reminder[] }>(
      `/api/v1/reminders${customerId ? `?customerId=${customerId}` : ""}`,
    ),
  create: (data: {
    customerId: string;
    amount: number;
    datetime: string;
    message?: string;
  }) =>
    request<{ reminder: Reminder }>("/api/v1/reminders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Backend uses POST (not PATCH) for cancel
  cancel: (id: string) =>
    request<{ reminder: Reminder }>(`/api/v1/reminders/${id}/cancel`, {
      method: "POST",
    }),
  bulkCreate: (data: {
    customerIds: string[];
    message?: string;
    daysOffset?: number;
  }) =>
    request<{ reminders: Reminder[] }>("/api/v1/reminders/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const authApi = {
  me: () => request<{ user: AppUser }>("/api/v1/auth/me"),
  updateProfile: (data: {
    name?: string;
    phone?: string;
    preferences?: Record<string, unknown>;
    tenant?: {
      name?: string;
      legalName?: string;
      tradeName?: string;
      gstin?: string;
      currency?: string;
      timezone?: string;
      language?: string;
      dateFormat?: string;
      settings?: Record<string, unknown>;
    };
  }) =>
    request<{ user: AppUser }>("/api/v1/auth/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  list: () => request<{ users: AppUser[] }>("/api/v1/users"),
  create: (data: {
    email: string;
    name: string;
    phone?: string;
    role: "admin" | "manager" | "staff" | "viewer";
    password: string;
    permissions?: string[];
  }) =>
    request<{ user: AppUser }>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      name?: string;
      phone?: string;
      role?: "admin" | "manager" | "staff" | "viewer";
      permissions?: string[];
      isActive?: boolean;
    },
  ) =>
    request<{ user: AppUser }>(`/api/v1/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ success: boolean }>(`/api/v1/users/${id}`, { method: "DELETE" }),
};

export const mixedPaymentApi = {
  record: (data: {
    customerId: string;
    splits: { amount: number; method: "cash" | "upi" | "card" | "other" }[];
    notes?: string;
  }) =>
    request<{ payments: unknown[]; totalAmount: number }>(
      "/api/v1/ledger/mixed-payment",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
};

// ── Report types ───────────────────────────────────────────────────────────────

export interface Gstr1Totals {
  totalTaxableValue: number;
  totalIgst: number;
  totalCgst: number;
  totalSgst: number;
  totalCess: number;
  totalTaxValue: number;
  totalInvoiceValue: number;
  invoiceCount: number;
}

export interface Gstr1B2BEntry {
  receiverGstin: string;
  receiverName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr1B2CSEntry {
  supplyType: string;
  placeOfSupply: string;
  gstRate: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr1HsnEntry {
  hsnCode: string;
  description: string;
  uqc: string;
  totalQty: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  gstRate: number;
}

export interface Gstr1Report {
  period: { from: string; to: string };
  fy: string;
  gstin: string;
  legalName: string;
  b2b: Gstr1B2BEntry[];
  b2cs: Gstr1B2CSEntry[];
  b2cl: unknown[];
  hsn: Gstr1HsnEntry[];
  totals: Gstr1Totals;
}

export interface PnlMonthEntry {
  month: string;
  invoiceCount: number;
  revenue: number;
  taxCollected: number;
  discounts: number;
  collected: number;
  outstanding: number;
  netRevenue: number;
}

export interface PnlTotals {
  invoiceCount: number;
  revenue: number;
  taxCollected: number;
  discounts: number;
  collected: number;
  outstanding: number;
  netRevenue: number;
  collectionRate: number;
}

export interface PnlReport {
  period: { from: string; to: string };
  months: PnlMonthEntry[];
  totals: PnlTotals;
  comparison?: Array<{
    label: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }>;
}

// ── Report API ─────────────────────────────────────────────────────────────────

export interface ReportParams {
  from?: string;
  to?: string;
  fy?: string;
}

function buildReportQs(params: ReportParams): string {
  const q = new URLSearchParams();
  if (params.fy) q.set("fy", params.fy);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const reportApi = {
  getGstr1: (params: ReportParams = {}) =>
    request<{ report: Gstr1Report }>(
      `/api/v1/reports/gstr1${buildReportQs(params)}`,
    ),

  getPnl: (
    params: ReportParams & { compareFrom?: string; compareTo?: string } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.fy) q.set("fy", params.fy);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.compareFrom) q.set("compareFrom", params.compareFrom);
    if (params.compareTo) q.set("compareTo", params.compareTo);
    const s = q.toString();
    return request<{ report: PnlReport }>(
      `/api/v1/reports/pnl${s ? `?${s}` : ""}`,
    );
  },

  downloadGstr1Pdf: (params: ReportParams = {}) =>
    `/api/v1/reports/gstr1/pdf${buildReportQs(params)}`,

  downloadGstr1Csv: (
    params: ReportParams & { section?: "b2b" | "b2cs" | "hsn" } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.fy) q.set("fy", params.fy);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.section) q.set("section", params.section);
    const s = q.toString();
    return `/api/v1/reports/gstr1/csv${s ? `?${s}` : ""}`;
  },

  downloadPnlPdf: (params: ReportParams = {}) =>
    `/api/v1/reports/pnl/pdf${buildReportQs(params)}`,

  downloadPnlCsv: (params: ReportParams = {}) =>
    `/api/v1/reports/pnl/csv${buildReportQs(params)}`,

  emailReport: (data: {
    type: "gstr1" | "pnl";
    from: string;
    to: string;
    email: string;
    fy?: string;
    compareFrom?: string;
    compareTo?: string;
  }) =>
    request<{ success: boolean; message: string }>("/api/v1/reports/email", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
// ── Expense & Purchase types ──────────────────────────────────────────────────

export interface Expense {
  id: string;
  type: "expense" | "purchase";
  category: string;
  amount: number;
  note?: string;
  vendor?: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  ratePerUnit?: number;
  date: string;
  createdAt: string;
}

export interface CashEntry {
  id: string;
  type: "in" | "out";
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
}

// ── Expense API ───────────────────────────────────────────────────────────────

export const expenseApi = {
  list: (params: { from?: string; to?: string; category?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.category) q.set("category", params.category);
    const s = q.toString();
    return request<{ expenses: Expense[]; total: number; count: number }>(
      `/api/v1/expenses${s ? `?${s}` : ""}`,
    );
  },
  create: (data: {
    category: string;
    amount: number;
    note?: string;
    vendor?: string;
    date?: string;
  }) =>
    request<{ expense: Expense }>("/api/v1/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/expenses/${id}`, { method: "DELETE" }),
  summary: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return request<{
      total: number;
      byCategory: Record<string, number>;
      count: number;
    }>(`/api/v1/expenses/summary${s ? `?${s}` : ""}`);
  },
};

// ── Purchases API ─────────────────────────────────────────────────────────────

export const purchaseApi = {
  list: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return request<{ purchases: Expense[]; total: number; count: number }>(
      `/api/v1/purchases${s ? `?${s}` : ""}`,
    );
  },
  create: (data: {
    category: string;
    amount: number;
    itemName: string;
    vendor?: string;
    quantity?: number;
    unit?: string;
    ratePerUnit?: number;
    note?: string;
    date?: string;
  }) =>
    request<{ purchase: Expense }>("/api/v1/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/purchases/${id}`, { method: "DELETE" }),
};

// ── CashBook API ──────────────────────────────────────────────────────────────

export const cashbookApi = {
  get: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return request<{
      entries: CashEntry[];
      totalIn: number;
      totalOut: number;
      balance: number;
    }>(`/api/v1/cashbook${s ? `?${s}` : ""}`);
  },
};

// ── Sprint 2: AI Features API ─────────────────────────────────────────────────

export interface OcrJob {
  jobId: string;
  jobType: "purchase_bill" | "product_catalog";
  status: "pending" | "processing" | "completed" | "failed";
  parsedItems?: unknown[] | null;
  purchaseOrderId?: string | null;
  productsCreated: number;
  errorMessage?: string | null;
  processedAt?: string | null;
  createdAt?: string;
}

export interface ReplenishmentSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedOrderQty: number;
  urgency: "critical" | "high" | "normal";
  velocity30d: number;
  preferredSupplier: string | null;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: "none" | "low" | "medium" | "high";
  message: string;
  expectedRange: { min: number; max: number };
}

export interface PredictiveReminderResult {
  scheduled: number;
  skipped: number;
}

/**
 * Upload a file for AI processing via multipart form.
 * Returns immediately with { jobId, status: 'pending' }.
 * Poll aiApi.getOcrJob(jobId) until status is 'completed' or 'failed'.
 */
async function uploadForOcr(
  endpoint: string,
  file: File,
): Promise<{ jobId: string; status: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : `Upload failed: ${res.status}`;
    throw new Error(msg);
  }

  return res.json() as Promise<{ jobId: string; status: string }>;
}

export const aiApi = {
  /** Upload a supplier bill photo → async OCR → PurchaseOrder creation */
  uploadPurchaseBill: (file: File) =>
    uploadForOcr("/api/v1/ai/purchase-bill/ocr", file),

  /** Upload a shelf photo → async catalog seeding */
  seedCatalogFromPhoto: (file: File) =>
    uploadForOcr("/api/v1/ai/catalog/seed-from-photo", file),

  /** Poll for OCR job status */
  getOcrJob: (jobId: string) => request<OcrJob>(`/api/v1/ai/ocr-jobs/${jobId}`),

  /** List recent OCR jobs */
  listOcrJobs: (limit = 20) =>
    request<{ jobs: OcrJob[] }>(`/api/v1/ai/ocr-jobs?limit=${limit}`),

  /** Get stock replenishment suggestions */
  getReplenishmentSuggestions: () =>
    request<{ suggestions: ReplenishmentSuggestion[] }>(
      "/api/v1/ai/replenishment-suggestions",
    ),

  /** Check if an invoice total is anomalous for a customer */
  checkAnomaly: (customerId: string, total: number) =>
    request<{ anomaly: AnomalyResult }>(
      `/api/v1/ai/anomaly-check?customerId=${encodeURIComponent(customerId)}&total=${total}`,
    ),

  /** Schedule predictive payment reminders for near-due invoices */
  schedulePredictiveReminders: () =>
    request<PredictiveReminderResult>(
      "/api/v1/ai/predictive-reminders/schedule",
      {
        method: "POST",
        body: "{}",
      },
    ),
};

// ─── Draft / Staging API ──────────────────────────────────────────────────────

export interface Draft {
  id: string;
  type: "purchase_entry" | "product" | "stock_adjustment";
  status: "pending" | "confirmed" | "discarded";
  title: string | null;
  data: Record<string, unknown>;
  notes: string | null;
  createdBy: string | null;
  confirmedAt: string | null;
  discardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const draftApi = {
  /** Create a new pending draft */
  create: (
    type: Draft["type"],
    data: Record<string, unknown>,
    title?: string,
    notes?: string,
  ) =>
    request<{ draft: Draft }>("/api/v1/drafts", {
      method: "POST",
      body: JSON.stringify({ type, data, title, notes }),
    }),

  /** List drafts — defaults to pending */
  list: (type?: Draft["type"], status: Draft["status"] = "pending") =>
    request<{ drafts: Draft[]; count: number }>(
      `/api/v1/drafts?${type ? `type=${type}&` : ""}status=${status}`,
    ),

  /** Fetch a single draft by id */
  get: (id: string) => request<{ draft: Draft }>(`/api/v1/drafts/${id}`),

  /** Update draft fields (only while pending) */
  update: (
    id: string,
    patch: { data?: Record<string, unknown>; title?: string; notes?: string },
  ) =>
    request<{ draft: Draft }>(`/api/v1/drafts/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  /** Confirm a draft — executes the real DB write */
  confirm: (id: string) =>
    request<{ draft: Draft; result: unknown }>(`/api/v1/drafts/${id}/confirm`, {
      method: "POST",
      body: "{}",
    }),

  /** Discard a draft */
  discard: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/drafts/${id}`, { method: "DELETE" }),
};

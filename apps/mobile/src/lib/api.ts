/**
 * Mobile API initializer.
 * Wires the shared platform-agnostic API client with MMKV token storage
 * and React Navigation auth-expiry handling.
 *
 * Call `bootApi()` once — inside App.tsx before QueryClientProvider renders.
 */
import {
  initApiClient,
  customerApi,
  productApi,
  invoiceApi,
  authApi,
  apiFetch,
} from "@execora/shared";
import { tokenStorage } from "./storage";

/** API base URL — treats empty/whitespace as fallback (emulator: 10.0.2.2:3006) */
export const getApiBaseUrl = (): string => {
  const v = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
  return v || "http://10.0.2.2:3006";
};

// ── Extended invoice API ───────────────────────────────────────────────────────

export const invoiceExtApi = {
  cancel: (id: string) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}/cancel`, { method: 'POST' }),

  update: (id: string, data: { items?: Array<{ productName: string; quantity: number }>; notes?: string }) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  sendEmail: (id: string) =>
    apiFetch<{ sent: boolean }>(`/api/v1/invoices/${id}/send-email`, { method: 'POST' }),
};

// ── Extended customer API ─────────────────────────────────────────────────────

export const customerExtApi = {
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/v1/customers/${id}`, { method: 'DELETE' }),

  getLedger: (id: string) =>
    apiFetch<{ entries: Array<{ id: string; type: string; description: string; amount: string | number; createdAt: string }> }>(
      `/api/v1/customers/${id}/ledger`
    ),

  getCommPrefs: (id: string) =>
    apiFetch<{ prefs: { whatsappEnabled?: boolean; whatsappNumber?: string; emailEnabled?: boolean; emailAddress?: string; smsEnabled?: boolean; preferredLanguage?: string } | null }>(
      `/api/v1/customers/${id}/comm-prefs`
    ),

  updateCommPrefs: (id: string, data: { whatsappEnabled?: boolean; whatsappNumber?: string; emailEnabled?: boolean; emailAddress?: string; smsEnabled?: boolean; preferredLanguage?: string }) =>
    apiFetch<{ prefs: unknown }>(`/api/v1/customers/${id}/comm-prefs`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Reminders API ─────────────────────────────────────────────────────────────

export const reminderApi = {
  list: (customerId?: string) =>
    apiFetch<{ reminders: Array<{ id: string; status: string; scheduledTime: string; message?: string }> }>(
      `/api/v1/reminders${customerId ? `?customerId=${customerId}` : ''}`
    ),

  create: (data: { customerId: string; amount?: number; datetime: string; message?: string }) =>
    apiFetch<{ reminder: unknown }>('/api/v1/reminders', {
      method: 'POST',
      body: JSON.stringify({
        customerId: data.customerId,
        amount: data.amount,
        scheduledTime: data.datetime,
        message: data.message,
      }),
    }),
};

// ── Payments API ──────────────────────────────────────────────────────────────

export const paymentApi = {
  record: (data: { customerId?: string; invoiceId?: string; amount: number; method: string; reference?: string; date?: string }) =>
    apiFetch<{ payment: unknown }>('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── Expenses API ──────────────────────────────────────────────────────────────

export const expenseApi = {
  list: (params: { from?: string; to?: string; category?: string; type?: "expense" | "income" } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.category) q.set("category", params.category);
    if (params.type) q.set("type", params.type);
    const s = q.toString();
    return apiFetch<{ expenses: Array<{ id: string; category: string; amount: string | number; note?: string; vendor?: string; date: string }>; total: number; count: number }>(
      `/api/v1/expenses${s ? `?${s}` : ""}`,
    );
  },
  create: (data: { category: string; amount: number; note?: string; vendor?: string; date?: string; type?: "expense" | "income" }) =>
    apiFetch<{ expense: unknown }>("/api/v1/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/expenses/${id}`, { method: "DELETE" }),
  summary: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return apiFetch<{ total: number; byCategory: Record<string, number>; count: number }>(
      `/api/v1/expenses/summary${s ? `?${s}` : ""}`,
    );
  },
};

// ── Cashbook API ──────────────────────────────────────────────────────────────

export const cashbookApi = {
  get: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return apiFetch<{
      entries: Array<{ id: string; type: string; date: string; category?: string; note?: string; amount: string | number }>;
      totalIn: number;
      totalOut: number;
      balance: number;
    }>(`/api/v1/cashbook${s ? `?${s}` : ""}`);
  },
};

// ── Purchases API ─────────────────────────────────────────────────────────────

export const purchaseApi = {
  list: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return apiFetch<{
      purchases: Array<{ id: string; category: string; amount: string | number; note?: string; vendor?: string; date: string }>;
      total: number;
      count: number;
    }>(`/api/v1/purchases${s ? `?${s}` : ""}`);
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
    apiFetch<{ purchase: unknown }>("/api/v1/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/purchases/${id}`, { method: "DELETE" }),
};

// ── Summary API ───────────────────────────────────────────────────────────────

export const summaryApi = {
  daily: (date?: string) =>
    apiFetch<{
      summary: {
        totalSales: number;
        totalPayments: number;
        invoiceCount: number;
        pendingAmount: number;
        cashPayments: number;
        upiPayments: number;
      };
    }>(`/api/v1/summary/daily${date ? `?date=${date}` : ""}`),
  range: (from: string, to: string) =>
    apiFetch<{ summary: { totalSales: number; totalPayments: number; invoiceCount: number } }>(
      `/api/v1/summary/range?from=${from}&to=${to}`,
    ),
};

// ── Global auth-expiry callback ───────────────────────────────────────────────
// Set this after navigation is ready so we can navigate to the Login screen.
let _onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(fn: () => void): void {
  _onAuthExpired = fn;
}

export function bootApi(): void {
  initApiClient({
    baseUrl: getApiBaseUrl(),
    getToken: tokenStorage.getToken,
    getRefreshToken: tokenStorage.getRefreshToken,
    setTokens: tokenStorage.setTokens,
    clearTokens: tokenStorage.clearTokens,
    onAuthExpired: () => _onAuthExpired?.(),
  });
}

// ── Push API (Sprint 15) ───────────────────────────────────────────────────────

export const pushApi = {
  register: (token: string, platform?: string) =>
    apiFetch<{ ok: boolean }>('/api/v1/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
};

// ── Feedback API ──────────────────────────────────────────────────────────────

export const feedbackApi = {
  submit: (data: { npsScore: number; text?: string }) =>
    apiFetch<{ feedback: { id: string; npsScore: number; text: string | null; createdAt: string } }>(
      "/api/v1/feedback",
      { method: "POST", body: JSON.stringify(data) },
    ),
};

// ── Product extensions (low-stock, expiry, write-off) ──────────────────────────

export const productExtApi = {
  expiringBatches: (days = 30) =>
    apiFetch<{
      batches: Array<{
        id: string;
        batchNo: string;
        expiryDate: string;
        quantity: number;
        product: { name: string; unit: string };
      }>;
    }>(`/api/v1/products/expiring?days=${days}`),
  lowStock: () =>
    apiFetch<{ products: Array<{ id: string; name: string; stock: number; unit?: string; minStock?: number }> }>(
      "/api/v1/products/low-stock",
    ),
  expiryPage: (filter: "expired" | "7d" | "30d" | "90d" | "all" = "30d") =>
    apiFetch<{
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
    apiFetch<{ ok: boolean; batchNo: string; qtyWrittenOff: number }>(
      `/api/v1/products/batches/${batchId}/write-off`,
      { method: "PATCH" },
    ),
};

// ── Reports API (PnL, etc.) ───────────────────────────────────────────────────

export const reportsApi = {
  gstr1: (params?: { from?: string; to?: string; fy?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.fy) q.set("fy", params.fy);
    const s = q.toString();
    return apiFetch<{ report: { fy: string; b2b: unknown[]; b2cs: unknown[]; hsn: unknown[] } }>(
      `/api/v1/reports/gstr1${s ? `?${s}` : ""}`,
    );
  },
  pnl: (params?: { from?: string; to?: string; fy?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.fy) q.set("fy", params.fy);
    const s = q.toString();
    return apiFetch<{
      report: {
        period: { from: string; to: string };
        months: Array<{
          month: string;
          invoiceCount: number;
          revenue: number;
          discounts: number;
          netRevenue: number;
          taxCollected: number;
          collected: number;
          outstanding: number;
        }>;
        totals: {
          invoiceCount: number;
          revenue: number;
          discounts: number;
          netRevenue: number;
          taxCollected: number;
          collected: number;
          outstanding: number;
          collectionRate: number;
        };
      };
    }>(`/api/v1/reports/pnl${s ? `?${s}` : ""}`);
  },
};

// ── Credit Notes API ─────────────────────────────────────────────────────────

export const creditNoteApi = {
  list: (params?: { limit?: number; customerId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.customerId) q.set("customerId", params.customerId);
    if (params?.status) q.set("status", params.status);
    const s = q.toString();
    return apiFetch<{
      creditNotes: Array<{
        id: string;
        creditNoteNo: string;
        status: string;
        total: number;
        customer?: { name: string };
        invoice?: { invoiceNo: string };
        createdAt: string;
      }>;
    }>(`/api/v1/credit-notes${s ? `?${s}` : ""}`);
  },
};

// ── Purchase Orders API ──────────────────────────────────────────────────────

export const purchaseOrderApi = {
  list: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit ?? 50));
    const s = q.toString();
    return apiFetch<{
      purchaseOrders: Array<{
        id: string;
        poNo: string;
        status: string;
        total: number;
        supplier?: { name: string };
        createdAt: string;
      }>;
    }>(`/api/v1/purchase-orders${s ? `?${s}` : ""}`);
  },
};

// ── Monitoring API (Sprint 14) ───────────────────────────────────────────────

export const monitoringApi = {
  getEvents: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    if (params?.unreadOnly) q.set("unreadOnly", "true");
    const s = q.toString();
    return apiFetch<{
      events: Array<{
        id: string;
        eventType: string;
        entityType: string;
        entityId: string;
        description: string;
        amount?: number;
        severity: string;
        isRead: boolean;
        createdAt: string;
        user?: { id: string; name: string; role: string };
      }>;
      total: number;
    }>(`/api/v1/monitoring/events${s ? `?${s}` : ""}`);
  },
  getUnreadCount: () =>
    apiFetch<{ count: number }>("/api/v1/monitoring/events/unread"),
  markAllRead: async () => {
    const baseUrl = getApiBaseUrl();
    const token = tokenStorage.getToken();
    const res = await fetch(`${baseUrl}/api/v1/monitoring/events/read-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)));
  },
  markRead: async (id: string) => {
    const baseUrl = getApiBaseUrl();
    const token = tokenStorage.getToken();
    const res = await fetch(`${baseUrl}/api/v1/monitoring/events/${id}/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)));
  },
  logEvent: (data: {
    eventType: string;
    entityType: string;
    entityId: string;
    description: string;
    amount?: number;
    severity?: "info" | "warning" | "alert";
  }) =>
    apiFetch<{ ok: boolean }>("/api/v1/monitoring/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getStats: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const s = q.toString();
    return apiFetch<{
      billCount: number;
      totalBillAmount: number;
      footfall: number;
      conversionRate: number | null;
      hourlyBills: Record<string, number>;
      peakHour: number | null;
      byEmployee: Record<string, { bills: number; payments: number; cancellations: number; totalAmount: number }>;
    }>(`/api/v1/monitoring/stats${s ? `?${s}` : ""}`);
  },
  submitCashReconciliation: (data: { date: string; actual: number; expected: number; note?: string }) =>
    apiFetch<{ ok: boolean }>("/api/v1/monitoring/cash-reconciliation", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCashReconciliation: (date: string) =>
    apiFetch<{ reconciliation: { id: string; description: string; meta: unknown } | null }>(
      `/api/v1/monitoring/cash-reconciliation/${date}`,
    ),
};

// Re-export the API functions so screens import from one place
export const authExtApi = {
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
      logoUrl?: string;
    };
  }) =>
    apiFetch<{ user: unknown }>("/api/v1/auth/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export { customerApi, productApi, invoiceApi, authApi };

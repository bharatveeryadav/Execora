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
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000"; // 10.0.2.2 = Android emulator host
  initApiClient({
    baseUrl: apiUrl,
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

// ── Product extensions (low-stock, etc.) ──────────────────────────────────────

export const productExtApi = {
  lowStock: () =>
    apiFetch<{ products: Array<{ id: string; name: string; stock: number; unit?: string; minStock?: number }> }>(
      "/api/v1/products/low-stock",
    ),
};

// Re-export the API functions so screens import from one place
export { customerApi, productApi, invoiceApi, authApi };

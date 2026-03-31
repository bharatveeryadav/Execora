/**
 * Mobile API initializer.
 * Wires the shared platform-agnostic API client with MMKV token storage
 * and React Navigation auth-expiry handling.
 *
 * Call `bootApi()` once — inside App.tsx before QueryClientProvider renders.
 */
import { initApiClient, authApi, apiFetch } from "@execora/shared";
import { tokenStorage } from "./storage";

export { invoiceApi, invoiceExtApi } from "../features/billing/api/invoiceApi";
export {
  customerApi,
  customerExtApi,
  reminderApi,
} from "../features/parties/api/customerApi";
export { productApi, productExtApi } from "../features/products/api/productApi";
export {
  cashbookApi,
  reportsApi,
  summaryApi,
} from "../features/accounting/api/accountingApi";
export {
  paymentApi,
  expenseApi,
  supplierApi,
  purchaseApi,
} from "../features/expenses/api/expensesApi";

/** API base URL — treats empty/whitespace as fallback (emulator: 10.0.2.2:3006) */
export const getApiBaseUrl = (): string => {
  const v = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
  return v || "http://10.0.2.2:3006";
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
    apiFetch<{ ok: boolean }>("/api/v1/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),
};

// ── Feedback API ──────────────────────────────────────────────────────────────

export const feedbackApi = {
  submit: (data: { npsScore: number; text?: string }) =>
    apiFetch<{
      feedback: {
        id: string;
        npsScore: number;
        text: string | null;
        createdAt: string;
      };
    }>("/api/v1/feedback", { method: "POST", body: JSON.stringify(data) }),
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
  getEvents: (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => {
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
    if (!res.ok) {
      throw new Error(await res.text().catch(() => String(res.status)));
    }
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
    if (!res.ok) {
      throw new Error(await res.text().catch(() => String(res.status)));
    }
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
      byEmployee: Record<
        string,
        {
          bills: number;
          payments: number;
          cancellations: number;
          totalAmount: number;
        }
      >;
    }>(`/api/v1/monitoring/stats${s ? `?${s}` : ""}`);
  },
  submitCashReconciliation: (data: {
    date: string;
    actual: number;
    expected: number;
    note?: string;
  }) =>
    apiFetch<{ ok: boolean }>("/api/v1/monitoring/cash-reconciliation", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCashReconciliation: (date: string) =>
    apiFetch<{
      reconciliation: { id: string; description: string; meta: unknown } | null;
    }>(`/api/v1/monitoring/cash-reconciliation/${date}`),
};

export const authExtApi = {
  uploadLogo: async (
    uri: string,
    mimeType = "image/jpeg",
  ): Promise<{ logoObjectKey: string }> => {
    const base = getApiBaseUrl();
    const token = tokenStorage.getToken();
    if (!token) throw new Error("Not authenticated");
    const ext = mimeType.split("/")[1] ?? "jpg";
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: `logo.${ext}`,
      type: mimeType,
    } as any);
    const res = await fetch(`${base}/api/v1/auth/me/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    return res.json();
  },
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

export { authApi };

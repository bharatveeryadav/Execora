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
  unregister: (token: string) =>
    apiFetch<{ ok: boolean }>("/api/v1/push/unregister", {
      method: "DELETE",
      body: JSON.stringify({ token }),
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

// ── Subscription API ────────────────────────────────────────────────────────

export const subscriptionApi = {
  getCurrent: () =>
    apiFetch<{
      subscription: {
        tenantId: string;
        plan: "free" | "pro" | "enterprise";
        status: string;
        trialEndsAt?: string | null;
        subscriptionEndsAt?: string | null;
        note?: string;
      };
    }>("/api/v1/subscription"),
  getUsage: () =>
    apiFetch<{
      period: string;
      plan: string;
      usage: {
        invoicesThisMonth: number;
        totalProducts: number;
        totalUsers: number;
      };
      limits: Record<string, number | null>;
    }>("/api/v1/subscription/usage"),
  getPlans: () =>
    apiFetch<{
      plans: Array<{
        id: "free" | "pro" | "enterprise";
        name: string;
        price: number | null;
        currency: string;
        limits: Record<string, number | null>;
      }>;
    }>("/api/v1/subscription/plans"),
  activate: (plan: "free" | "pro" | "enterprise") =>
    apiFetch<{ subscription: unknown }>("/api/v1/subscription/activate", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
  cancel: (atPeriodEnd = true) =>
    apiFetch<{ ok: boolean; tenantId: string; atPeriodEnd: boolean }>(
      "/api/v1/subscription/cancel",
      {
        method: "POST",
        body: JSON.stringify({ atPeriodEnd }),
      },
    ),
};

// ── Audit API ───────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: {
    entity?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.entity) q.set("entity", params.entity);
    if (params?.userId) q.set("userId", params.userId);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return apiFetch<{
      entries: Array<{
        id: string;
        userId: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        details: unknown;
        createdAt: string;
      }>;
      count: number;
    }>(`/api/v1/audit${s ? `?${s}` : ""}`);
  },
  activity: (limit = 50) =>
    apiFetch<{
      logs: Array<{
        id: string;
        userId: string | null;
        action: string;
        entityType: string;
        entityId: string | null;
        details: unknown;
        createdAt: string;
      }>;
      count: number;
    }>(`/api/v1/audit/activity?limit=${limit}`),
};

// ── Inventory API ───────────────────────────────────────────────────────────

export const inventoryApi = {
  lookupBarcode: (code: string) =>
    apiFetch<{ product: unknown }>(`/api/v1/inventory/barcode/lookup?code=${encodeURIComponent(code)}`),
  generateBarcode: (productId: string, format: "ean13" | "code128" | "qr" = "ean13") =>
    apiFetch<{ barcode: unknown }>(`/api/v1/inventory/barcode/${productId}?format=${format}`),
  getMovements: (params?: {
    productId?: string;
    type?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.productId) q.set("productId", params.productId);
    if (params?.type) q.set("type", params.type);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const s = q.toString();
    return apiFetch<{ movements: unknown[]; total: number; limit: number; offset: number }>(
      `/api/v1/inventory/movements${s ? `?${s}` : ""}`,
    );
  },
  createAdjustment: (data: {
    productId: string;
    quantity: number;
    reason: "damage" | "loss" | "theft" | "opening-balance" | "audit" | "other";
    note?: string;
  }) =>
    apiFetch<{ adjustment: unknown }>("/api/v1/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listAdjustments: (productId?: string) =>
    apiFetch<{ adjustments: unknown[] }>(
      `/api/v1/inventory/adjustments${productId ? `?productId=${encodeURIComponent(productId)}` : ""}`,
    ),
  listLocations: () => apiFetch<{ locations: unknown[] }>("/api/v1/inventory/warehouse/locations"),
  createLocation: (data: {
    code: string;
    name: string;
    zone?: string;
    aisle?: string;
    bin?: string;
    parentLocationId?: string;
  }) =>
    apiFetch<{ location: unknown }>("/api/v1/inventory/warehouse/locations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getValuation: () =>
    apiFetch<{
      items: Array<{
        productId: string;
        name: string;
        sku?: string | null;
        stock: number;
        costPrice: number;
        value: number;
      }>;
      totalValue: number;
      productCount: number;
    }>("/api/v1/inventory/valuation"),
};

// ── Compliance API ──────────────────────────────────────────────────────────

export const complianceApi = {
  eligibility: (turnoverCr: number) =>
    apiFetch<{
      tenantId: string;
      eligible: boolean;
      mandatory: boolean;
      threshold: number | null;
      message: string;
    }>(`/api/v1/compliance/einvoice/eligibility?turnoverCr=${turnoverCr}`),
  checkInvoice: (invoiceId: string) =>
    apiFetch<{ invoiceId: string; eligible: boolean; reason: string }>(
      "/api/v1/compliance/einvoice/check",
      {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      },
    ),
  gstr3b: (params?: { from?: string; to?: string; fy?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.fy) q.set("fy", params.fy);
    const s = q.toString();
    return apiFetch<{
      period: { from: string; to: string };
      invoiceCount: number;
      totalTaxableValue: number;
      totalTax: number;
      cgst: number;
      sgst: number;
      igst: number;
      note: string;
    }>(`/api/v1/compliance/gstr3b${s ? `?${s}` : ""}`);
  },
  generateEwaybill: (data: {
    invoiceId: string;
    transMode?: string;
    vehicleNo?: string;
    distance?: number;
  }) =>
    apiFetch<{ status: string; invoiceId: string; invoiceNo: string; message: string }>(
      "/api/v1/compliance/ewaybill",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    ),
  getEwaybillStatus: (ewbNo: string) =>
    apiFetch<{ error: string }>(`/api/v1/compliance/ewaybill/${ewbNo}`),
};

// ── POS API ─────────────────────────────────────────────────────────────────

export const posApi = {
  getActiveSession: (counterId?: string) =>
    apiFetch<{ session: unknown | null; counterId?: string }>(
      `/api/v1/pos/session/active${counterId ? `?counterId=${encodeURIComponent(counterId)}` : ""}`,
    ),
  openSession: (data: { counterId?: string; openingCash: number }) =>
    apiFetch<{ session: unknown }>("/api/v1/pos/session/open", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  closeSession: (data: { sessionId: string; closingCash: number }) =>
    apiFetch<{ session: unknown }>("/api/v1/pos/session/close", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listSessions: (limit = 20) =>
    apiFetch<{ sessions: unknown[]; count: number }>(`/api/v1/pos/sessions?limit=${limit}`),
  listCarts: (status = "pending") =>
    apiFetch<{ carts: unknown[] }>(`/api/v1/pos/cart?status=${encodeURIComponent(status)}`),
  createCart: (data: { type: string; data: Record<string, unknown>; title?: string }) =>
    apiFetch<{ cart: unknown }>("/api/v1/pos/cart", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCart: (id: string) => apiFetch<{ cart: unknown }>(`/api/v1/pos/cart/${id}`),
  updateCart: (id: string, data: { data?: Record<string, unknown>; title?: string }) =>
    apiFetch<{ cart: unknown }>(`/api/v1/pos/cart/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  checkoutCart: (id: string) =>
    apiFetch<{ cart: unknown; message: string }>(`/api/v1/pos/cart/${id}/checkout`, {
      method: "POST",
    }),
  discardCart: (id: string) =>
    apiFetch<unknown>(`/api/v1/pos/cart/${id}`, {
      method: "DELETE",
    }),
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authApi = exports.invoiceApi = exports.productApi = exports.customerApi = exports.authExtApi = exports.monitoringApi = exports.purchaseOrderApi = exports.creditNoteApi = exports.reportsApi = exports.productExtApi = exports.feedbackApi = exports.pushApi = exports.summaryApi = exports.purchaseApi = exports.supplierApi = exports.cashbookApi = exports.expenseApi = exports.paymentApi = exports.reminderApi = exports.customerExtApi = exports.invoiceExtApi = exports.getApiBaseUrl = void 0;
exports.setAuthExpiredHandler = setAuthExpiredHandler;
exports.bootApi = bootApi;
/**
 * Mobile API initializer.
 * Wires the shared platform-agnostic API client with MMKV token storage
 * and React Navigation auth-expiry handling.
 *
 * Call `bootApi()` once — inside App.tsx before QueryClientProvider renders.
 */
const shared_1 = require("@execora/shared");
Object.defineProperty(exports, "customerApi", { enumerable: true, get: function () { return shared_1.customerApi; } });
Object.defineProperty(exports, "productApi", { enumerable: true, get: function () { return shared_1.productApi; } });
Object.defineProperty(exports, "invoiceApi", { enumerable: true, get: function () { return shared_1.invoiceApi; } });
Object.defineProperty(exports, "authApi", { enumerable: true, get: function () { return shared_1.authApi; } });
const storage_1 = require("./storage");
/** API base URL — treats empty/whitespace as fallback (emulator: 10.0.2.2:3006) */
const getApiBaseUrl = () => {
    const v = (process.env.EXPO_PUBLIC_API_URL ?? "").trim();
    return v || "http://10.0.2.2:3006";
};
exports.getApiBaseUrl = getApiBaseUrl;
// ── Extended invoice API ───────────────────────────────────────────────────────
exports.invoiceExtApi = {
    cancel: (id) => (0, shared_1.apiFetch)(`/api/v1/invoices/${id}/cancel`, {
        method: "POST",
    }),
    update: (id, data) => (0, shared_1.apiFetch)(`/api/v1/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    sendEmail: (id) => (0, shared_1.apiFetch)(`/api/v1/invoices/${id}/send-email`, {
        method: "POST",
    }),
};
// ── Extended customer API ─────────────────────────────────────────────────────
exports.customerExtApi = {
    create: (data) => (0, shared_1.apiFetch)("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    delete: (id) => (0, shared_1.apiFetch)(`/api/v1/customers/${id}`, {
        method: "DELETE",
    }),
    getLedger: (id) => (0, shared_1.apiFetch)(`/api/v1/customers/${id}/ledger`),
    getCommPrefs: (id) => (0, shared_1.apiFetch)(`/api/v1/customers/${id}/comm-prefs`),
    updateCommPrefs: (id, data) => (0, shared_1.apiFetch)(`/api/v1/customers/${id}/comm-prefs`, {
        method: "PUT",
        body: JSON.stringify(data),
    }),
};
// ── Reminders API ─────────────────────────────────────────────────────────────
exports.reminderApi = {
    list: (customerId) => (0, shared_1.apiFetch)(`/api/v1/reminders${customerId ? `?customerId=${customerId}` : ""}`),
    create: (data) => (0, shared_1.apiFetch)("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
            customerId: data.customerId,
            amount: data.amount,
            scheduledTime: data.datetime,
            message: data.message,
        }),
    }),
};
// ── Payments API ──────────────────────────────────────────────────────────────
exports.paymentApi = {
    record: (data) => (0, shared_1.apiFetch)("/api/v1/payments", {
        method: "POST",
        body: JSON.stringify(data),
    }),
};
// ── Expenses API ──────────────────────────────────────────────────────────────
exports.expenseApi = {
    list: (params = {}) => {
        const q = new URLSearchParams();
        if (params.from)
            q.set("from", params.from);
        if (params.to)
            q.set("to", params.to);
        if (params.category)
            q.set("category", params.category);
        if (params.type)
            q.set("type", params.type);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/expenses${s ? `?${s}` : ""}`);
    },
    create: (data) => (0, shared_1.apiFetch)("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    remove: (id) => (0, shared_1.apiFetch)(`/api/v1/expenses/${id}`, { method: "DELETE" }),
    summary: (params = {}) => {
        const q = new URLSearchParams();
        if (params.from)
            q.set("from", params.from);
        if (params.to)
            q.set("to", params.to);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/expenses/summary${s ? `?${s}` : ""}`);
    },
};
// ── Cashbook API ──────────────────────────────────────────────────────────────
exports.cashbookApi = {
    get: (params = {}) => {
        const q = new URLSearchParams();
        if (params.from)
            q.set("from", params.from);
        if (params.to)
            q.set("to", params.to);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/cashbook${s ? `?${s}` : ""}`);
    },
};
// ── Suppliers (Vendors) API ───────────────────────────────────────────────────
exports.supplierApi = {
    list: (params) => {
        const q = new URLSearchParams();
        if (params?.q)
            q.set("q", params.q);
        if (params?.limit)
            q.set("limit", String(params.limit ?? 100));
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/suppliers${s ? `?${s}` : ""}`);
    },
    create: (data) => (0, shared_1.apiFetch)("/api/v1/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
    }),
};
// ── Purchases API ─────────────────────────────────────────────────────────────
exports.purchaseApi = {
    list: (params = {}) => {
        const q = new URLSearchParams();
        if (params.from)
            q.set("from", params.from);
        if (params.to)
            q.set("to", params.to);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/purchases${s ? `?${s}` : ""}`);
    },
    create: (data) => (0, shared_1.apiFetch)("/api/v1/purchases", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    remove: (id) => (0, shared_1.apiFetch)(`/api/v1/purchases/${id}`, { method: "DELETE" }),
};
// ── Summary API ───────────────────────────────────────────────────────────────
exports.summaryApi = {
    daily: (date) => (0, shared_1.apiFetch)(`/api/v1/summary/daily${date ? `?date=${date}` : ""}`),
    range: (from, to) => (0, shared_1.apiFetch)(`/api/v1/summary/range?from=${from}&to=${to}`),
};
// ── Global auth-expiry callback ───────────────────────────────────────────────
// Set this after navigation is ready so we can navigate to the Login screen.
let _onAuthExpired = null;
function setAuthExpiredHandler(fn) {
    _onAuthExpired = fn;
}
function bootApi() {
    (0, shared_1.initApiClient)({
        baseUrl: (0, exports.getApiBaseUrl)(),
        getToken: storage_1.tokenStorage.getToken,
        getRefreshToken: storage_1.tokenStorage.getRefreshToken,
        setTokens: storage_1.tokenStorage.setTokens,
        clearTokens: storage_1.tokenStorage.clearTokens,
        onAuthExpired: () => _onAuthExpired?.(),
    });
}
// ── Push API (Sprint 15) ───────────────────────────────────────────────────────
exports.pushApi = {
    register: (token, platform) => (0, shared_1.apiFetch)("/api/v1/push/register", {
        method: "POST",
        body: JSON.stringify({ token, platform }),
    }),
};
// ── Feedback API ──────────────────────────────────────────────────────────────
exports.feedbackApi = {
    submit: (data) => (0, shared_1.apiFetch)("/api/v1/feedback", { method: "POST", body: JSON.stringify(data) }),
};
// ── Product extensions (low-stock, expiry, write-off, inventory management) ─
exports.productExtApi = {
    // Low-stock alerts and expiry tracking
    lowStock: () => (0, shared_1.apiFetch)("/api/v1/products/low-stock"),
    expiringBatches: (days = 30) => (0, shared_1.apiFetch)(`/api/v1/products/expiring?days=${days}`),
    expiryPage: (filter = "30d") => (0, shared_1.apiFetch)(`/api/v1/products/expiry-page?filter=${filter}`),
    writeOffBatch: (batchId) => (0, shared_1.apiFetch)(`/api/v1/products/batches/${batchId}/write-off`, { method: "PATCH" }),
    create: (data) => (0, shared_1.apiFetch)("/api/v1/products", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id, data) => (0, shared_1.apiFetch)(`/api/v1/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    adjustStock: (id, quantity, operation, reason = "Mobile app adjustment") => (0, shared_1.apiFetch)(`/api/v1/products/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ quantity, operation, reason }),
    }),
    // Image & media
    getImageUrls: (ids) => (0, shared_1.apiFetch)(`/api/v1/products/image-urls?ids=${ids.slice(0, 50).join(",")}`),
};
// ── Reports API (PnL, etc.) ───────────────────────────────────────────────────
exports.reportsApi = {
    gstr1: (params) => {
        const q = new URLSearchParams();
        if (params?.from)
            q.set("from", params.from);
        if (params?.to)
            q.set("to", params.to);
        if (params?.fy)
            q.set("fy", params.fy);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/reports/gstr1${s ? `?${s}` : ""}`);
    },
    pnl: (params) => {
        const q = new URLSearchParams();
        if (params?.from)
            q.set("from", params.from);
        if (params?.to)
            q.set("to", params.to);
        if (params?.fy)
            q.set("fy", params.fy);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/reports/pnl${s ? `?${s}` : ""}`);
    },
};
// ── Credit Notes API ─────────────────────────────────────────────────────────
exports.creditNoteApi = {
    list: (params) => {
        const q = new URLSearchParams();
        if (params?.limit)
            q.set("limit", String(params.limit));
        if (params?.customerId)
            q.set("customerId", params.customerId);
        if (params?.status)
            q.set("status", params.status);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/credit-notes${s ? `?${s}` : ""}`);
    },
};
// ── Purchase Orders API ──────────────────────────────────────────────────────
exports.purchaseOrderApi = {
    list: (params) => {
        const q = new URLSearchParams();
        if (params?.status)
            q.set("status", params.status);
        if (params?.limit)
            q.set("limit", String(params.limit ?? 50));
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/purchase-orders${s ? `?${s}` : ""}`);
    },
};
// ── Monitoring API (Sprint 14) ───────────────────────────────────────────────
exports.monitoringApi = {
    getEvents: (params) => {
        const q = new URLSearchParams();
        if (params?.limit)
            q.set("limit", String(params.limit));
        if (params?.offset)
            q.set("offset", String(params.offset));
        if (params?.unreadOnly)
            q.set("unreadOnly", "true");
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/monitoring/events${s ? `?${s}` : ""}`);
    },
    getUnreadCount: () => (0, shared_1.apiFetch)("/api/v1/monitoring/events/unread"),
    markAllRead: async () => {
        const baseUrl = (0, exports.getApiBaseUrl)();
        const token = storage_1.tokenStorage.getToken();
        const res = await fetch(`${baseUrl}/api/v1/monitoring/events/read-all`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok)
            throw new Error(await res.text().catch(() => String(res.status)));
    },
    markRead: async (id) => {
        const baseUrl = (0, exports.getApiBaseUrl)();
        const token = storage_1.tokenStorage.getToken();
        const res = await fetch(`${baseUrl}/api/v1/monitoring/events/${id}/read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok)
            throw new Error(await res.text().catch(() => String(res.status)));
    },
    logEvent: (data) => (0, shared_1.apiFetch)("/api/v1/monitoring/events", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    getStats: (params) => {
        const q = new URLSearchParams();
        if (params?.from)
            q.set("from", params.from);
        if (params?.to)
            q.set("to", params.to);
        const s = q.toString();
        return (0, shared_1.apiFetch)(`/api/v1/monitoring/stats${s ? `?${s}` : ""}`);
    },
    submitCashReconciliation: (data) => (0, shared_1.apiFetch)("/api/v1/monitoring/cash-reconciliation", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    getCashReconciliation: (date) => (0, shared_1.apiFetch)(`/api/v1/monitoring/cash-reconciliation/${date}`),
};
// Re-export the API functions so screens import from one place
exports.authExtApi = {
    uploadLogo: async (uri, mimeType = "image/jpeg") => {
        const base = (0, exports.getApiBaseUrl)();
        const token = storage_1.tokenStorage.getToken();
        if (!token)
            throw new Error("Not authenticated");
        const ext = mimeType.split("/")[1] ?? "jpg";
        const formData = new FormData();
        formData.append("file", {
            uri,
            name: `logo.${ext}`,
            type: mimeType,
        });
        const res = await fetch(`${base}/api/v1/auth/me/logo`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error ?? "Upload failed");
        }
        return res.json();
    },
    updateProfile: (data) => (0, shared_1.apiFetch)("/api/v1/auth/me/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    }),
};
//# sourceMappingURL=api.js.map
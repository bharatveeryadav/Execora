// ── Admin API client ─────────────────────────────────────────────────────────
// Uses x-admin-key header instead of JWT. Key stored in sessionStorage.

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const ADMIN_KEY_STORAGE = "execora_admin_key";

export function getAdminKey(): string | null {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey(): void {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getAdminKey();
  if (!key) throw new Error("No admin key set");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearAdminKey();
    throw new Error("Invalid admin key");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export const adminGetDashboard = () => adminFetch<AdminDashboard>("/admin/dashboard");

// ── Health ─────────────────────────────────────────────────────────────────
export const adminGetHealth   = () => adminFetch<AdminHealth>("/admin/health/system");
export const adminGetProviders = () => adminFetch<AdminProviders>("/admin/health/providers");

// ── Queue stats ────────────────────────────────────────────────────────────
export const adminGetQueueStats = () => adminFetch<AdminQueueStats>("/admin/queue-stats");

// ── Config ─────────────────────────────────────────────────────────────────
export const adminGetConfig   = () => adminFetch<Record<string, unknown>>("/admin/config");
export const adminPutConfig   = (body: Record<string, unknown>) =>
  adminFetch<{ success: boolean; config: Record<string, unknown> }>("/admin/config", {
    method: "PUT",
    body: JSON.stringify(body),
  });
export const adminResetConfig = () =>
  adminFetch<{ success: boolean }>("/admin/config/reset", { method: "POST" });

// ── Users ──────────────────────────────────────────────────────────────────
export const adminGetUsers = (params?: { page?: number; limit?: number; q?: string }) =>
  adminFetch<AdminListResponse<AdminUser>>(`/admin/users?${buildQs(params)}`);
export const adminUpdateUserPassword = (id: string, password: string) =>
  adminFetch<{ success: boolean }>(`/admin/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });

// ── Tenants ────────────────────────────────────────────────────────────────
export const adminGetTenants = (params?: { page?: number; limit?: number; q?: string }) =>
  adminFetch<AdminListResponse<AdminTenant>>(`/admin/tenants?${buildQs(params)}`);
export const adminGetTenant = (id: string) =>
  adminFetch<{ tenant: AdminTenant }>(`/admin/tenants/${id}`);
export const adminCreateTenant = (body: {
  name: string; ownerEmail: string; ownerName: string; ownerPassword: string;
  businessType?: string; plan?: string;
}) => adminFetch<{ tenant: AdminTenant }>("/admin/tenants", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateTenantFeatures = (id: string, features: Record<string, boolean>) =>
  adminFetch<{ tenant: AdminTenant }>(`/admin/tenants/${id}/features`, {
    method: "PUT",
    body: JSON.stringify({ features }),
  });

// ── Customers ──────────────────────────────────────────────────────────────
export const adminGetCustomers = (params?: { page?: number; limit?: number; q?: string }) =>
  adminFetch<AdminListResponse<AdminCustomer>>(`/admin/customers?${buildQs(params)}`);

// ── Invoices ───────────────────────────────────────────────────────────────
export const adminGetInvoices = (params?: { page?: number; limit?: number; status?: string }) =>
  adminFetch<AdminListResponse<AdminInvoice>>(`/admin/invoices?${buildQs(params)}`);

// ── Products ───────────────────────────────────────────────────────────────
export const adminGetProducts = (params?: { page?: number; limit?: number; q?: string }) =>
  adminFetch<AdminListResponse<AdminProduct>>(`/admin/products?${buildQs(params)}`);
export const adminGetLowStock = (threshold?: number) =>
  adminFetch<{ data: AdminProduct[]; threshold: number }>(
    `/admin/products/low-stock${threshold !== undefined ? `?threshold=${threshold}` : ""}`
  );

// ── Payments ───────────────────────────────────────────────────────────────
export const adminGetPayments = (params?: { page?: number; limit?: number }) =>
  adminFetch<AdminListResponse<AdminPayment>>(`/admin/payments?${buildQs(params)}`);
export const adminGetPaymentSummary = () =>
  adminFetch<AdminPaymentSummary>("/admin/payments/summary");

// ── Reminders ──────────────────────────────────────────────────────────────
export const adminGetReminders = (params?: { page?: number; limit?: number; status?: string }) =>
  adminFetch<AdminListResponse<AdminReminder>>(`/admin/reminders?${buildQs(params)}`);

// ── Sessions ───────────────────────────────────────────────────────────────
export const adminGetSessions = () =>
  adminFetch<{ data: AdminSession[] }>("/admin/sessions");

// ── Message logs ───────────────────────────────────────────────────────────
export const adminGetMessageLogs = (params?: { page?: number; limit?: number; channel?: string }) =>
  adminFetch<AdminListResponse<AdminMessageLog>>(`/admin/message-logs?${buildQs(params)}`);

// ── helpers ────────────────────────────────────────────────────────────────
function buildQs(params?: Record<string, unknown>): string {
  if (!params) return "";
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface AdminListResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary?: Record<string, unknown>;
}

export interface AdminDashboard {
  customers: { total: number; totalPendingBalance: number };
  invoices: { byStatus: Record<string, number> };
  payments: { todayCount: number; todayRevenue: number };
  reminders: { byStatus: Record<string, number> };
  queues: { reminders: Record<string, number>; whatsapp: Record<string, number> };
  timestamp: string;
}

export interface AdminHealth {
  status: "ok" | "degraded";
  checks: Record<string, "ok" | "error">;
  workers: Record<string, { active: number }>;
  timestamp: string;
}

export interface AdminProviders {
  stt: { provider: string; available: boolean };
  tts: { provider: string; available: boolean };
  timestamp: string;
}

export interface AdminQueueStats {
  reminders: Record<string, number>;
  whatsapp: Record<string, number>;
  media: Record<string, number>;
  timestamp: string;
}

export interface AdminUser {
  id: string; tenantId: string; email: string; name: string;
  role: string; isActive: boolean; lastLogin: string | null; createdAt: string;
}

export interface AdminTenant {
  id: string; name: string; subdomain?: string; businessType: string;
  plan: string; status: string; gstin?: string; gstRegistered: boolean;
  legalName?: string; currency: string; createdAt: string;
  _count?: { users: number; customers: number; invoices: number };
}

export interface AdminCustomer {
  id: string; name: string; phone?: string; balance: number;
  totalPurchases: number; totalPayments: number; createdAt: string;
}

export interface AdminInvoice {
  id: string; invoiceNo: string; total: number; status: string;
  createdAt: string; customer: { id: string; name: string; phone?: string };
}

export interface AdminProduct {
  id: string; name: string; category?: string; price: number;
  stock: number; unit: string; gstRate?: number; createdAt: string;
}

export interface AdminPayment {
  id: string; amount: number; method: string; receivedAt: string;
  customer: { id: string; name: string };
}

export interface AdminPaymentSummary {
  byMethod: { method: string; amount: number; count: number }[];
  total: { amount: number; count: number };
}

export interface AdminReminder {
  id: string; status: string; reminderType: string; scheduledTime: string;
  customer: { id: string; name: string; phone?: string };
}

export interface AdminSession {
  id: string; createdAt: string;
  customer: { id: string; name: string } | null;
  _count: { turns: number };
}

export interface AdminMessageLog {
  id: string; channel: string; recipient: string; status: string;
  errorMessage?: string; createdAt: string;
  customer: { id: string; name: string } | null;
}

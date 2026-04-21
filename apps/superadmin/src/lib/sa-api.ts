// ── Super Admin API client ────────────────────────────────────────────────
// Uses x-admin-key header (same key as admin panel — platform-level secret)

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const SA_KEY_STORAGE = "execora_sa_key";

export function getSAKey(): string | null {
  return sessionStorage.getItem(SA_KEY_STORAGE);
}
export function setSAKey(key: string): void {
  sessionStorage.setItem(SA_KEY_STORAGE, key);
}
export function clearSAKey(): void {
  sessionStorage.removeItem(SA_KEY_STORAGE);
}

async function saFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getSAKey();
  if (!key) throw new Error("No super admin key set");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearSAKey();
    throw new Error("Invalid admin key");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

function buildQs(params?: Record<string, unknown>): string {
  if (!params) return "";
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
}

// ── Auth check ─────────────────────────────────────────────────────────────
export const saGetHealth = () => saFetch<SAHealth>("/admin/health/system");

// ── Dashboard / analytics ─────────────────────────────────────────────────
export const saGetDashboard      = () => saFetch<SADashboard>("/admin/dashboard");
export const saGetAnalyticsRevenue = (days = 30) =>
  saFetch<{ data: SARevenuePoint[]; period: number }>(`/admin/analytics/revenue?days=${days}`);
export const saGetTopTenants     = (limit = 10) =>
  saFetch<{ data: SATopTenant[] }>(`/admin/analytics/top-tenants?limit=${limit}`);
export const saGetTenantAnalytics = () =>
  saFetch<SATenantAnalytics>("/admin/analytics/tenants");

// ── Tenants ────────────────────────────────────────────────────────────────
export const saGetTenants = (params?: { page?: number; limit?: number; q?: string; plan?: string; status?: string }) =>
  saFetch<SAListResponse<SATenant>>(`/admin/tenants?${buildQs(params)}`);
export const saGetTenant = (id: string) =>
  saFetch<{ tenant: SATenantDetail }>(`/admin/tenants/${id}`);
export const saCreateTenant = (body: {
  name: string; ownerEmail: string; ownerName: string; ownerPassword: string;
  businessType?: string; plan?: string;
}) => saFetch<{ tenant: SATenant }>("/admin/tenants", { method: "POST", body: JSON.stringify(body) });
export const saUpdateTenant = (id: string, body: {
  name?: string; plan?: string; status?: string; gstin?: string; legalName?: string;
}) => saFetch<{ tenant: SATenant }>(`/admin/tenants/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const saDeleteTenant = (id: string, confirm: string) =>
  saFetch<{ success: boolean }>(`/admin/tenants/${id}`, {
    method: "DELETE", body: JSON.stringify({ confirm }),
  });

export const saUpdateTenantFeatures = (id: string, features: Record<string, boolean>) =>
  saFetch<{ tenant: SATenant }>(`/admin/tenants/${id}/features`, {
    method: "PUT", body: JSON.stringify(features),
  });

// ── Users ──────────────────────────────────────────────────────────────────
export const saGetUsers = (params?: { page?: number; limit?: number; q?: string; role?: string }) =>
  saFetch<SAListResponse<SAUser>>(`/admin/users?${buildQs(params)}`);
export const saUpdateUserStatus = (id: string, isActive: boolean) =>
  saFetch<{ success: boolean }>(`/admin/users/${id}/status`, {
    method: "PUT", body: JSON.stringify({ isActive }),
  });
export const saUpdateUserPassword = (id: string, password: string) =>
  saFetch<{ success: boolean }>(`/admin/users/${id}/password`, {
    method: "PUT", body: JSON.stringify({ newPassword: password }),
  });

// ── Announcements ──────────────────────────────────────────────────────────
export const saGetAnnouncements = () =>
  saFetch<{ data: SAAnnouncement[] }>("/admin/announcements");
export const saCreateAnnouncement = (body: {
  title: string; message: string; level: SAAnnouncement["level"]; expiresAt?: string;
}) => saFetch<{ announcement: SAAnnouncement }>("/admin/announcements", {
  method: "POST", body: JSON.stringify(body),
});
export const saDeleteAnnouncement = (id: string) =>
  saFetch<{ success: boolean }>(`/admin/announcements/${id}`, { method: "DELETE" });

// ── Maintenance mode ───────────────────────────────────────────────────────
export const saGetMaintenance = () =>
  saFetch<SAMaintenanceStatus>("/admin/maintenance");
export const saSetMaintenance = (enabled: boolean, reason?: string) =>
  saFetch<SAMaintenanceStatus>("/admin/maintenance", {
    method: "PUT", body: JSON.stringify({ enabled, reason }),
  });

// ── Config ─────────────────────────────────────────────────────────────────
export const saGetConfig   = () => saFetch<Record<string, unknown>>("/admin/config");
export const saPutConfig   = (body: Record<string, unknown>) =>
  saFetch<{ success: boolean; config: Record<string, unknown> }>("/admin/config", {
    method: "PUT", body: JSON.stringify(body),
  });
export const saResetConfig = () =>
  saFetch<{ success: boolean }>("/admin/config/reset", { method: "POST" });

// ── Activity log ───────────────────────────────────────────────────────────
export const saGetActivity = (params?: { page?: number; limit?: number; tenantId?: string; action?: string }) =>
  saFetch<SAListResponse<SAActivityEntry>>(`/admin/activity?${buildQs(params)}`);

// ── Queue stats ────────────────────────────────────────────────────────────
export const saGetQueueStats = () =>
  saFetch<SAQueueStats>("/admin/queue-stats");

// ── Health ─────────────────────────────────────────────────────────────────
export const saGetProviders = () =>
  saFetch<SAProviders>("/admin/health/providers");

// ── Billing & Subscription ─────────────────────────────────────────────────
export const saGetTenantBilling = (tenantId: string) =>
  saFetch<{ tenant: SATenant; events: SABillingEvent[]; credits: SATenantCredit[] }>(`/admin/tenants/${tenantId}/billing`);

export const saExtendTrial = (tenantId: string, days: number, note?: string) =>
  saFetch<SATenant>(`/admin/tenants/${tenantId}/billing/extend-trial`, {
    method: "POST",
    body: JSON.stringify({ days, note }),
  });

export const saChangePlan = (tenantId: string, plan: string, note?: string) =>
  saFetch<SATenant>(`/admin/tenants/${tenantId}/billing/change-plan`, {
    method: "POST",
    body: JSON.stringify({ plan, note }),
  });

export const saAddCredits = (tenantId: string, amount: number, reason: string, expiresAt?: string) =>
  saFetch<SATenantCredit>(`/admin/tenants/${tenantId}/billing/add-credits`, {
    method: "POST",
    body: JSON.stringify({ amount, reason, expiresAt }),
  });

export const saSuspendTenant = (tenantId: string, reason?: string) =>
  saFetch<SATenant>(`/admin/tenants/${tenantId}/billing/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const saReactivateTenant = (tenantId: string, note?: string) =>
  saFetch<SATenant>(`/admin/tenants/${tenantId}/billing/reactivate`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });

// ═══ Types ═══════════════════════════════════════════════════════════════════

export interface SAListResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface SAHealth {
  status: "ok" | "degraded";
  checks: Record<string, "ok" | "error">;
  timestamp: string;
}

export interface SADashboard {
  customers: { total: number; totalPendingBalance: number };
  invoices: { byStatus: Record<string, number> };
  payments: { todayCount: number; todayRevenue: number };
  reminders: { byStatus: Record<string, number> };
  queues: { reminders: Record<string, number>; whatsapp: Record<string, number> };
  timestamp: string;
}

export interface SARevenuePoint {
  date: string; amount: number; count: number;
}

export interface SATopTenant {
  tenantId: string; tenantName: string; revenue: number; invoiceCount: number;
}

export interface SATenantAnalytics {
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
  newThisMonth: number;
}

export interface SATenant {
  id: string; name: string; subdomain?: string; businessType: string;
  plan: string; status: string; gstin?: string; gstRegistered: boolean;
  legalName?: string; currency: string; createdAt: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  features?: Record<string, boolean>;
  _count?: { users: number; customers: number; invoices: number };
}

export interface SATenantDetail extends SATenant {
  _count: { users: number; customers: number; invoices: number; payments: number; reminders: number };
  users: { id: string; email: string; name: string; role: string; isActive: boolean; lastLogin: string | null }[];
}

export interface SAUser {
  id: string; tenantId: string; email: string; name: string;
  role: string; isActive: boolean; lastLogin: string | null; createdAt: string;
}

export interface SAAnnouncement {
  id: string; title: string; message: string;
  level: "info" | "warning" | "critical";
  expiresAt?: string | null; createdAt: string;
}

export interface SAMaintenanceStatus {
  enabled: boolean; reason?: string; enabledAt?: string;
}

export interface SAActivityEntry {
  id: string; action: string; entityType: string; entityId: string;
  details: Record<string, unknown> | null; ipAddress?: string; createdAt: string;
  tenant: { id: string; name: string } | null;
  user: { id: string; name: string; email: string } | null;
}

export interface SAQueueStats {
  reminders: Record<string, number>;
  whatsapp: Record<string, number>;
  media: Record<string, number>;
  timestamp: string;
}

export interface SAProviders {
  stt: { provider: string; available: boolean };
  tts: { provider: string; available: boolean };
  timestamp: string;
}

export interface SABillingEvent {
  id: string;
  tenantId: string;
  type: "plan_change" | "trial_extended" | "credits_added" | "subscription_renewed" | "suspended" | "reactivated";
  fromPlan?: string | null;
  toPlan?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  performedBy: string;
  createdAt: string;
}

export interface SATenantCredit {
  id: string;
  tenantId: string;
  amount: number;
  reason: string;
  expiresAt?: string | null;
  grantedBy: string;
  createdAt: string;
}

export interface SAPlatformEmail {
  id: string;
  subject: string;
  body: string;
  sentTo: string[];
  sentBy: string;
  sentAt: string;
}

export const saSendPlatformEmail = (subject: string, body: string, sentTo: string[]) =>
  saFetch<{ email: SAPlatformEmail }>(
    "/admin/communications/email",
    { method: "POST", body: JSON.stringify({ subject, body, sentTo }) }
  );

export const saGetPlatformEmails = () =>
  saFetch<{ data: SAPlatformEmail[] }>("/admin/communications/email");

export interface SATenantQuota {
  tenantId: string;
  maxUsers?: number;
  maxInvoices?: number;
  maxStorage?: number;
  maxCustomers?: number;
  maxProducts?: number;
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export const saGetTenantQuota = (id: string) =>
  saFetch<{ quota: SATenantQuota | null }>(`/admin/tenants/${id}/quota`);

export const saUpdateTenantQuota = (id: string, quota: Partial<SATenantQuota>) =>
  saFetch<{ quota: SATenantQuota }>(`/admin/tenants/${id}/quota`, {
    method: "PUT",
    body: JSON.stringify(quota),
  });

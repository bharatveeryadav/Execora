/**
 * Platform-agnostic API client.
 *
 * Token storage is injected via `initApiClient()` so the same fetch logic
 * works in both environments:
 *   • Web  → localStorage
 *   • Mobile → MMKV / AsyncStorage
 *
 * Usage:
 *   // web/src/lib/api.ts
 *   initApiClient({
 *     baseUrl: import.meta.env.VITE_API_BASE_URL,
 *     getToken: () => localStorage.getItem("execora_token"),
 *     getRefreshToken: () => localStorage.getItem("execora_refresh"),
 *     setTokens: (a, r) => { localStorage.setItem("execora_token", a); ... },
 *     clearTokens: () => { localStorage.removeItem("execora_token"); ... },
 *     onAuthExpired: () => window.dispatchEvent(new Event("execora:auth-expired")),
 *   });
 *
 *   // mobile/src/lib/api.ts
 *   initApiClient({
 *     baseUrl: process.env.EXPO_PUBLIC_API_URL,
 *     getToken: () => storage.getString("execora_token") ?? null,
 *     ...
 *   });
 */

import type {
  Customer,
  Product,
  Invoice,
  PaginatedCustomers,
  PaginatedProducts,
  PaginatedInvoices,
  CreateInvoicePayload,
} from "./types";

export interface ApiAdapters {
  baseUrl: string;
  getToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clearTokens(): void;
  onAuthExpired(): void;
}

let _adapters: ApiAdapters | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function initApiClient(adapters: ApiAdapters): void {
  _adapters = adapters;
}

function adapters(): ApiAdapters {
  if (!_adapters) throw new Error("Call initApiClient() before using the API.");
  return _adapters;
}

// ── Core fetch ───────────────────────────────────────────────────────────────

async function tryRefresh(): Promise<string | null> {
  const a = adapters();
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const rt = a.getRefreshToken();
    if (!rt) {
      a.clearTokens();
      return null;
    }
    const res = await fetch(`${a.baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      a.clearTokens();
      return null;
    }
    const payload = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!payload.accessToken) {
      a.clearTokens();
      return null;
    }
    a.setTokens(payload.accessToken, payload.refreshToken ?? rt);
    return payload.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const a = adapters();
  const token = a.getToken();

  const doFetch = async (t: string | null): Promise<Response> =>
    fetch(`${a.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers ?? {}),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (!newToken) {
      a.onAuthExpired();
      throw new Error("Session expired");
    }
    res = await doFetch(newToken);
  }

  if (!res.ok) {
    const err = (await res
      .json()
      .catch(() => ({ message: res.statusText }))) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: unknown }>(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),
  me: () => apiFetch<{ user: unknown }>("/api/v1/auth/me"),
};

// ── Customers ────────────────────────────────────────────────────────────────

export const customerApi = {
  search: (q: string, limit = 8) =>
    apiFetch<PaginatedCustomers>(
      `/api/v1/customers?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  get: (id: string) =>
    apiFetch<{ customer: Customer }>(`/api/v1/customers/${id}`),

  create: (data: { name: string; phone?: string; email?: string }) =>
    apiFetch<{ customer: Customer }>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Customer>) =>
    apiFetch<{ customer: Customer }>(`/api/v1/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  list: (page = 1, limit = 20) =>
    apiFetch<PaginatedCustomers>(
      `/api/v1/customers?page=${page}&limit=${limit}`,
    ),
};

// ── Products ─────────────────────────────────────────────────────────────────

export const productApi = {
  search: (q: string, limit = 8) =>
    apiFetch<PaginatedProducts>(
      `/api/v1/products/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  list: (page = 1, limit = 50) =>
    apiFetch<PaginatedProducts>(`/api/v1/products?page=${page}&limit=${limit}`),

  get: (id: string) => apiFetch<{ product: Product }>(`/api/v1/products/${id}`),

  byBarcode: (code: string) =>
    apiFetch<{ product: Product }>(`/api/v1/products/barcode/${code}`),
};

// ── Invoices ─────────────────────────────────────────────────────────────────

export const invoiceApi = {
  create: (data: CreateInvoicePayload) =>
    apiFetch<{ invoice: Invoice }>("/api/v1/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: string) => apiFetch<{ invoice: Invoice }>(`/api/v1/invoices/${id}`),

  list: (page = 1, limit = 20, customerId?: string) =>
    apiFetch<PaginatedInvoices>(
      `/api/v1/invoices?page=${page}&limit=${limit}${customerId ? `&customerId=${customerId}` : ""}`,
    ),

  pdf: (id: string) => apiFetch<Blob>(`/api/v1/invoices/${id}/pdf`),
};

/**
 * Execora API client — React Native version.
 * Same endpoints as web; uses AsyncStorage for token storage.
 */
import { storage, TOKEN_KEY, REFRESH_KEY, USER_KEY } from './storage';

let _apiBase = 'http://localhost:3006'; // override via Settings or build var

export function setApiBase(url: string) {
  _apiBase = url.replace(/\/$/, '');
}

export function getApiBase() { return _apiBase; }

// ── Core fetch ────────────────────────────────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await storage.get(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${_apiBase}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) { await clearAuth(); return null; }
      const data = await res.json() as { accessToken: string; refreshToken: string; user?: unknown };
      if (!data.accessToken) { await clearAuth(); return null; }
      await storage.set(TOKEN_KEY,   data.accessToken);
      await storage.set(REFRESH_KEY, data.refreshToken);
      if (data.user) await storage.setJSON(USER_KEY, data.user);
      return data.accessToken;
    } catch { return null; }
  })();
  try { return await refreshInFlight; } finally { refreshInFlight = null; }
}

async function clearAuth() {
  await storage.remove(TOKEN_KEY);
  await storage.remove(REFRESH_KEY);
  await storage.remove(USER_KEY);
}

export async function request<T>(
  path: string,
  opts: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = await storage.get(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${_apiBase}${path}`, { ...opts, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, opts, false);
    throw new Error('AUTH_EXPIRED');
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const body = await res.json(); msg = body.message ?? body.error ?? msg; } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : {} as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string; name: string; phone?: string; email?: string;
  balance?: number; creditLimit?: number; tags?: string[];
  city?: string; address?: string; gstin?: string;
  createdAt: string; updatedAt: string;
}

export interface Product {
  id: string; name: string; sku?: string; barcode?: string;
  category?: string; unit?: string; mrp?: number; cost?: number;
  gstRate?: number; hsnCode?: string; stock: number;
  lowStockThreshold?: number; imageUrl?: string;
  createdAt: string; updatedAt: string;
}

export interface InvoiceItem {
  productId?: string; name: string; qty: number; unit?: string;
  rate: number; discount?: number; taxRate?: number;
  amount: number; cgst?: number; sgst?: number; igst?: number;
}

export interface Invoice {
  id: string; invoiceNo: string; type: 'sales' | 'purchase' | 'quotation' | 'proforma';
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  customerId?: string; customer?: Customer;
  date: string; dueDate?: string;
  items: InvoiceItem[];
  subtotal: number; discountAmount?: number; taxAmount?: number;
  total: number; paidAmount?: number; pendingAmount?: number;
  notes?: string; paymentTerms?: string;
  createdAt: string; updatedAt: string;
}

export interface Payment {
  id: string; invoiceId?: string; customerId?: string; customer?: Customer;
  amount: number; method: 'cash' | 'upi' | 'card' | 'bank' | 'credit';
  reference?: string; notes?: string;
  date: string; createdAt: string;
}

export interface Expense {
  id: string; category: string; amount: number;
  supplier?: string; note?: string; date: string; createdAt: string;
}

export interface DayBookEntry {
  id: string; type: 'invoice' | 'payment' | 'expense' | 'cash_in' | 'cash_out';
  label: string; sublabel?: string; amount: number; isCredit: boolean;
  refId?: string; createdAt: string;
}

export interface MonitoringEvent {
  id: string; eventType: string; description: string;
  amount?: number; severity: string;
  entityType?: string; entityId?: string;
  userId?: string; user?: { name: string };
  meta?: Record<string, unknown>; isRead?: boolean;
  createdAt: string;
}

export interface MonitoringStats {
  byType: Record<string, number>;
  byEmployee: Record<string, { bills: number; payments: number; cancellations: number; totalAmount: number }>;
  total: number; totalBillAmount: number; avgBillAmount: number;
  footfall: number; conversionRate: number | null;
  hourlyBills: Record<string, number>; peakHour: number | null;
}

// ── API Methods ───────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, tenantId?: string) =>
    request<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>(
      '/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantId: tenantId ?? 'system-tenant-001' }),
      }
    ),
};

export const customerApi = {
  list: (search?: string, limit = 50) =>
    request<{ customers: Customer[] }>(
      `/api/v1/customers?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),
  get: (id: string) => request<{ customer: Customer }>(`/api/v1/customers/${id}`),
  create: (data: Partial<Customer>) =>
    request<{ customer: Customer }>('/api/v1/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Customer>) =>
    request<{ customer: Customer }>(`/api/v1/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/customers/${id}`, { method: 'DELETE' }),
  ledger: (id: string) =>
    request<{ entries: Array<{ date: string; description: string; debit: number; credit: number; balance: number }> }>(
      `/api/v1/customers/${id}/ledger`
    ),
};

export const productApi = {
  list: (search?: string, limit = 100) =>
    request<{ products: Product[] }>(
      `/api/v1/products?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    ),
  get: (id: string) => request<{ product: Product }>(`/api/v1/products/${id}`),
  create: (data: Partial<Product>) =>
    request<{ product: Product }>('/api/v1/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) =>
    request<{ product: Product }>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/products/${id}`, { method: 'DELETE' }),
  adjustStock: (id: string, adjustment: number, note?: string) =>
    request<{ product: Product }>(`/api/v1/products/${id}/stock`, {
      method: 'POST', body: JSON.stringify({ adjustment, note }),
    }),
  lowStock: () => request<{ products: Product[] }>('/api/v1/products/low-stock'),
};

export const invoiceApi = {
  list: (params?: {
    type?: string; status?: string; customerId?: string;
    from?: string; to?: string; search?: string; limit?: number; offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.type)       qs.set('type',       params.type);
    if (params?.status)     qs.set('status',     params.status);
    if (params?.customerId) qs.set('customerId', params.customerId);
    if (params?.from)       qs.set('from',       params.from);
    if (params?.to)         qs.set('to',         params.to);
    if (params?.search)     qs.set('search',     params.search);
    if (params?.limit)      qs.set('limit',      String(params.limit));
    if (params?.offset)     qs.set('offset',     String(params.offset));
    return request<{ invoices: Invoice[]; total: number }>(`/api/v1/invoices?${qs}`);
  },
  get: (id: string) => request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`),
  create: (data: {
    type?: string; customerId?: string; date: string; dueDate?: string;
    items: InvoiceItem[]; discount?: number; notes?: string;
    paymentMethod?: string; paidAmount?: number;
  }) => request<{ invoice: Invoice }>('/api/v1/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Invoice>) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancel: (id: string, reason?: string) =>
    request<{ invoice: Invoice }>(`/api/v1/invoices/${id}/cancel`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }),
  recordPayment: (id: string, data: { amount: number; method: string; reference?: string; date?: string }) =>
    request<{ payment: Payment }>(`/api/v1/invoices/${id}/payment`, {
      method: 'POST', body: JSON.stringify(data),
    }),
  getPdf: (id: string) => `${_apiBase}/api/v1/invoices/${id}/pdf`,
};

export const paymentApi = {
  record: (data: {
    customerId: string; amount: number; method: string;
    reference?: string; notes?: string; date?: string; invoiceIds?: string[];
  }) => request<{ payment: Payment }>('/api/v1/payments', { method: 'POST', body: JSON.stringify(data) }),
  list: (params?: { customerId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set('customerId', params.customerId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to)   qs.set('to',   params.to);
    return request<{ payments: Payment[] }>(`/api/v1/payments?${qs}`);
  },
};

export const expenseApi = {
  list: (params?: { from?: string; to?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from)     qs.set('from',     params.from);
    if (params?.to)       qs.set('to',       params.to);
    if (params?.category) qs.set('category', params.category);
    return request<{ expenses: Expense[]; total: number }>(`/api/v1/expenses?${qs}`);
  },
  create: (data: { category: string; amount: number; supplier?: string; note?: string; date: string }) =>
    request<{ expense: Expense }>('/api/v1/expenses', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/expenses/${id}`, { method: 'DELETE' }),
};

export const reportApi = {
  summary: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to',   to);
    return request<{
      totalRevenue: number; totalExpenses: number; profit: number;
      totalBills: number; totalPaid: number; totalPending: number;
    }>(`/api/v1/reports/summary?${qs}`);
  },
  daybook: (date: string) =>
    request<{ entries: DayBookEntry[] }>(`/api/v1/reports/daybook?date=${date}`),
  gstr1: (month: string) =>
    request<{ data: Record<string, unknown> }>(`/api/v1/reports/gstr1?month=${month}`),
  aging: () =>
    request<{ customers: Array<{ customer: Customer; total: number; buckets: Record<string, number> }> }>(
      '/api/v1/reports/aging'
    ),
};

export const monitoringApi = {
  listEvents: (params?: { limit?: number; userId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit)  qs.set('limit',  String(params.limit));
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.from)   qs.set('from',   params.from);
    if (params?.to)     qs.set('to',     params.to);
    return request<{ events: MonitoringEvent[]; total: number }>(`/api/v1/monitoring/events?${qs}`);
  },
  stats: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to',   to);
    return request<MonitoringStats>(`/api/v1/monitoring/stats?${qs}`);
  },
  unreadCount: () => request<{ count: number }>('/api/v1/monitoring/events/unread'),
  readAll: () => request<void>('/api/v1/monitoring/events/read-all', { method: 'POST', body: '{}' }),
};

export const settingsApi = {
  getProfile: () => request<{ business: Record<string, unknown> }>('/api/v1/settings/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    request<{ business: Record<string, unknown> }>('/api/v1/settings/profile', {
      method: 'PUT', body: JSON.stringify(data),
    }),
  listUsers: () => request<{ users: Array<{ id: string; name: string; email: string; role: string }> }>('/api/v1/users'),
};

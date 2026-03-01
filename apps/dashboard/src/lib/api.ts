import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

type RefreshResult = {
  accessToken: string | null;
  shouldLogout: boolean;
};

let refreshPromise: Promise<RefreshResult> | null = null;

async function refreshAccessToken(activeRefreshToken: string): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken: activeRefreshToken })
      .then(({ data }) => {
        localStorage.setItem('execora_token', data.accessToken);
        localStorage.setItem('execora_refresh', data.refreshToken);
        return { accessToken: data.accessToken as string, shouldLogout: false };
      })
      .catch((err) => {
        const status = err?.response?.status;
        // Only an explicit 401 from refresh means session is invalid.
        // Network/CORS/server errors should not force logout immediately.
        return { accessToken: null, shouldLogout: status === 401 };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// ── Auth token injection ──────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('execora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = String(original?.url ?? '');
    const isAuthRoute = requestUrl.includes('/api/v1/auth/login')
      || requestUrl.includes('/api/v1/auth/refresh')
      || requestUrl.includes('/api/v1/auth/logout');

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('execora_refresh');
      if (refreshToken) {
        const { accessToken: newAccessToken, shouldLogout } = await refreshAccessToken(refreshToken);
        if (newAccessToken) {
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(original);
        }

        // Clear only if this failed refresh still matches active storage.
        // Prevents stale in-flight requests from logging out a newly signed-in user.
        if (shouldLogout && localStorage.getItem('execora_refresh') === refreshToken) {
          localStorage.removeItem('execora_token');
          localStorage.removeItem('execora_refresh');
          localStorage.removeItem('execora_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth endpoints ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, tenantId?: string) =>
    api.post('/api/v1/auth/login', { email, password, ...(tenantId ? { tenantId } : {}) }),
  logout: (refreshToken: string) =>
    api.post('/api/v1/auth/logout', { refreshToken }),
  me: () => api.get('/api/v1/auth/me'),
};

// ── Customer endpoints ────────────────────────────────────────────────────────

export const customerApi = {
  search: (q: string) => api.get('/api/v1/customers/search', { params: { q } }),
  getById: (id: string) => api.get(`/api/v1/customers/${id}`),
  create: (data: { name: string; phone?: string; nickname?: string; landmark?: string }) =>
    api.post('/api/v1/customers', data),
};

// ── Invoice endpoints ─────────────────────────────────────────────────────────

export const invoiceApi = {
  list: (limit = 20) => api.get('/api/v1/invoices', { params: { limit } }),
  create: (data: { customerId: string; items: { productName: string; quantity: number }[]; notes?: string }) =>
    api.post('/api/v1/invoices', data),
  cancel: (id: string) => api.post(`/api/v1/invoices/${id}/cancel`),
};

// ── Product endpoints ─────────────────────────────────────────────────────────

export const productApi = {
  list: () => api.get('/api/v1/products'),
  lowStock: () => api.get('/api/v1/products/low-stock'),
  create: (data: { name: string; price: number; stock: number; description?: string; unit?: string }) =>
    api.post('/api/v1/products', data),
};

// ── Ledger endpoints ──────────────────────────────────────────────────────────

export const ledgerApi = {
  getByCustomer: (customerId: string, limit = 20) =>
    api.get(`/api/v1/ledger/${customerId}`, { params: { limit } }),
  recordPayment: (data: { customerId: string; amount: number; paymentMode: string; notes?: string }) =>
    api.post('/api/v1/ledger/payment', data),
  addCredit: (data: { customerId: string; amount: number; description: string }) =>
    api.post('/api/v1/ledger/credit', data),
};

// ── Reminder endpoints ────────────────────────────────────────────────────────

export const reminderApi = {
  list: (customerId?: string) =>
    api.get('/api/v1/reminders', { params: customerId ? { customerId } : {} }),
  create: (data: { customerId: string; amount: number; datetime: string; message?: string }) =>
    api.post('/api/v1/reminders', data),
  cancel: (id: string) => api.post(`/api/v1/reminders/${id}/cancel`),
};

// ── Session endpoints ─────────────────────────────────────────────────────────

export const sessionApi = {
  list: (limit = 20) => api.get('/api/v1/sessions', { params: { limit } }),
  getRecordingUrl: (id: string) => api.get(`/api/v1/recordings/${id}/url`),
};

// ── Summary endpoint ──────────────────────────────────────────────────────────

export const summaryApi = {
  daily: () => api.get('/api/v1/summary/daily'),
};

// ── User management ───────────────────────────────────────────────────────────

export const userApi = {
  list: () => api.get('/api/v1/users'),
  getById: (id: string) => api.get(`/api/v1/users/${id}`),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatCurrency(amount: string | number, currency = '₹'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return `${currency}0`;
  return `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

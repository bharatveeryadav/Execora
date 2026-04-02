import { apiFetch } from "@execora/shared";

export const paymentApi = {
  record: (data: {
    customerId?: string;
    invoiceId?: string;
    amount: number;
    method: string;
    reference?: string;
    note?: string;
    date?: string;
  }) =>
    apiFetch<{ payment: unknown }>("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const expenseApi = {
  list: (
    params: {
      from?: string;
      to?: string;
      category?: string;
      supplier?: string;
      type?: "expense" | "income";
      limit?: number;
    } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.category) q.set("category", params.category);
    if (params.supplier) q.set("supplier", params.supplier);
    if (params.type) q.set("type", params.type);
    if (params.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return apiFetch<{
      expenses: Array<{
        id: string;
        category: string;
        amount: string | number;
        note?: string;
        supplier?: string;
        date: string;
      }>;
      total: number;
      count: number;
    }>(`/api/v1/expenses${s ? `?${s}` : ""}`);
  },
  create: (data: {
    category: string;
    amount: number;
    note?: string;
    supplier?: string;
    date?: string;
    type?: "expense" | "income";
  }) =>
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
    return apiFetch<{
      total: number;
      byCategory: Record<string, number>;
      count: number;
    }>(`/api/v1/expenses/summary${s ? `?${s}` : ""}`);
  },
};

export const supplierApi = {
  list: (params?: { q?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.limit) q.set("limit", String(params.limit ?? 100));
    const s = q.toString();
    return apiFetch<{
      suppliers: Array<{
        id: string;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        gstin?: string | null;
      }>;
    }>(`/api/v1/suppliers${s ? `?${s}` : ""}`);
  },
  get: (id: string) =>
    apiFetch<{
      supplier: {
        id: string;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        gstin?: string | null;
      };
    }>(`/api/v1/suppliers/${id}`),
  create: (data: {
    name: string;
    companyName?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  }) =>
    apiFetch<{ supplier: unknown }>("/api/v1/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const purchaseApi = {
  list: (
    params: {
      from?: string;
      to?: string;
      supplier?: string;
      limit?: number;
    } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.supplier) q.set("supplier", params.supplier);
    if (params.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return apiFetch<{
      purchases: Array<{
        id: string;
        category: string;
        amount: string | number;
        itemName?: string;
        note?: string;
        supplier?: string;
        quantity?: string | number;
        unit?: string;
        ratePerUnit?: string | number;
        date: string;
      }>;
      total: number;
      count: number;
    }>(`/api/v1/purchases${s ? `?${s}` : ""}`);
  },
  create: (data: {
    category: string;
    amount: number;
    itemName: string;
    supplier?: string;
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

import { apiFetch } from "@execora/shared";

export const cashbookApi = {
  get: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    const s = q.toString();
    return apiFetch<{
      entries: Array<{
        id: string;
        type: string;
        date: string;
        category?: string;
        note?: string;
        amount: string | number;
      }>;
      totalIn: number;
      totalOut: number;
      balance: number;
    }>(`/api/v1/cashbook${s ? `?${s}` : ""}`);
  },
};

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
    apiFetch<{
      summary: {
        totalSales: number;
        totalPayments: number;
        invoiceCount: number;
        pendingAmount?: number;
        cashPayments?: number;
        upiPayments?: number;
      };
    }>(`/api/v1/summary/range?from=${from}&to=${to}`),
};

export const reportsApi = {
  gstr1: (params?: { from?: string; to?: string; fy?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.fy) q.set("fy", params.fy);
    const s = q.toString();
    return apiFetch<{
      report: { fy: string; b2b: unknown[]; b2cs: unknown[]; hsn: unknown[] };
    }>(`/api/v1/reports/gstr1${s ? `?${s}` : ""}`);
  },
  pnl: (params?: { from?: string; to?: string; fy?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.fy) q.set("fy", params.fy);
    const s = q.toString();
    return apiFetch<{
      report: {
        period: { from: string; to: string };
        months: Array<{
          month: string;
          invoiceCount: number;
          revenue: number;
          discounts: number;
          netRevenue: number;
          taxCollected: number;
          collected: number;
          outstanding: number;
        }>;
        totals: {
          invoiceCount: number;
          revenue: number;
          discounts: number;
          netRevenue: number;
          taxCollected: number;
          collected: number;
          outstanding: number;
          collectionRate: number;
        };
      };
    }>(`/api/v1/reports/pnl${s ? `?${s}` : ""}`);
  },
};

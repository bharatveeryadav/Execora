import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customerApi, invoiceApi, productApi, ledgerApi,
  reminderApi, sessionApi, summaryApi,
} from '@/lib/api';
import type {
  Customer, Invoice, Product, Reminder, ConversationSession, DailySummary, LedgerEntry,
} from '@/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const QK = {
  summary: ['summary', 'daily'],
  customers: (q = '') => ['customers', q],
  customer: (id: string) => ['customer', id],
  invoices: (limit?: number) => ['invoices', limit],
  products: ['products'],
  lowStock: ['products', 'low-stock'],
  reminders: (customerId?: string) => ['reminders', customerId],
  ledger: (customerId: string, limit?: number) => ['ledger', customerId, limit],
  sessions: (limit?: number) => ['sessions', limit],
} as const;

// ── Summary ───────────────────────────────────────────────────────────────────

export function useDailySummary() {
  return useQuery<DailySummary>({
    queryKey: QK.summary,
    queryFn: async () => {
      const { data } = await summaryApi.daily();
      return data.summary as DailySummary;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────

export function useCustomers(q = '') {
  return useQuery<Customer[]>({
    queryKey: QK.customers(q),
    queryFn: async () => {
      const { data } = await customerApi.search(q);
      return (data.customers ?? []) as Customer[];
    },
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: QK.customer(id),
    queryFn: async () => {
      const { data } = await customerApi.getById(id);
      return data.customer as Customer;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; nickname?: string; landmark?: string }) =>
      customerApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function useInvoices(limit = 20) {
  return useQuery<Invoice[]>({
    queryKey: QK.invoices(limit),
    queryFn: async () => {
      const { data } = await invoiceApi.list(limit);
      return (data.invoices ?? []) as Invoice[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; items: { productName: string; quantity: number }[]; notes?: string }) =>
      invoiceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

// ── Products ──────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: QK.products,
    queryFn: async () => {
      const { data } = await productApi.list();
      return (data.products ?? []) as Product[];
    },
    staleTime: 60_000,
  });
}

export function useLowStockProducts() {
  return useQuery<Product[]>({
    queryKey: QK.lowStock,
    queryFn: async () => {
      const { data } = await productApi.lowStock();
      return (data.products ?? []) as Product[];
    },
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; price: number; stock: number; description?: string; unit?: string }) =>
      productApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products });
      qc.invalidateQueries({ queryKey: QK.lowStock });
    },
  });
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export function useCustomerLedger(customerId: string, limit = 20) {
  return useQuery<LedgerEntry[]>({
    queryKey: QK.ledger(customerId, limit),
    queryFn: async () => {
      const { data } = await ledgerApi.getByCustomer(customerId, limit);
      return (data.entries ?? []) as LedgerEntry[];
    },
    enabled: Boolean(customerId),
    staleTime: 15_000,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; amount: number; paymentMode: string; notes?: string }) =>
      ledgerApi.recordPayment(data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['ledger', vars.customerId] });
      qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
      qc.invalidateQueries({ queryKey: QK.summary });
    },
  });
}

export function useAddCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; amount: number; description: string }) =>
      ledgerApi.addCredit(data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['ledger', vars.customerId] });
      qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
    },
  });
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export function useReminders(customerId?: string) {
  return useQuery<Reminder[]>({
    queryKey: QK.reminders(customerId),
    queryFn: async () => {
      const { data } = await reminderApi.list(customerId);
      return (data.reminders ?? []) as Reminder[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId: string; amount: number; datetime: string; message?: string }) =>
      reminderApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useCancelReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useSessions(limit = 20) {
  return useQuery<ConversationSession[]>({
    queryKey: QK.sessions(limit),
    queryFn: async () => {
      const { data } = await sessionApi.list(limit);
      return (data.sessions ?? []) as ConversationSession[];
    },
    refetchInterval: 30_000,
  });
}

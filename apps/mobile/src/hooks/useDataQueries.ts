/**
 * useDataQueries — Centralized data-fetching hooks for all screens.
 * Eliminates 132+ scattered useQuery calls by wrapping API layer with consistent:
 * - query key factory (from QUERY_KEYS)
 * - staleTime / cacheTime config
 * - error handling
 * - TypeScript typing
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  invoiceApi,
  customerApi,
  productApi,
  authApi,
  type Invoice,
  type Customer,
  type Product,
} from "@execora/shared";
import { invoiceExtApi, productExtApi, customerExtApi } from "../lib/api";
import { QUERY_KEYS } from "../lib/queryKeys";

const DEFAULT_STALE_TIME = 30_000; // 30 seconds

// ──────────────────────────────────────────────────────────────────────────
// Invoices
// ──────────────────────────────────────────────────────────────────────────

export function useInvoices(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.all(),
    queryFn: () => invoiceApi.list(),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useInvoiceDetail(
  id: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.detail(id),
    queryFn: () => invoiceApi.get(id),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useInvoiceById(
  id: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useInvoiceDetail(id, options);
}

export function useCancelInvoice(id: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invoiceExtApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invoices.detail(id) });
      onSuccess?.();
    },
  });
}

export function useUpdateInvoice(id: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      items: Array<{ productName: string; quantity: number }>;
      notes?: string;
    }) => invoiceExtApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invoices.detail(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all() });
      onSuccess?.();
    },
  });
}

export function useDashboardInvoices(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.dashboard(),
    queryFn: () => invoiceApi.list(),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useDaybookInvoices(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.daybook(),
    queryFn: () =>
      invoiceApi.list().then((d: any) => ({ invoices: d.invoices })),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Customers
// ──────────────────────────────────────────────────────────────────────────

export function useCustomers(
  searchQuery?: string,
  page = 1,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  // Use search API if query provided, otherwise list all
  const hasQuery = searchQuery && searchQuery.trim().length > 0;
  return useQuery({
    queryKey: QUERY_KEYS.customers.list(searchQuery || "", page),
    queryFn: () =>
      hasQuery ? customerApi.search(searchQuery) : customerApi.list(page, 50),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useCustomerSearch(
  query: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.search(query),
    queryFn: () => customerApi.search(query),
    staleTime: DEFAULT_STALE_TIME,
    enabled: query.length > 0,
    ...options,
  });
}

export function useCustomerDetail(
  id: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDetail.base(id),
    queryFn: () => customerApi.get(id),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useCustomerInvoices(
  customerId: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDetail.invoices(customerId),
    queryFn: () => invoiceApi.list(1, 50, customerId),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useCustomerLedger(
  customerId: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDetail.ledger(customerId),
    queryFn: () => customerExtApi.getLedger?.(customerId) ?? { entries: [] },
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useCustomerHealth(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.health(),
    queryFn: () => customerApi.list().then((d: any) => ({ health: d })),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useOverdueCustomers(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.overdue(),
    queryFn: () => customerApi.list().then((d: any) => d),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────────────────────────────────

export function useProducts(
  page = 1,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.page(page),
    queryFn: () => productApi.list(page, 50),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useProductDetail(
  id: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.detail(id),
    queryFn: () => productApi.get(id),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useLowStockProducts(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.lowStock(),
    queryFn: () => productExtApi.lowStock(),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useExpiringProducts(
  days = 30,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.expiring(),
    queryFn: () => productExtApi.expiringBatches(days),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useExpiryPage(
  filter: "expired" | "7d" | "30d" | "90d" | "all" = "30d",
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.expiryPage(filter),
    queryFn: () => productExtApi.expiryPage(filter),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useProductCatalog(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.catalog(),
    queryFn: () => productApi.list(1, 10000), // All products for billing catalog
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useProductSearch(
  query: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.products.search(query),
    queryFn: () => productApi.search(query),
    staleTime: DEFAULT_STALE_TIME,
    enabled: query.length > 0,
    ...options,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Company Profile
// ──────────────────────────────────────────────────────────────────────────

export function useCompanyProfile(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.company.profile(),
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000, // Longer cache, company profile rarely changes
    ...options,
  });
}

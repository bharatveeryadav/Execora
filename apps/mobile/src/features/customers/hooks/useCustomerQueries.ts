import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { invoiceApi } from "@execora/shared";
import { QUERY_KEYS } from "../../../shared/lib/queryKeys";
import { customerApi, customerExtApi } from "../api/customerApi";

const DEFAULT_STALE_TIME = 30_000;

export function useCustomers(
  searchQuery?: string,
  page = 1,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
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
    queryFn: () => customerApi.list().then((data: any) => ({ health: data })),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useOverdueCustomers(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.customers.overdue(),
    queryFn: () => customerApi.list().then((data: any) => data),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

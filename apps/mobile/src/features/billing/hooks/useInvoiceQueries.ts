import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "../../../shared/lib/queryKeys";
import { invoiceApi, invoiceExtApi } from "../api/invoiceApi";

const DEFAULT_STALE_TIME = 30_000;

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

export function useInvoicesByCustomer(
  customerId: string,
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.byCustomer(customerId),
    queryFn: () => invoiceApi.list(1, 50, customerId),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
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

export function useSendInvoiceEmail(id: string, onSuccess?: () => void) {
  return useMutation({
    mutationFn: () => invoiceExtApi.sendEmail(id),
    onSuccess: () => onSuccess?.(),
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
    queryFn: () => invoiceApi.list().then((data: any) => ({ invoices: data.invoices })),
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { authApi } from "@execora/shared";
import { QUERY_KEYS } from "../shared/lib/queryKeys";

export {
  useInvoices,
  useInvoiceDetail,
  useInvoiceById,
  useInvoicesByCustomer,
  useCancelInvoice,
  useUpdateInvoice,
  useSendInvoiceEmail,
  useDashboardInvoices,
  useDaybookInvoices,
} from "../features/billing/hooks/useInvoiceQueries";

export {
  useCustomers,
  useCustomerSearch,
  useCustomerDetail,
  useCustomerInvoices,
  useCustomerLedger,
  useCustomerHealth,
  useOverdueCustomers,
} from "../features/customers/hooks/useCustomerQueries";

export {
  useProducts,
  useProductDetail,
  useLowStockProducts,
  useExpiringProducts,
  useExpiryPage,
  useProductCatalog,
  useProductSearch,
} from "../features/products/hooks/useProductQueries";

export function useCompanyProfile(
  options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: QUERY_KEYS.company.profile(),
    queryFn: () => authApi.me(),
    staleTime: 5 * 60_000,
    ...options,
  });
}

/**
 * useDataQueries — Centralized data-fetching hooks for all screens.
 * Eliminates 132+ scattered useQuery calls by wrapping API layer with consistent:
 * - query key factory (from QUERY_KEYS)
 * - staleTime / cacheTime config
 * - error handling
 * - TypeScript typing
 */
import { UseQueryOptions } from "@tanstack/react-query";
export declare function useInvoices(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useInvoiceDetail(id: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useInvoiceById(id: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCancelInvoice(id: string, onSuccess?: () => void): import("@tanstack/react-query").UseMutationResult<{
    invoice: unknown;
}, Error, void, unknown>;
export declare function useUpdateInvoice(id: string, onSuccess?: () => void): import("@tanstack/react-query").UseMutationResult<{
    invoice: unknown;
}, Error, {
    items: Array<{
        productName: string;
        quantity: number;
    }>;
    notes?: string;
}, unknown>;
export declare function useDashboardInvoices(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useDaybookInvoices(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomers(searchQuery?: string, page?: number, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomerSearch(query: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomerDetail(id: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomerInvoices(customerId: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomerLedger(customerId: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCustomerHealth(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useOverdueCustomers(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useProducts(page?: number, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useProductDetail(id: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useLowStockProducts(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useExpiringProducts(days?: number, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useExpiryPage(filter?: "expired" | "7d" | "30d" | "90d" | "all", options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useProductCatalog(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useProductSearch(query: string, options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useCompanyProfile(options?: Omit<UseQueryOptions<any>, "queryKey" | "queryFn">): import("@tanstack/react-query").UseQueryResult<any, Error>;
//# sourceMappingURL=useDataQueries.d.ts.map
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { QUERY_KEYS } from "../../../shared/lib/queryKeys";
import { productApi, productExtApi } from "../api/productApi";

const DEFAULT_STALE_TIME = 30_000;

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
    queryFn: () => productApi.list(1, 10000),
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

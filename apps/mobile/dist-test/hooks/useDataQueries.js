"use strict";
/**
 * useDataQueries — Centralized data-fetching hooks for all screens.
 * Eliminates 132+ scattered useQuery calls by wrapping API layer with consistent:
 * - query key factory (from QUERY_KEYS)
 * - staleTime / cacheTime config
 * - error handling
 * - TypeScript typing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInvoices = useInvoices;
exports.useInvoiceDetail = useInvoiceDetail;
exports.useInvoiceById = useInvoiceById;
exports.useCancelInvoice = useCancelInvoice;
exports.useUpdateInvoice = useUpdateInvoice;
exports.useDashboardInvoices = useDashboardInvoices;
exports.useDaybookInvoices = useDaybookInvoices;
exports.useCustomers = useCustomers;
exports.useCustomerSearch = useCustomerSearch;
exports.useCustomerDetail = useCustomerDetail;
exports.useCustomerInvoices = useCustomerInvoices;
exports.useCustomerLedger = useCustomerLedger;
exports.useCustomerHealth = useCustomerHealth;
exports.useOverdueCustomers = useOverdueCustomers;
exports.useProducts = useProducts;
exports.useProductDetail = useProductDetail;
exports.useLowStockProducts = useLowStockProducts;
exports.useExpiringProducts = useExpiringProducts;
exports.useExpiryPage = useExpiryPage;
exports.useProductCatalog = useProductCatalog;
exports.useProductSearch = useProductSearch;
exports.useCompanyProfile = useCompanyProfile;
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const api_1 = require("../lib/api");
const queryKeys_1 = require("../lib/queryKeys");
const DEFAULT_STALE_TIME = 30_000; // 30 seconds
// ──────────────────────────────────────────────────────────────────────────
// Invoices
// ──────────────────────────────────────────────────────────────────────────
function useInvoices(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.invoices.all(),
        queryFn: () => shared_1.invoiceApi.list(),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useInvoiceDetail(id, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.invoices.detail(id),
        queryFn: () => shared_1.invoiceApi.get(id),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useInvoiceById(id, options) {
    return useInvoiceDetail(id, options);
}
function useCancelInvoice(id, onSuccess) {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: () => api_1.invoiceExtApi.cancel(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.invoices.all() });
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.invoices.detail(id) });
            onSuccess?.();
        },
    });
}
function useUpdateInvoice(id, onSuccess) {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: (payload) => api_1.invoiceExtApi.update(id, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.invoices.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys_1.QUERY_KEYS.invoices.all() });
            onSuccess?.();
        },
    });
}
function useDashboardInvoices(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.invoices.dashboard(),
        queryFn: () => shared_1.invoiceApi.list(),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useDaybookInvoices(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.invoices.daybook(),
        queryFn: () => shared_1.invoiceApi.list().then((d) => ({ invoices: d.invoices })),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
// ──────────────────────────────────────────────────────────────────────────
// Customers
// ──────────────────────────────────────────────────────────────────────────
function useCustomers(searchQuery, page = 1, options) {
    // Use search API if query provided, otherwise list all
    const hasQuery = searchQuery && searchQuery.trim().length > 0;
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customers.list(searchQuery || "", page),
        queryFn: () => hasQuery ? shared_1.customerApi.search(searchQuery) : shared_1.customerApi.list(page, 50),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useCustomerSearch(query, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customers.search(query),
        queryFn: () => shared_1.customerApi.search(query),
        staleTime: DEFAULT_STALE_TIME,
        enabled: query.length > 0,
        ...options,
    });
}
function useCustomerDetail(id, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customerDetail.base(id),
        queryFn: () => shared_1.customerApi.get(id),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useCustomerInvoices(customerId, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customerDetail.invoices(customerId),
        queryFn: () => shared_1.invoiceApi.list(1, 50, customerId),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useCustomerLedger(customerId, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customerDetail.ledger(customerId),
        queryFn: () => api_1.customerExtApi.getLedger?.(customerId) ?? { entries: [] },
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useCustomerHealth(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customers.health(),
        queryFn: () => shared_1.customerApi.list().then((d) => ({ health: d })),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useOverdueCustomers(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.customers.overdue(),
        queryFn: () => shared_1.customerApi.list().then((d) => d),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
// ──────────────────────────────────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────────────────────────────────
function useProducts(page = 1, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.page(page),
        queryFn: () => shared_1.productApi.list(page, 50),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useProductDetail(id, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.detail(id),
        queryFn: () => shared_1.productApi.get(id),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useLowStockProducts(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.lowStock(),
        queryFn: () => api_1.productExtApi.lowStock(),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useExpiringProducts(days = 30, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.expiring(),
        queryFn: () => api_1.productExtApi.expiringBatches(days),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useExpiryPage(filter = "30d", options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.expiryPage(filter),
        queryFn: () => api_1.productExtApi.expiryPage(filter),
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useProductCatalog(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.catalog(),
        queryFn: () => shared_1.productApi.list(1, 10000), // All products for billing catalog
        staleTime: DEFAULT_STALE_TIME,
        ...options,
    });
}
function useProductSearch(query, options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.products.search(query),
        queryFn: () => shared_1.productApi.search(query),
        staleTime: DEFAULT_STALE_TIME,
        enabled: query.length > 0,
        ...options,
    });
}
// ──────────────────────────────────────────────────────────────────────────
// Company Profile
// ──────────────────────────────────────────────────────────────────────────
function useCompanyProfile(options) {
    return (0, react_query_1.useQuery)({
        queryKey: queryKeys_1.QUERY_KEYS.company.profile(),
        queryFn: () => shared_1.authApi.me(),
        staleTime: 5 * 60_000, // Longer cache, company profile rarely changes
        ...options,
    });
}
//# sourceMappingURL=useDataQueries.js.map
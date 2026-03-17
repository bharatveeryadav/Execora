import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	summaryApi,
	customerApi,
	invoiceApi,
	productApi,
	ledgerApi,
	reminderApi,
	reportApi,
	authApi,
	usersApi,
	expenseApi,
	purchaseApi,
	cashbookApi,
	supplierApi,
	purchaseOrderApi,
	type Customer,
	type Invoice,
	type Product,
	type TopSellingProduct,
	type LedgerEntry,
	type Reminder,
	type DailySummary,
	type SummaryRange,
	type Gstr1Report,
	type PnlReport,
	type ItemwisePnlReport,
	type ReportParams,
	type AppUser,
	type Expense,
	type CashEntry,
	type CommPrefs,
} from '@/lib/api';

// ── Query keys ────────────────────────────────────────────────────────────────

export const QK = {
	summary: ['summary', 'daily'],
	summaryRange: (from: string, to: string) => ['summary', 'range', from, to],
	customers: (q = '') => ['customers', q],
	customer: (id: string) => ['customer', id],
	customerInvoices: (id: string, limit?: number) => ['customer', id, 'invoices', limit],
	invoices: (limit?: number) => ['invoices', limit],
	invoice: (id: string) => ['invoice', id],
	products: ['products'],
	lowStock: ['products', 'low-stock'],
	topSelling: (limit: number, days: number) => ['products', 'top-selling', limit, days],
	reminders: (customerId?: string) => ['reminders', customerId],
	ledger: (customerId: string, limit?: number) => ['ledger', customerId, limit],
	users: ['users'],
	me: ['auth', 'me'],
} as const;

// ── Summary ───────────────────────────────────────────────────────────────────

export function useDailySummary(date?: string) {
	return useQuery<DailySummary>({
		queryKey: date ? ['summary', 'daily', date] : QK.summary,
		queryFn: async () => {
			const data = await summaryApi.daily(date);
			return data.summary;
		},
		refetchInterval: 60_000,
		staleTime: 30_000,
	});
}

export function useSummaryRange(from: string, to: string) {
	return useQuery<SummaryRange>({
		queryKey: QK.summaryRange(from, to),
		queryFn: async () => {
			const data = await summaryApi.range(from, to);
			return data.summary;
		},
		enabled: Boolean(from && to),
		staleTime: 120_000,
	});
}

// ── Customers ─────────────────────────────────────────────────────────────────

export function useCustomers(q = '', limit = 200) {
	return useQuery<Customer[]>({
		queryKey: QK.customers(q),
		queryFn: async () => {
			const data = await customerApi.search(q, limit);
			return data.customers ?? [];
		},
	});
}

export function useCustomer(id: string) {
	return useQuery<Customer>({
		queryKey: QK.customer(id),
		queryFn: async () => {
			const data = await customerApi.getById(id);
			return data.customer;
		},
		enabled: Boolean(id),
	});
}

export function useLastOrder(customerId: string) {
	return useQuery<{
		id: string;
		invoiceNo: string;
		total: string;
		items: Array<{ productName: string; quantity: string }>;
	} | null>({
		queryKey: ['lastOrder', customerId],
		queryFn: async () => {
			try {
				const data = await customerApi.lastOrder(customerId);
				return data.invoice ?? null;
			} catch {
				return null;
			}
		},
		enabled: Boolean(customerId),
		staleTime: 30_000,
	});
}

export function useCreateCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			name: string;
			phone?: string;
			email?: string;
			nickname?: string;
			landmark?: string;
			notes?: string;
			openingBalance?: number;
			creditLimit?: number;
			tags?: string[];
		}) => customerApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
	});
}

export function useDeleteCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => customerApi.delete(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['customers'] });
			qc.invalidateQueries({ queryKey: QK.summary });
		},
	});
}

export function useUpdateCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			name?: string;
			phone?: string;
			email?: string;
			nickname?: string;
			landmark?: string;
			creditLimit?: number;
			tags?: string[];
			notes?: string;
		}) => customerApi.update(id, data),
		onSuccess: (_d, vars) => {
			qc.invalidateQueries({ queryKey: QK.customer(vars.id) });
			qc.invalidateQueries({ queryKey: ['customers'] });
		},
	});
}

export function useCustomerInvoices(customerId: string, limit = 50) {
	return useQuery<Invoice[]>({
		queryKey: QK.customerInvoices(customerId, limit),
		queryFn: async () => {
			const data = await customerApi.invoices(customerId, limit);
			return data.invoices ?? [];
		},
		enabled: Boolean(customerId),
		staleTime: 30_000,
	});
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function useInvoice(id: string) {
	return useQuery<Invoice>({
		queryKey: QK.invoice(id),
		queryFn: async () => {
			const data = await invoiceApi.getById(id);
			return data.invoice;
		},
		enabled: Boolean(id),
		staleTime: 60_000,
	});
}

export function useInvoices(limit = 50) {
	return useQuery<Invoice[]>({
		queryKey: QK.invoices(limit),
		queryFn: async () => {
			const data = await invoiceApi.list(limit);
			return data.invoices ?? [];
		},
		refetchInterval: 30_000,
		staleTime: 15_000,
	});
}

export function useCreateInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			customerId: string;
			items: { productName: string; quantity: number; unitPrice?: number }[];
			notes?: string;
			discountPercent?: number;
			discountAmount?: number;
			withGst?: boolean;
			supplyType?: string;
			buyerGstin?: string;
			placeOfSupply?: string;
			initialPayment?: { amount: number; method: string };
			overrideCreditLimit?: boolean;
		}) => invoiceApi.create(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['invoices'] });
			qc.invalidateQueries({ queryKey: ['customers'] });
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

export function useUpdateInvoice() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Parameters<typeof invoiceApi.update>[1] }) =>
			invoiceApi.update(id, data),
		onSuccess: (_result, { id }) => {
			qc.invalidateQueries({ queryKey: QK.invoice(id) });
			qc.invalidateQueries({ queryKey: ['invoices'] });
			qc.invalidateQueries({ queryKey: QK.summary });
		},
	});
}

export function useConvertProforma() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payment }: { id: string; payment?: { amount: number; method: string } }) =>
			invoiceApi.convertProforma(id, payment),
		onSuccess: (_result, { id }) => {
			qc.invalidateQueries({ queryKey: QK.invoice(id) });
			qc.invalidateQueries({ queryKey: ['invoices'] });
			qc.invalidateQueries({ queryKey: QK.summary });
			qc.invalidateQueries({ queryKey: ['customers'] });
		},
	});
}

// ── Products ──────────────────────────────────────────────────────────────────

export function useProducts() {
	return useQuery<Product[]>({
		queryKey: QK.products,
		queryFn: async () => {
			const data = await productApi.list();
			return data.products ?? [];
		},
		staleTime: 60_000,
	});
}

export function useLowStockProducts() {
	return useQuery<Product[]>({
		queryKey: QK.lowStock,
		queryFn: async () => {
			const data = await productApi.lowStock();
			return data.products ?? [];
		},
		refetchInterval: 120_000,
		staleTime: 60_000,
	});
}

export function useTopSellingProducts(limit = 5, days = 30) {
	return useQuery<TopSellingProduct[]>({
		queryKey: QK.topSelling(limit, days),
		queryFn: async () => {
			const data = await productApi.topSelling(limit, days);
			return data.products ?? [];
		},
		refetchInterval: 120_000,
		staleTime: 60_000,
	});
}

export function useExpiringBatches(days = 30) {
	return useQuery<
		Array<{
			id: string;
			batchNo: string;
			expiryDate: string;
			quantity: number;
			product: { name: string; unit: string };
		}>
	>({
		queryKey: ['expiringBatches', days],
		queryFn: async () => {
			const data = await productApi.expiringBatches(days);
			return data.batches ?? [];
		},
		staleTime: 300_000,
		refetchInterval: 300_000,
	});
}

export function useExpiryPage(filter: 'expired' | '7d' | '30d' | '90d' | 'all' = '30d') {
	return useQuery({
		queryKey: ['expiryPage', filter],
		queryFn: () => productApi.expiryPage(filter),
		staleTime: 60_000,
		refetchInterval: 120_000,
	});
}

export function useCreateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			name: string;
			price: number;
			stock: number;
			unit?: string;
			category?: string;
			description?: string;
			barcode?: string;
			sku?: string;
		}) => productApi.create(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
		},
	});
}

export function useProductByBarcode() {
	return useMutation({
		mutationFn: (barcode: string) => productApi.byBarcode(barcode),
	});
}

export function useUpdateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			name?: string;
			price?: number;
			stock?: number;
			unit?: string;
			category?: string;
			description?: string;
			minStock?: number;
			isFeatured?: boolean;
		}) => productApi.update(id, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
		},
	});
}

export function useAdjustStock() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			quantity: number;
			operation: 'add' | 'subtract';
			reason?: string;
		}) => productApi.adjustStock(id, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
		},
	});
}

export function useProductImageUrls(productIds: string[]) {
	const ids = [...new Set(productIds)].filter(Boolean).slice(0, 100);
	return useQuery({
		queryKey: ['productImageUrls', ids.sort().join(',')],
		queryFn: async () => {
			const chunks: string[][] = [];
			for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
			const results = await Promise.all(chunks.map((c) => productApi.getImageUrls(c)));
			return Object.assign({}, ...results) as Record<string, string>;
		},
		enabled: ids.length > 0,
		staleTime: 50 * 60 * 1000,
	});
}

export function useUploadProductImage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ productId, file }: { productId: string; file: File }) =>
			productApi.uploadImage(productId, file),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
			qc.invalidateQueries({ queryKey: ['productImageUrls'] });
		},
	});
}

export function useDeleteProductImage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (productId: string) => productApi.deleteImage(productId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
			qc.invalidateQueries({ queryKey: ['productImageUrls'] });
		},
	});
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export function useCustomerLedger(customerId: string, limit = 30) {
	return useQuery<LedgerEntry[]>({
		queryKey: QK.ledger(customerId, limit),
		queryFn: async () => {
			const data = await ledgerApi.getByCustomer(customerId, limit);
			return data.entries ?? [];
		},
		enabled: Boolean(customerId),
		staleTime: 15_000,
	});
}

export function useRecordPayment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			customerId: string;
			amount: number;
			paymentMode: string;
			notes?: string;
			reference?: string;
			paymentDate?: string;
		}) => ledgerApi.recordPayment(data),
		onSuccess: (_d, vars) => {
			qc.invalidateQueries({ queryKey: ['ledger', vars.customerId] });
			qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
			qc.invalidateQueries({ queryKey: ['customers'] });
			qc.invalidateQueries({ queryKey: ['invoices'] });
			qc.invalidateQueries({ queryKey: QK.summary });
		},
	});
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export function useReminders(customerId?: string) {
	return useQuery<Reminder[]>({
		queryKey: QK.reminders(customerId),
		queryFn: async () => {
			const data = await reminderApi.list(customerId);
			return data.reminders ?? [];
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

export function useBulkReminders() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { customerIds: string[]; message?: string; daysOffset?: number }) =>
			reminderApi.bulkCreate(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
	});
}

// ── Communication Prefs ───────────────────────────────────────────────────────

export function useCommPrefs(customerId: string) {
	return useQuery<CommPrefs | null>({
		queryKey: ['commPrefs', customerId],
		queryFn: async () => {
			const data = await customerApi.getCommPrefs(customerId);
			return data.prefs;
		},
		enabled: Boolean(customerId),
		staleTime: 60_000,
	});
}

export function useUpdateCommPrefs() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			customerId,
			...data
		}: {
			customerId: string;
			whatsappEnabled?: boolean;
			whatsappNumber?: string;
			emailEnabled?: boolean;
			emailAddress?: string;
			smsEnabled?: boolean;
			preferredLanguage?: string;
		}) => customerApi.updateCommPrefs(customerId, data),
		onSuccess: (_d, vars) => {
			qc.invalidateQueries({ queryKey: ['commPrefs', vars.customerId] });
		},
	});
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function useGstr1Report(params: ReportParams = {}) {
	return useQuery<Gstr1Report>({
		queryKey: ['reports', 'gstr1', params.fy ?? params.from ?? 'current'],
		queryFn: async () => {
			const data = await reportApi.getGstr1(params);
			return data.report;
		},
		staleTime: 300_000, // 5 min — report data is expensive to compute
		refetchOnWindowFocus: false,
	});
}

export function usePnlReport(params: ReportParams & { compareFrom?: string; compareTo?: string } = {}) {
	const key = `${params.from ?? ''}::${params.to ?? ''}::${params.fy ?? 'current'}::${params.compareFrom ?? ''}::${params.compareTo ?? ''}`;
	return useQuery<PnlReport>({
		queryKey: ['reports', 'pnl', key],
		queryFn: async () => {
			const data = await reportApi.getPnl(params);
			return data.report;
		},
		staleTime: 300_000,
		refetchOnWindowFocus: false,
	});
}

export function useItemwisePnlReport(params: ReportParams = {}) {
	const key = params.from ?? params.to ?? params.fy ?? 'current';
	return useQuery<ItemwisePnlReport>({
		queryKey: ['reports', 'itemwise-pnl', key],
		queryFn: async () => {
			const data = await reportApi.getItemwisePnl(params);
			return data.report;
		},
		staleTime: 300_000,
		refetchOnWindowFocus: false,
	});
}

export function useEmailReport() {
	return useMutation({
		mutationFn: (data: {
			type: 'gstr1' | 'pnl';
			from: string;
			to: string;
			email: string;
			fy?: string;
			compareFrom?: string;
			compareTo?: string;
		}) => reportApi.emailReport(data),
	});
}

// ── Auth/Profile + Users (Settings) ─────────────────────────────────────────

export function useMe() {
	return useQuery<AppUser>({
		queryKey: QK.me,
		queryFn: async () => {
			const data = await authApi.me();
			return data.user;
		},
		staleTime: 60_000,
	});
}

export function useUpdateProfile() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			name?: string;
			phone?: string;
			preferences?: Record<string, unknown>;
			tenant?: {
				name?: string;
				legalName?: string;
				tradeName?: string;
				gstin?: string;
				currency?: string;
				timezone?: string;
				language?: string;
				dateFormat?: string;
				settings?: Record<string, unknown>;
			};
		}) => authApi.updateProfile(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.me });
		},
	});
}

export function useUsers() {
	return useQuery<AppUser[]>({
		queryKey: QK.users,
		queryFn: async () => {
			const data = await usersApi.list();
			return data.users ?? [];
		},
		staleTime: 30_000,
	});
}

export function useCreateUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			email: string;
			name: string;
			phone?: string;
			role: 'admin' | 'manager' | 'staff' | 'viewer';
			password: string;
			permissions?: string[];
		}) => usersApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: QK.users }),
	});
}

export function useUpdateUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			name?: string;
			phone?: string;
			role?: 'admin' | 'manager' | 'staff' | 'viewer';
			permissions?: string[];
			isActive?: boolean;
		}) => usersApi.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: QK.users }),
	});
}

export function useRemoveUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => usersApi.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: QK.users }),
	});
}

// ── Expenses ──────────────────────────────────────────────────────────────────

const EXP_KEY = ['expenses'] as const;
const PUR_KEY = ['purchases'] as const;
const CB_KEY = ['cashbook'] as const;

export function useExpenses(params: { from?: string; to?: string; category?: string } = {}) {
	return useQuery<{ expenses: Expense[]; total: number; count: number }>({
		queryKey: [...EXP_KEY, params.from, params.to, params.category],
		queryFn: () => expenseApi.list(params),
		staleTime: 60_000,
	});
}

export function useCreateExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { category: string; amount: number; note?: string; vendor?: string; date?: string }) =>
			expenseApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: EXP_KEY }),
	});
}

export function useDeleteExpense() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => expenseApi.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: EXP_KEY }),
	});
}

// ── Incomes (Indirect Income — reuse Expense with type=income) ──────────────────

const INC_KEY = ['incomes'] as const;

export function useIncomes(params: { from?: string; to?: string; category?: string } = {}) {
	return useQuery<{ expenses: Expense[]; total: number; count: number }>({
		queryKey: [...INC_KEY, params.from, params.to, params.category],
		queryFn: () => expenseApi.list({ ...params, type: 'income' }),
		staleTime: 60_000,
	});
}

export function useCreateIncome() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { category: string; amount: number; note?: string; vendor?: string; date?: string }) =>
			expenseApi.create({ ...data, type: 'income' }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: INC_KEY });
			qc.invalidateQueries({ queryKey: ['cashbook'] });
		},
	});
}

export function useDeleteIncome() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => expenseApi.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: INC_KEY });
			qc.invalidateQueries({ queryKey: ['cashbook'] });
		},
	});
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export function useSuppliers(params?: { q?: string; limit?: number }) {
	return useQuery({
		queryKey: ['suppliers', params?.q ?? '', params?.limit ?? 50],
		queryFn: () => supplierApi.list(params),
		staleTime: 60_000,
	});
}

export function useCreateSupplier() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; companyName?: string; phone?: string; email?: string; address?: string; gstin?: string }) =>
			supplierApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
	});
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export function usePurchaseOrders(params?: { status?: string; supplierId?: string; limit?: number }) {
	return useQuery({
		queryKey: ['purchase-orders', params?.status ?? '', params?.supplierId ?? '', params?.limit ?? 50],
		queryFn: () => purchaseOrderApi.list(params),
		staleTime: 30_000,
	});
}

export function usePurchaseOrder(id: string | undefined) {
	return useQuery({
		queryKey: ['purchase-order', id],
		queryFn: () => purchaseOrderApi.getById(id!),
		enabled: !!id,
		staleTime: 30_000,
	});
}

export function useCreatePurchaseOrder() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Parameters<typeof purchaseOrderApi.create>[0]) => purchaseOrderApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
	});
}

export function useReceivePurchaseOrder() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, receipts }: { id: string; receipts: Parameters<typeof purchaseOrderApi.receive>[1] }) =>
			purchaseOrderApi.receive(id, receipts),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: ['purchase-orders'] });
			qc.invalidateQueries({ queryKey: ['purchase-order', id] });
			qc.invalidateQueries({ queryKey: ['products'] });
			qc.invalidateQueries({ queryKey: ['lowStock'] });
		},
	});
}

export function useCancelPurchaseOrder() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => purchaseOrderApi.cancel(id),
		onSuccess: (_, id) => {
			qc.invalidateQueries({ queryKey: ['purchase-orders'] });
			qc.invalidateQueries({ queryKey: ['purchase-order', id] });
		},
	});
}

// ── Purchases ─────────────────────────────────────────────────────────────────

export function usePurchases(params: { from?: string; to?: string } = {}) {
	return useQuery<{ purchases: Expense[]; total: number; count: number }>({
		queryKey: [...PUR_KEY, params.from, params.to],
		queryFn: () => purchaseApi.list(params),
		staleTime: 60_000,
	});
}

export function useCreatePurchase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			category: string;
			amount: number;
			itemName: string;
			vendor?: string;
			quantity?: number;
			unit?: string;
			ratePerUnit?: number;
			note?: string;
			date?: string;
		}) => purchaseApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: PUR_KEY }),
	});
}

export function useDeletePurchase() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => purchaseApi.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: PUR_KEY }),
	});
}

// ── CashBook ──────────────────────────────────────────────────────────────────

export function useCashbook(params: { from?: string; to?: string } = {}) {
	return useQuery<{ entries: CashEntry[]; totalIn: number; totalOut: number; balance: number }>({
		queryKey: [...CB_KEY, params.from, params.to],
		queryFn: () => cashbookApi.get(params),
		staleTime: 30_000,
		refetchOnWindowFocus: true,
	});
}

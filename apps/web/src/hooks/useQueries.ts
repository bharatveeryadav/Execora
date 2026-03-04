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
	type ReportParams,
	type AppUser,
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

export function useCustomers(q = '', limit = 50) {
	return useQuery<Customer[]>({
		queryKey: QK.customers(q),
		queryFn: async () => {
			const data = await customerApi.search(q, limit);
			return data.customers ?? [];
		},
		staleTime: 30_000,
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

export function useCreateCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; phone?: string; nickname?: string; landmark?: string }) =>
			customerApi.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
	});
}

export function useUpdateCustomer() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; email?: string; nickname?: string; landmark?: string }) =>
			customerApi.update(id, data),
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
			items: { productName: string; quantity: number }[];
			notes?: string;
		}) => invoiceApi.create(data),
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
		}) => productApi.create(data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.products });
			qc.invalidateQueries({ queryKey: QK.lowStock });
		},
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
		mutationFn: (data: { customerId: string; amount: number; paymentMode: string; notes?: string }) =>
			ledgerApi.recordPayment(data),
		onSuccess: (_d, vars) => {
			qc.invalidateQueries({ queryKey: ['ledger', vars.customerId] });
			qc.invalidateQueries({ queryKey: ['customer', vars.customerId] });
			qc.invalidateQueries({ queryKey: ['customers'] });
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
	const key = `${params.from ?? ''}::${params.to ?? ''}::${params.fy ?? 'current'}`;
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

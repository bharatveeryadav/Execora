// ── Execora API client ────────────────────────────────────────────────────────
// Fetch-based client that reads JWT from localStorage automatically.

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'execora_token';
const REFRESH_KEY = 'execora_refresh';
const AUTH_EXPIRED_EVENT = 'execora:auth-expired';

// ── helpers ───────────────────────────────────────────────────────────────────

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
	return localStorage.getItem(REFRESH_KEY);
}

function clearAuthStorage() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(REFRESH_KEY);
	localStorage.removeItem('execora_user');
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
	}
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	if (refreshInFlight) return refreshInFlight;

	refreshInFlight = (async () => {
		const refreshToken = getRefreshToken();
		if (!refreshToken) {
			clearAuthStorage();
			return null;
		}

		const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken }),
		});

		if (!response.ok) {
			clearAuthStorage();
			return null;
		}

		const payload = (await response.json()) as {
			accessToken?: string;
			refreshToken?: string;
			user?: unknown;
		};

		if (!payload.accessToken || !payload.refreshToken) {
			clearAuthStorage();
			return null;
		}

		localStorage.setItem(TOKEN_KEY, payload.accessToken);
		localStorage.setItem(REFRESH_KEY, payload.refreshToken);
		if (payload.user) {
			localStorage.setItem('execora_user', JSON.stringify(payload.user));
		}

		return payload.accessToken;
	})();

	try {
		return await refreshInFlight;
	} finally {
		refreshInFlight = null;
	}
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>),
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

	if (res.status === 401 && !retried) {
		const newAccessToken = await refreshAccessToken();
		if (newAccessToken) {
			return request<T>(path, options, true);
		}
	}

	if (res.status === 401) {
		clearAuthStorage();
	}

	if (!res.ok) {
		const err = (await res.json().catch(() => ({ message: res.statusText }))) as {
			message?: string;
			error?: string;
		};
		throw new Error(err.message ?? err.error ?? `Request failed: ${res.status}`);
	}

	const text = await res.text();
	return text ? (JSON.parse(text) as T) : ({} as T);
}

export function formatCurrency(v: number | string = 0): string {
	const n = typeof v === 'string' ? parseFloat(v) : v;
	return `₹${(isNaN(n) ? 0 : n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string | Date): string {
	return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: string | Date): string {
	return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface Customer {
	id: string;
	tenantId: string;
	name: string;
	phone?: string;
	email?: string;
	nickname?: string;
	landmark?: string;
	balance: string | number;
	totalPurchases: string | number;
	totalPayments: string | number;
	createdAt: string;
	updatedAt: string;
}

export interface Product {
	id: string;
	name: string;
	category: string;
	description?: string;
	price: string | number;
	unit: string;
	stock: number;
	minStock?: number;
	isActive: boolean;
	createdAt: string;
}

export interface TopSellingProduct {
	productId: string;
	productName: string;
	unit: string;
	category: string;
	price: string;
	stock: number;
	soldQty: number;
}

export interface InvoiceItem {
	id: string;
	productId: string;
	productName?: string;
	/** Populated when backend includes the product relation (getRecentInvoices, getInvoiceById) */
	product?: { id: string; name: string; unit?: string };
	quantity: number;
	unitPrice: string | number;
	itemTotal: string | number;
}

export interface Invoice {
	id: string;
	customerId: string;
	customer?: Customer;
	invoiceNo: string;
	status: 'draft' | 'proforma' | 'pending' | 'partial' | 'paid' | 'cancelled';
	subtotal: string | number;
	discount: string | number;
	discountType?: string | null;
	tax: string | number;
	cgst: string | number;
	sgst: string | number;
	igst: string | number;
	total: string | number;
	paidAmount: string | number;
	buyerGstin?: string | null;
	placeOfSupply?: string | null;
	notes?: string;
	items?: InvoiceItem[];
	dueDate?: string | null;
	paidAt?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface LedgerEntry {
	id: string;
	type: 'payment' | 'credit' | 'invoice';
	amount: string | number;
	description: string;
	method?: string;
	createdAt: string;
}

export interface Reminder {
	id: string;
	customerId: string;
	customer?: Customer;
	amount: string | number;
	status: 'pending' | 'sent' | 'failed' | 'cancelled';
	scheduledTime: string;
	message?: string;
	createdAt: string;
}

export interface DailySummary {
	date: string;
	invoiceCount: number;
	totalSales: number;
	totalPayments: number;
	cashPayments: number;
	upiPayments: number;
	pendingAmount: number;
	extraPayments: number;
}

// ── API methods ───────────────────────────────────────────────────────────────

export interface SummaryRange {
	from: string;
	to: string;
	invoiceCount: number;
	totalSales: number;
	totalPayments: number;
	pendingAmount: number;
	cashPayments: number;
	upiPayments: number;
}

export const summaryApi = {
	daily: (date?: string) => request<{ summary: DailySummary }>(`/api/v1/summary/daily${date ? `?date=${date}` : ''}`),
	range: (from: string, to: string) =>
		request<{ summary: SummaryRange }>(`/api/v1/summary/range?from=${from}&to=${to}`),
};

export const customerApi = {
	// Backend route is /customers/search — NOT /customers?q=
	search: (q = '', limit = 50) =>
		request<{ customers: Customer[] }>(`/api/v1/customers/search?q=${encodeURIComponent(q)}&limit=${limit}`),
	getById: (id: string) => request<{ customer: Customer }>(`/api/v1/customers/${id}`),
	create: (data: { name: string; phone?: string; nickname?: string; landmark?: string }) =>
		request<{ customer: Customer }>('/api/v1/customers', { method: 'POST', body: JSON.stringify(data) }),
	invoices: (customerId: string, limit = 50) =>
		request<{ invoices: Invoice[] }>(`/api/v1/customers/${customerId}/invoices?limit=${limit}`),
};

export interface InvoiceCreateOptions {
	discountPercent?: number;
	discountAmount?: number;
	withGst?: boolean;
	supplyType?: 'INTRASTATE' | 'INTERSTATE';
	buyerGstin?: string;
	placeOfSupply?: string;
	initialPayment?: { amount: number; method: 'cash' | 'upi' | 'card' | 'other' };
}

export const invoiceApi = {
	list: (limit = 50) => request<{ invoices: Invoice[] }>(`/api/v1/invoices?limit=${limit}`),
	getById: (id: string) => request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`),
	create: (
		data: {
			customerId: string;
			items: { productName: string; quantity: number }[];
			notes?: string;
		} & InvoiceCreateOptions
	) =>
		request<{ invoice: Invoice; autoCreatedProducts?: string[] }>('/api/v1/invoices', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
	proforma: (
		data: { customerId: string; items: { productName: string; quantity: number }[]; notes?: string } & Omit<
			InvoiceCreateOptions,
			'initialPayment'
		>
	) => request<{ invoice: Invoice }>('/api/v1/invoices/proforma', { method: 'POST', body: JSON.stringify(data) }),
	update: (
		id: string,
		data: { items?: { productName: string; quantity: number }[]; notes?: string } & InvoiceCreateOptions
	) => request<{ invoice: Invoice }>(`/api/v1/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
	convertProforma: (id: string, payment?: { amount: number; method: string }) =>
		request<{ invoice: Invoice }>(`/api/v1/invoices/${id}/convert`, {
			method: 'POST',
			body: JSON.stringify(payment ?? {}),
		}),
	cancel: (id: string) => request<{ invoice: Invoice }>(`/api/v1/invoices/${id}/cancel`, { method: 'POST' }),
};

export const productApi = {
	list: () => request<{ products: Product[] }>('/api/v1/products'),
	lowStock: () => request<{ products: Product[] }>('/api/v1/products/low-stock'),
	topSelling: (limit = 5, days = 30) =>
		request<{ products: TopSellingProduct[] }>(`/api/v1/products/top-selling?limit=${limit}&days=${days}`),
	create: (data: {
		name: string;
		price: number;
		stock: number;
		unit?: string;
		category?: string;
		description?: string;
	}) => request<{ product: Product }>('/api/v1/products', { method: 'POST', body: JSON.stringify(data) }),
	update: (
		id: string,
		data: { name?: string; price?: number; stock?: number; unit?: string; category?: string; description?: string }
	) => request<{ product: Product }>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
	adjustStock: (id: string, data: { quantity: number; operation: 'add' | 'subtract'; reason?: string }) =>
		request<{ product: Product }>(`/api/v1/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const ledgerApi = {
	getByCustomer: (customerId: string, limit = 30) =>
		request<{ entries: LedgerEntry[] }>(`/api/v1/ledger/${customerId}?limit=${limit}`),
	recordPayment: (data: { customerId: string; amount: number; paymentMode: string; notes?: string }) => {
		// Backend enum: cash | upi | card | other — map 'bank' to 'other'
		const mode = data.paymentMode === 'bank' ? 'other' : data.paymentMode;
		return request<{ entry: LedgerEntry }>('/api/v1/ledger/payment', {
			method: 'POST',
			body: JSON.stringify({ ...data, paymentMode: mode }),
		});
	},
	addCredit: (data: { customerId: string; amount: number; description: string }) =>
		request<{ entry: LedgerEntry }>('/api/v1/ledger/credit', { method: 'POST', body: JSON.stringify(data) }),
};

export const reminderApi = {
	list: (customerId?: string) =>
		request<{ reminders: Reminder[] }>(`/api/v1/reminders${customerId ? `?customerId=${customerId}` : ''}`),
	create: (data: { customerId: string; amount: number; datetime: string; message?: string }) =>
		request<{ reminder: Reminder }>('/api/v1/reminders', { method: 'POST', body: JSON.stringify(data) }),
	// Backend uses POST (not PATCH) for cancel
	cancel: (id: string) => request<{ reminder: Reminder }>(`/api/v1/reminders/${id}/cancel`, { method: 'POST' }),
	bulkCreate: (data: { customerIds: string[]; message?: string; daysOffset?: number }) =>
		request<{ reminders: Reminder[] }>('/api/v1/reminders/bulk', { method: 'POST', body: JSON.stringify(data) }),
};

export const mixedPaymentApi = {
	record: (data: {
		customerId: string;
		splits: { amount: number; method: 'cash' | 'upi' | 'card' | 'other' }[];
		notes?: string;
	}) =>
		request<{ payments: unknown[]; totalAmount: number }>('/api/v1/ledger/mixed-payment', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
};

// ── Report types ───────────────────────────────────────────────────────────────

export interface Gstr1Totals {
	totalTaxableValue:  number;
	totalIgst:         number;
	totalCgst:         number;
	totalSgst:         number;
	totalCess:         number;
	totalTaxValue:     number;
	totalInvoiceValue: number;
	invoiceCount:      number;
}

export interface Gstr1B2BEntry {
	receiverGstin:  string;
	receiverName:   string;
	invoiceNo:      string;
	invoiceDate:    string;
	invoiceValue:   number;
	placeOfSupply:  string;
	reverseCharge:  string;
	taxableValue:   number;
	igst:           number;
	cgst:           number;
	sgst:           number;
	cess:           number;
}

export interface Gstr1B2CSEntry {
	supplyType:    string;
	placeOfSupply: string;
	gstRate:       number;
	taxableValue:  number;
	igst:          number;
	cgst:          number;
	sgst:          number;
	cess:          number;
}

export interface Gstr1HsnEntry {
	hsnCode:      string;
	description:  string;
	uqc:          string;
	totalQty:     number;
	taxableValue: number;
	igst:         number;
	cgst:         number;
	sgst:         number;
	gstRate:      number;
}

export interface Gstr1Report {
	period:    { from: string; to: string };
	fy:        string;
	gstin:     string;
	legalName: string;
	b2b:       Gstr1B2BEntry[];
	b2cs:      Gstr1B2CSEntry[];
	b2cl:      unknown[];
	hsn:       Gstr1HsnEntry[];
	totals:    Gstr1Totals;
}

export interface PnlMonthEntry {
	month:        string;
	invoiceCount: number;
	revenue:      number;
	taxCollected: number;
	discounts:    number;
	collected:    number;
	outstanding:  number;
	netRevenue:   number;
}

export interface PnlTotals {
	invoiceCount:   number;
	revenue:        number;
	taxCollected:   number;
	discounts:      number;
	collected:      number;
	outstanding:    number;
	netRevenue:     number;
	collectionRate: number;
}

export interface PnlReport {
	period:  { from: string; to: string };
	months:  PnlMonthEntry[];
	totals:  PnlTotals;
	comparison?: Array<{
		label:         string;
		currentValue:  number;
		previousValue: number;
		changePercent: number;
	}>;
}

// ── Report API ─────────────────────────────────────────────────────────────────

export interface ReportParams {
	from?: string;
	to?:   string;
	fy?:   string;
}

function buildReportQs(params: ReportParams): string {
	const q = new URLSearchParams();
	if (params.fy)   q.set('fy',   params.fy);
	if (params.from) q.set('from', params.from);
	if (params.to)   q.set('to',   params.to);
	const s = q.toString();
	return s ? `?${s}` : '';
}

export const reportApi = {
	getGstr1:  (params: ReportParams = {}) =>
		request<{ report: Gstr1Report }>(`/api/v1/reports/gstr1${buildReportQs(params)}`),

	getPnl: (params: ReportParams & { compareFrom?: string; compareTo?: string } = {}) => {
		const q = new URLSearchParams();
		if (params.fy)          q.set('fy',          params.fy);
		if (params.from)        q.set('from',        params.from);
		if (params.to)          q.set('to',          params.to);
		if (params.compareFrom) q.set('compareFrom', params.compareFrom);
		if (params.compareTo)   q.set('compareTo',   params.compareTo);
		const s = q.toString();
		return request<{ report: PnlReport }>(`/api/v1/reports/pnl${s ? `?${s}` : ''}`);
	},

	downloadGstr1Pdf: (params: ReportParams = {}) =>
		`/api/v1/reports/gstr1/pdf${buildReportQs(params)}`,

	downloadGstr1Csv: (params: ReportParams & { section?: 'b2b' | 'b2cs' | 'hsn' } = {}) => {
		const q = new URLSearchParams();
		if (params.fy)      q.set('fy',      params.fy);
		if (params.from)    q.set('from',    params.from);
		if (params.to)      q.set('to',      params.to);
		if (params.section) q.set('section', params.section);
		const s = q.toString();
		return `/api/v1/reports/gstr1/csv${s ? `?${s}` : ''}`;
	},

	downloadPnlPdf: (params: ReportParams = {}) =>
		`/api/v1/reports/pnl/pdf${buildReportQs(params)}`,

	downloadPnlCsv: (params: ReportParams = {}) =>
		`/api/v1/reports/pnl/csv${buildReportQs(params)}`,

	emailReport: (data: {
		type:         'gstr1' | 'pnl';
		from:         string;
		to:           string;
		email:        string;
		fy?:          string;
		compareFrom?: string;
		compareTo?:   string;
	}) =>
		request<{ success: boolean; message: string }>('/api/v1/reports/email', {
			method: 'POST',
			body:   JSON.stringify(data),
		}),
};

/**
 * Day Book — All transactions in one chronological view.
 * Real SME use case: daily cash reconciliation, CA handoff, end-of-day check.
 * Shows: GST invoices created, payments received, expenses paid, cash in/out.
 * All data is server-persisted; no localStorage for transaction data.
 */
import { useState, useMemo } from 'react';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, RefreshCw, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvoices, useExpenses, useCashbook } from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { formatCurrency, formatDate } from '@/lib/api';
import BottomNav from '@/components/BottomNav';

// ── Types ─────────────────────────────────────────────────────────────────────
type TxType = 'invoice' | 'payment' | 'expense' | 'cash_in' | 'cash_out';

interface Transaction {
	id: string;
	type: TxType;
	date: string; // ISO
	label: string;
	sublabel?: string;
	amount: number;
	sign: 'credit' | 'debit';
	status?: string;
	navTo?: string;
}

const PERIOD_OPTIONS = ['Today', 'Yesterday', 'This Week', 'This Month', 'Last Month'] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

function getPeriodRange(period: Period): { from: string; to: string } {
	const now = new Date();
	const today = fmtYMD(now);
	if (period === 'Today') return { from: today, to: today };
	if (period === 'Yesterday') {
		const y = new Date(now);
		y.setDate(y.getDate() - 1);
		return { from: fmtYMD(y), to: fmtYMD(y) };
	}
	if (period === 'This Week') {
		const start = new Date(now);
		start.setDate(now.getDate() - now.getDay());
		return { from: fmtYMD(start), to: today };
	}
	if (period === 'This Month') {
		return { from: `${today.slice(0, 7)}-01`, to: today };
	}
	// Last Month
	const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const last = new Date(now.getFullYear(), now.getMonth(), 0);
	return { from: fmtYMD(d), to: fmtYMD(last) };
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const fmtYMD = (d: Date) => d.toISOString().slice(0, 10);

function inRange(dateStr: string, from: string, to: string) {
	const d = dateStr.slice(0, 10);
	return d >= from && d <= to;
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG: Record<TxType, { emoji: string; label: string; bg: string; textCls: string }> = {
	invoice: { emoji: '🧾', label: 'Invoice', bg: 'bg-blue-500/10', textCls: 'text-blue-700 dark:text-blue-400' },
	payment: { emoji: '💰', label: 'Payment In', bg: 'bg-green-500/10', textCls: 'text-green-700 dark:text-green-400' },
	expense: { emoji: '💸', label: 'Expense', bg: 'bg-orange-500/10', textCls: 'text-orange-700 dark:text-orange-400' },
	cash_in: {
		emoji: '💵',
		label: 'Cash In',
		bg: 'bg-emerald-500/10',
		textCls: 'text-emerald-700 dark:text-emerald-400',
	},
	cash_out: { emoji: '🏧', label: 'Cash Out', bg: 'bg-red-500/10', textCls: 'text-destructive' },
};

const TYPE_FILTERS: Array<{ key: TxType | 'all'; label: string }> = [
	{ key: 'all', label: 'All' },
	{ key: 'invoice', label: '🧾 Invoices' },
	{ key: 'payment', label: '💰 Payments' },
	{ key: 'expense', label: '💸 Expenses' },
	{ key: 'cash_in', label: '💵 Cash In' },
	{ key: 'cash_out', label: '🏧 Cash Out' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DayBook() {
	const navigate = useNavigate();
	const [period, setPeriod] = useState<Period>('Today');
	const [typeFilter, setTypeFilter] = useState<TxType | 'all'>('all');

	const { from, to } = getPeriodRange(period);

	const { data: invoicesData = [], isLoading: invLoading, refetch: refetchInv } = useInvoices(1000);
	const { data: expData, isLoading: expLoading, refetch: refetchExp } = useExpenses({ from, to });
	const { data: cbData, isLoading: cbLoading, refetch: refetchCb } = useCashbook({ from, to });

	const invoices = invoicesData;
	const isLoading = invLoading || expLoading || cbLoading;

	function refetch() {
		refetchInv();
		refetchExp();
		refetchCb();
	}

	// Subscribe to real-time WS events and invalidate caches automatically
	useWsInvalidation(['invoices', 'expenses', 'purchases', 'cashbook']);

	// ── Build transaction list ──────────────────────────────────────────────────
	const transactions = useMemo(() => {
		const list: Transaction[] = [];

		// 1. Invoices (created)
		for (const inv of invoices) {
			if (!inRange(inv.createdAt, from, to)) continue;
			list.push({
				id: `inv-${inv.id}`,
				type: 'invoice',
				date: inv.createdAt,
				label: inv.invoiceNo,
				sublabel: inv.customer?.name ?? 'Customer',
				amount: parseFloat(String(inv.total ?? 0)),
				sign: 'debit',
				status: inv.status,
				navTo: `/invoices/${inv.id}`,
			});
		}

		// 2. Payments recorded — use paidAt if available, else updatedAt
		for (const inv of invoices) {
			const paidAmt = parseFloat(String(inv.paidAmount ?? 0));
			if (paidAmt <= 0) continue;
			const payDate = (inv as any).paidAt ?? inv.updatedAt ?? inv.createdAt;
			if (!inRange(payDate, from, to)) continue;
			list.push({
				id: `pay-${inv.id}`,
				type: 'payment',
				date: payDate,
				label: `Payment — ${inv.invoiceNo}`,
				sublabel: inv.customer?.name ?? '',
				amount: paidAmt,
				sign: 'credit',
				navTo: `/invoices/${inv.id}`,
			});
		}

		// 3. Expenses (real API)
		for (const exp of expData?.expenses ?? []) {
			list.push({
				id: `exp-${exp.id}`,
				type: 'expense',
				date: (exp.date ?? exp.createdAt ?? '') as string,
				label: exp.category,
				sublabel: [exp.vendor, exp.note].filter(Boolean).join(' · ') || undefined,
				amount: Number(exp.amount),
				sign: 'debit',
			});
		}

		// 4. Cash entries (real API — cashbook entries with type 'in' map to cash_in)
		for (const cash of cbData?.entries ?? []) {
			if (!inRange(cash.date?.slice(0, 10) ?? '', from, to)) continue;
			list.push({
				id: `cash-${cash.id}`,
				type: cash.type === 'in' ? 'cash_in' : 'cash_out',
				date: cash.date,
				label: cash.category,
				sublabel: cash.note || undefined,
				amount: cash.amount,
				sign: cash.type === 'in' ? 'credit' : 'debit',
			});
		}

		// Sort newest first
		return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [invoices, expData, cbData, from, to]);

	// Filter by type
	const filtered = typeFilter === 'all' ? transactions : transactions.filter((t) => t.type === typeFilter);

	// Totals
	const totalIn = filtered.filter((t) => t.sign === 'credit').reduce((s, t) => s + t.amount, 0);
	const totalOut = filtered.filter((t) => t.sign === 'debit').reduce((s, t) => s + t.amount, 0);
	const net = totalIn - totalOut;

	// Group by date
	const grouped = useMemo(() => {
		const map = new Map<string, Transaction[]>();
		for (const tx of filtered) {
			const day = tx.date.slice(0, 10);
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(tx);
		}
		return map;
	}, [filtered]);

	return (
		<div className="min-h-screen bg-background pb-24">
			{/* Header */}
			<header className="sticky top-0 z-20 border-b bg-card">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="icon" onClick={() => navigate('/')}>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div>
								<h1 className="text-base font-bold">📖 Day Book</h1>
								<p className="text-xs text-muted-foreground">
									{filtered.length} entries · {period}
								</p>
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
							<RefreshCw className="h-4 w-4" />
						</Button>
					</div>

					{/* Period selector */}
					<div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
						{PERIOD_OPTIONS.map((p) => (
							<Button
								key={p}
								size="sm"
								variant={period === p ? 'default' : 'outline'}
								className="shrink-0 h-7 text-xs px-3"
								onClick={() => setPeriod(p)}
							>
								{p}
							</Button>
						))}
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-3xl space-y-4 p-4">
				{/* Summary strip */}
				<div className="grid grid-cols-3 gap-3">
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<TrendingUp className="mx-auto mb-1 h-4 w-4 text-green-600" />
							<p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">
								{formatCurrency(totalIn)}
							</p>
							<p className="text-[10px] text-muted-foreground">Money In</p>
						</CardContent>
					</Card>
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<TrendingDown className="mx-auto mb-1 h-4 w-4 text-destructive" />
							<p className="text-sm font-bold text-destructive tabular-nums">
								{formatCurrency(totalOut)}
							</p>
							<p className="text-[10px] text-muted-foreground">Money Out</p>
						</CardContent>
					</Card>
					<Card className={`border-none shadow-sm ${net >= 0 ? 'bg-green-500/5' : 'bg-destructive/5'}`}>
						<CardContent className="p-3 text-center">
							<Calendar className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
							<p
								className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}
							>
								{net >= 0 ? '+' : ''}
								{formatCurrency(net)}
							</p>
							<p className="text-[10px] text-muted-foreground">Net</p>
						</CardContent>
					</Card>
				</div>

				{/* Type filter chips */}
				<div className="flex gap-1.5 overflow-x-auto pb-1">
					{TYPE_FILTERS.map((f) => (
						<button
							key={f.key}
							onClick={() => setTypeFilter(f.key)}
							className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
								typeFilter === f.key
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-border bg-card text-muted-foreground hover:bg-muted'
							}`}
						>
							{f.label}
						</button>
					))}
				</div>

				{/* Loading */}
				{isLoading && (
					<div className="flex h-32 items-center justify-center">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)}

				{/* No entries */}
				{!isLoading && filtered.length === 0 && (
					<div className="flex flex-col items-center gap-3 py-16 text-center">
						<span className="text-4xl">📖</span>
						<p className="text-sm text-muted-foreground">No transactions for {period}</p>
						<p className="text-xs text-muted-foreground">
							Create invoices, record payments, or add expenses to see them here.
						</p>
					</div>
				)}

				{/* Chronological grouped rows */}
				{Array.from(grouped.entries()).map(([day, txs]) => {
					const dayIn = txs.filter((t) => t.sign === 'credit').reduce((s, t) => s + t.amount, 0);
					const dayOut = txs.filter((t) => t.sign === 'debit').reduce((s, t) => s + t.amount, 0);
					return (
						<div key={day}>
							{/* Day header */}
							<div className="mb-2 flex items-center justify-between">
								<p className="text-xs font-semibold text-muted-foreground">{formatDate(day)}</p>
								<div className="flex gap-2 text-xs">
									{dayIn > 0 && <span className="text-green-600">+{formatCurrency(dayIn)}</span>}
									{dayOut > 0 && <span className="text-destructive">−{formatCurrency(dayOut)}</span>}
								</div>
							</div>

							<div className="overflow-hidden rounded-xl border bg-card">
								<div className="divide-y">
									{txs.map((tx) => {
										const cfg = TYPE_CFG[tx.type];
										return (
											<div
												key={tx.id}
												className={`flex items-center gap-3 px-4 py-3 transition-colors ${tx.navTo ? 'cursor-pointer hover:bg-muted/30' : ''}`}
												onClick={() => tx.navTo && navigate(tx.navTo)}
											>
												{/* Icon */}
												<div
													className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} text-base`}
												>
													{cfg.emoji}
												</div>

												{/* Label */}
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5">
														<p className="truncate text-sm font-medium">{tx.label}</p>
														{tx.status && (
															<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium capitalize text-muted-foreground">
																{tx.status}
															</span>
														)}
													</div>
													{tx.sublabel && (
														<p className="truncate text-xs text-muted-foreground">
															{tx.sublabel}
														</p>
													)}
												</div>

												{/* Amount */}
												<p
													className={`shrink-0 text-sm font-bold tabular-nums ${
														tx.sign === 'credit'
															? 'text-green-700 dark:text-green-400'
															: 'text-foreground'
													}`}
												>
													{tx.sign === 'credit' ? '+' : '−'}
													{formatCurrency(tx.amount)}
												</p>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					);
				})}
			</main>

			<BottomNav />
		</div>
	);
}

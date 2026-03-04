import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
	ArrowLeft,
	Search,
	X,
	Download,
	Bell,
	CheckCheck,
	SortDesc,
	CalendarClock,
	AlertTriangle,
	CheckCircle2,
	Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import {
	useCustomers,
	useInvoices,
	useReminders,
	useBulkReminders,
	useCancelReminder,
	useRecordPayment,
} from '@/hooks/useQueries';
import { formatCurrency, type Customer, type Reminder } from '@/lib/api';
import { fireConfetti } from '@/components/ConfettiOverlay';
import BottomNav from '@/components/BottomNav';

// ── helpers ─────────────────────────────────────────────────────────────────

function customerInitials(name: string) {
	return name
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

function agingLabel(days: number | null): { label: string; cls: string; icon: string } {
	if (!days || days <= 0) return { label: '—', cls: 'text-muted-foreground', icon: '⚪' };
	if (days >= 30) return { label: `${days}d`, cls: 'text-destructive font-semibold', icon: '🔴' };
	if (days >= 7) return { label: `${days}d`, cls: 'text-yellow-600 dark:text-yellow-400 font-medium', icon: '🟡' };
	return { label: `${days}d`, cls: 'text-muted-foreground', icon: '⚪' };
}

function agingBadgeCls(days: number | null) {
	if (!days || days <= 0) return 'bg-muted text-muted-foreground border-border';
	if (days >= 30) return 'bg-destructive/15 text-destructive border-destructive/30';
	if (days >= 7) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30';
	return 'bg-muted text-muted-foreground border-border';
}

function daysLeftBadgeCls(days: number) {
	if (days <= 1) return 'bg-destructive/15 text-destructive border-destructive/30';
	if (days <= 5) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-400/30';
	return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-400/30';
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── record-payment mini dialog ───────────────────────────────────────────────

interface PayDialogProps {
	customer: Customer;
	onClose: () => void;
}

function RecordPaymentDialog({ customer, onClose }: PayDialogProps) {
	const { toast } = useToast();
	const recordPayment = useRecordPayment();
	const [amount, setAmount] = useState(String(Math.max(0, parseFloat(String(customer.balance)))));
	const [mode, setMode] = useState('cash');
	const [notes, setNotes] = useState('');

	const submit = async () => {
		const amt = parseFloat(amount);
		if (!amt || amt <= 0) {
			toast({ title: 'Enter valid amount', variant: 'destructive' });
			return;
		}
		try {
			await recordPayment.mutateAsync({ customerId: customer.id, amount: amt, paymentMode: mode, notes });
			fireConfetti();
			toast({ title: `💰 ₹${amt.toLocaleString('en-IN')} recorded for ${customer.name}` });
			onClose();
		} catch (e: unknown) {
			toast({
				title: 'Payment failed',
				description: e instanceof Error ? e.message : 'Try again',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>💰 Record Payment</DialogTitle>
				</DialogHeader>
				<div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
						{customerInitials(customer.name)}
					</div>
					<div>
						<p className="font-medium">{customer.name}</p>
						<p className="text-xs text-muted-foreground">
							Balance due:{' '}
							<span className="text-destructive font-semibold">
								{formatCurrency(parseFloat(String(customer.balance)))}
							</span>
						</p>
					</div>
				</div>
				<div className="space-y-3">
					<div>
						<Label>Amount (₹)</Label>
						<Input
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0"
							className="mt-1"
						/>
					</div>
					<div>
						<Label>Payment Method</Label>
						<Select value={mode} onValueChange={setMode}>
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="cash">💵 Cash</SelectItem>
								<SelectItem value="upi">📱 UPI</SelectItem>
								<SelectItem value="card">💳 Card</SelectItem>
								<SelectItem value="bank">🏦 Bank Transfer</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Notes (optional)</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="mt-1 h-16 resize-none"
							placeholder="Add a note…"
						/>
					</div>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={submit} disabled={recordPayment.isPending}>
						{recordPayment.isPending ? 'Saving…' : 'Record Payment'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── schedule-reminder mini dialog ────────────────────────────────────────────

interface ReminderDialogProps {
	customers: Customer[];
	prefillCustomer?: Customer;
	onClose: () => void;
}

function ScheduleReminderDialog({ customers, prefillCustomer, onClose }: ReminderDialogProps) {
	const { toast } = useToast();
	const bulkReminders = useBulkReminders();
	const [selectedId, setSelectedId] = useState(prefillCustomer?.id ?? '');
	const [daysOffset, setDaysOffset] = useState('1');

	const submit = async () => {
		if (!selectedId) {
			toast({ title: 'Select a customer', variant: 'destructive' });
			return;
		}
		try {
			await bulkReminders.mutateAsync({ customerIds: [selectedId], daysOffset: parseInt(daysOffset, 10) });
			toast({ title: '📅 Reminder scheduled' });
			onClose();
		} catch (e: unknown) {
			toast({
				title: 'Failed',
				description: e instanceof Error ? e.message : 'Try again',
				variant: 'destructive',
			});
		}
	};

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>📅 Schedule Reminder</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Customer</Label>
						<Select value={selectedId} onValueChange={setSelectedId}>
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Select customer…" />
							</SelectTrigger>
							<SelectContent>
								{customers.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
										{c.phone ? ` · ${c.phone}` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>Send reminder in</Label>
						<Select value={daysOffset} onValueChange={setDaysOffset}>
							<SelectTrigger className="mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="0">Today</SelectItem>
								<SelectItem value="1">Tomorrow</SelectItem>
								<SelectItem value="2">In 2 days</SelectItem>
								<SelectItem value="3">In 3 days</SelectItem>
								<SelectItem value="7">In 1 week</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={submit} disabled={bulkReminders.isPending}>
						{bulkReminders.isPending ? 'Scheduling…' : 'Schedule'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── main page ────────────────────────────────────────────────────────────────

type SortKey = 'amount' | 'days' | 'name';
type FilterKey = 'all' | 'critical' | 'warning' | 'fresh';

const OverduePage = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { toast } = useToast();
	useWsInvalidation(['customers', 'reminders', 'summary']);

	// Tab state — default to 'overdue', can be 'upcoming' via ?tab=upcoming
	const [tab, setTab] = useState<'overdue' | 'upcoming'>(
		searchParams.get('tab') === 'upcoming' ? 'upcoming' : 'overdue'
	);

	// Data
	const { data: allCustomers = [], isLoading: customersLoading } = useCustomers();
	const { data: allInvoices = [], isLoading: invoicesLoading } = useInvoices(500);
	const { data: reminders = [], isLoading: remindersLoading } = useReminders();
	const bulkReminders = useBulkReminders();
	const cancelReminder = useCancelReminder();

	// Overdue tab state
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<FilterKey>('all');
	const [sort, setSort] = useState<SortKey>('amount');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
	const [reminderCustomer, setReminderCustomer] = useState<Customer | undefined>(undefined);
	const [showReminderDialog, setShowReminderDialog] = useState(false);

	// ── Overdue data: customers with balance > 0 ──────────────────────────────

	const getDaysOverdue = useMemo(() => {
		const map = new Map<string, number | null>();
		for (const c of allCustomers) {
			const unpaid = allInvoices.filter(
				(inv) => inv.customerId === c.id && inv.status !== 'paid' && inv.status !== 'cancelled'
			);
			if (unpaid.length === 0) {
				map.set(c.id, null);
				continue;
			}
			const oldest = unpaid.reduce((prev, cur) =>
				new Date(cur.dueDate ?? cur.createdAt) < new Date(prev.dueDate ?? prev.createdAt) ? cur : prev
			);
			const days = Math.ceil((Date.now() - new Date(oldest.dueDate ?? oldest.createdAt).getTime()) / 86_400_000);
			map.set(c.id, days > 0 ? days : null);
		}
		return (id: string) => map.get(id) ?? null;
	}, [allCustomers, allInvoices]);

	const getInvoiceCount = useMemo(() => {
		const map = new Map<string, number>();
		for (const inv of allInvoices) {
			if (inv.status !== 'paid' && inv.status !== 'cancelled') {
				map.set(inv.customerId, (map.get(inv.customerId) ?? 0) + 1);
			}
		}
		return (id: string) => map.get(id) ?? 0;
	}, [allInvoices]);

	const overdueCustomers = useMemo(() => {
		let list = allCustomers.filter((c) => parseFloat(String(c.balance)) > 0);

		// filter chip
		if (filter !== 'all') {
			list = list.filter((c) => {
				const d = getDaysOverdue(c.id);
				if (filter === 'critical') return d !== null && d >= 30;
				if (filter === 'warning') return d !== null && d >= 7 && d < 30;
				if (filter === 'fresh') return d === null || d < 7;
				return true;
			});
		}

		// search
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
		}

		// sort
		list = [...list].sort((a, b) => {
			if (sort === 'amount') return parseFloat(String(b.balance)) - parseFloat(String(a.balance));
			if (sort === 'days') {
				const da = getDaysOverdue(a.id) ?? -1;
				const db = getDaysOverdue(b.id) ?? -1;
				return db - da;
			}
			return a.name.localeCompare(b.name);
		});

		return list;
	}, [allCustomers, filter, search, sort, getDaysOverdue]);

	const totalOverdue = useMemo(
		() => overdueCustomers.reduce((s, c) => s + parseFloat(String(c.balance)), 0),
		[overdueCustomers]
	);

	const totalAllOverdue = useMemo(
		() =>
			allCustomers
				.filter((c) => parseFloat(String(c.balance)) > 0)
				.reduce((s, c) => s + parseFloat(String(c.balance)), 0),
		[allCustomers]
	);

	const criticalCount = useMemo(
		() =>
			allCustomers.filter((c) => {
				const d = getDaysOverdue(c.id);
				return d !== null && d >= 30;
			}).length,
		[allCustomers, getDaysOverdue]
	);

	// ── Upcoming tab data ─────────────────────────────────────────────────────

	const upcomingReminders = useMemo(
		() =>
			reminders
				.filter((r) => r.status === 'pending')
				.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()),
		[reminders]
	);

	const totalExpected = useMemo(
		() => upcomingReminders.reduce((s, r) => s + parseFloat(String(r.amount)), 0),
		[upcomingReminders]
	);

	const getDaysLeft = (t: string) => Math.max(0, Math.ceil((new Date(t).getTime() - Date.now()) / 86_400_000));

	// ── Bulk actions ──────────────────────────────────────────────────────────

	const toggleSelect = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		if (selected.size === overdueCustomers.length) setSelected(new Set());
		else setSelected(new Set(overdueCustomers.map((c) => c.id)));
	};

	const sendBulkReminders = async (ids: string[]) => {
		try {
			const result = await bulkReminders.mutateAsync({ customerIds: ids, daysOffset: 1 });
			const count = (result as { reminders?: unknown[] }).reminders?.length ?? 0;
			toast({ title: `📱 ${count} reminder${count !== 1 ? 's' : ''} scheduled` });
			setSelected(new Set());
		} catch (e: unknown) {
			toast({
				title: 'Failed',
				description: e instanceof Error ? e.message : 'Try again',
				variant: 'destructive',
			});
		}
	};

	const exportCSV = (list: Customer[]) => {
		const header = ['#', 'Customer', 'Phone', 'Balance (₹)', 'Days Overdue', 'Unpaid Invoices'];
		const rows = list.map((c, i) => [
			String(i + 1),
			c.name,
			c.phone ?? '',
			String(parseFloat(String(c.balance))),
			String(getDaysOverdue(c.id) ?? ''),
			String(getInvoiceCount(c.id)),
		]);
		const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'overdue-payments.csv';
		a.click();
		URL.revokeObjectURL(url);
		toast({ title: '📊 Exported as CSV' });
	};

	const isLoading = customersLoading || invoicesLoading;

	// ── render ────────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen bg-background pb-24">
			{/* Header */}
			<div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
				<div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
					<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div className="flex-1">
						<h1 className="text-base font-semibold leading-tight">Payments</h1>
						<p className="text-xs text-muted-foreground">
							{tab === 'overdue'
								? `${allCustomers.filter((c) => parseFloat(String(c.balance)) > 0).length} customers • ${formatCurrency(totalAllOverdue)} total due`
								: `${upcomingReminders.length} pending reminders • ${formatCurrency(totalExpected)} expected`}
						</p>
					</div>
				</div>

				{/* Tab bar */}
				<div className="mx-auto flex max-w-3xl border-t px-4">
					<button
						onClick={() => setTab('overdue')}
						className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
							tab === 'overdue'
								? 'border-b-2 border-destructive text-destructive'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<AlertTriangle className="h-3.5 w-3.5" />
						Overdue
						{criticalCount > 0 && (
							<span className="ml-0.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
								{criticalCount}
							</span>
						)}
					</button>
					<button
						onClick={() => setTab('upcoming')}
						className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
							tab === 'upcoming'
								? 'border-b-2 border-primary text-primary'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<CalendarClock className="h-3.5 w-3.5" />
						Upcoming
						{upcomingReminders.length > 0 && (
							<span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
								{upcomingReminders.length}
							</span>
						)}
					</button>
				</div>
			</div>

			<div className="mx-auto max-w-3xl space-y-4 p-4">
				{/* ═══════════════════ OVERDUE TAB ═══════════════════ */}
				{tab === 'overdue' && (
					<>
						{/* Summary stats */}
						<div className="grid grid-cols-3 gap-3">
							<Card className="border-none shadow-sm">
								<CardContent className="p-3 text-center">
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Total Due
									</p>
									<p className="mt-0.5 text-base font-bold text-destructive">
										{formatCurrency(totalAllOverdue)}
									</p>
								</CardContent>
							</Card>
							<Card className="border-none shadow-sm">
								<CardContent className="p-3 text-center">
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Customers
									</p>
									<p className="mt-0.5 text-base font-bold">
										{allCustomers.filter((c) => parseFloat(String(c.balance)) > 0).length}
									</p>
								</CardContent>
							</Card>
							<Card className="border-none shadow-sm">
								<CardContent className="p-3 text-center">
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Critical 30d+
									</p>
									<p
										className={`mt-0.5 text-base font-bold ${criticalCount > 0 ? 'text-destructive' : ''}`}
									>
										{criticalCount}
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Search + Sort */}
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search customers…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 pr-8"
								/>
								{search && (
									<button
										onClick={() => setSearch('')}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<X className="h-4 w-4" />
									</button>
								)}
							</div>
							<Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
								<SelectTrigger className="w-[110px] gap-1.5">
									<SortDesc className="h-3.5 w-3.5 shrink-0" />
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="amount">Amount</SelectItem>
									<SelectItem value="days">Most overdue</SelectItem>
									<SelectItem value="name">Name A-Z</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Filter chips */}
						<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
							{(
								[
									['all', 'All', ''],
									['critical', '🔴 Critical 30d+', ''],
									['warning', '🟡 7-30 days', ''],
									['fresh', '⚪ Under 7d', ''],
								] as const
							).map(([key, label]) => (
								<button
									key={key}
									onClick={() => setFilter(key)}
									className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
										filter === key
											? 'bg-primary text-primary-foreground border-primary'
											: 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
									}`}
								>
									{label === 'All'
										? `All (${allCustomers.filter((c) => parseFloat(String(c.balance)) > 0).length})`
										: label}
								</button>
							))}
						</div>

						{/* Bulk select bar */}
						{overdueCustomers.length > 0 && (
							<div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
								<Checkbox
									checked={selected.size === overdueCustomers.length && overdueCustomers.length > 0}
									onCheckedChange={toggleAll}
									id="select-all"
								/>
								<label
									htmlFor="select-all"
									className="flex-1 cursor-pointer text-xs text-muted-foreground"
								>
									{selected.size === 0 ? 'Select all' : `${selected.size} selected`}
								</label>
								{selected.size > 0 && (
									<div className="flex gap-1">
										<Button
											size="sm"
											variant="outline"
											className="h-7 px-2 text-xs"
											disabled={bulkReminders.isPending}
											onClick={() => sendBulkReminders(Array.from(selected))}
										>
											📱 Remind
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="h-7 px-2 text-xs"
											onClick={() =>
												exportCSV(overdueCustomers.filter((c) => selected.has(c.id)))
											}
										>
											<Download className="h-3 w-3" />
										</Button>
									</div>
								)}
							</div>
						)}

						{/* Customer list */}
						<Card className="border-none shadow-sm">
							<CardContent className="p-0">
								{isLoading ? (
									<div className="space-y-0 divide-y">
										{[1, 2, 3].map((i) => (
											<div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
												<div className="h-10 w-10 rounded-full bg-muted" />
												<div className="flex-1 space-y-1.5">
													<div className="h-3.5 w-32 rounded bg-muted" />
													<div className="h-2.5 w-20 rounded bg-muted" />
												</div>
												<div className="h-4 w-16 rounded bg-muted" />
											</div>
										))}
									</div>
								) : overdueCustomers.length === 0 ? (
									<div className="flex flex-col items-center gap-2 py-12 text-center">
										<CheckCircle2 className="h-10 w-10 text-green-500/60" />
										<p className="font-medium">All clear!</p>
										<p className="text-sm text-muted-foreground">
											{search || filter !== 'all'
												? 'No customers match these filters.'
												: 'No overdue payments right now.'}
										</p>
									</div>
								) : (
									<div className="divide-y">
										{overdueCustomers.map((customer) => {
											const balance = parseFloat(String(customer.balance));
											const days = getDaysOverdue(customer.id);
											const invoiceCount = getInvoiceCount(customer.id);
											const aging = agingLabel(days);
											const badgeCls = agingBadgeCls(days);

											return (
												<div
													key={customer.id}
													className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
												>
													{/* Checkbox */}
													<Checkbox
														checked={selected.has(customer.id)}
														onCheckedChange={() => toggleSelect(customer.id)}
														onClick={(e) => e.stopPropagation()}
													/>

													{/* Avatar */}
													<button
														className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-sm font-bold text-destructive"
														onClick={() => navigate(`/customers/${customer.id}`)}
													>
														{customerInitials(customer.name)}
													</button>

													{/* Info */}
													<button
														className="min-w-0 flex-1 text-left"
														onClick={() => navigate(`/customers/${customer.id}`)}
													>
														<p className="truncate text-sm font-medium">{customer.name}</p>
														<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
															{days && days > 0 && (
																<span
																	className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badgeCls}`}
																>
																	{aging.icon} {days}d overdue
																</span>
															)}
															{invoiceCount > 0 && (
																<span className="text-[10px] text-muted-foreground">
																	{invoiceCount} inv
																</span>
															)}
															{customer.phone && (
																<span className="text-[10px] text-muted-foreground">
																	{customer.phone}
																</span>
															)}
														</div>
													</button>

													{/* Balance */}
													<span className="shrink-0 text-sm font-bold text-destructive">
														{formatCurrency(balance)}
													</span>

													{/* Quick actions — always visible on mobile */}
													<div className="flex shrink-0 items-center gap-1">
														{customer.phone && (
															<a
																href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
																target="_blank"
																rel="noreferrer"
																onClick={(e) => e.stopPropagation()}
																className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-base"
																title="WhatsApp"
															>
																📱
															</a>
														)}
														<Button
															size="sm"
															variant="ghost"
															className="h-8 px-2 text-xs font-medium text-primary hover:text-primary"
															onClick={(e) => {
																e.stopPropagation();
																setPayCustomer(customer);
															}}
														>
															Pay
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Bottom bulk actions */}
						{overdueCustomers.length > 0 && (
							<div className="flex gap-2">
								<Button
									variant="outline"
									className="h-10 flex-1 gap-2 text-sm"
									disabled={bulkReminders.isPending}
									onClick={() => sendBulkReminders(overdueCustomers.map((c) => c.id))}
								>
									<Bell className="h-4 w-4" />
									{bulkReminders.isPending
										? 'Scheduling…'
										: `Remind All (${overdueCustomers.length})`}
								</Button>
								<Button
									variant="outline"
									className="h-10 flex-1 gap-2 text-sm"
									onClick={() => exportCSV(overdueCustomers)}
								>
									<Download className="h-4 w-4" />
									Export CSV
								</Button>
							</div>
						)}

						{/* Total bar */}
						{overdueCustomers.length > 0 && (
							<div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
								<div>
									<p className="text-xs text-muted-foreground">
										{filter === 'all' ? 'Total outstanding' : `Total (${filter} filter)`}
									</p>
									<p className="text-lg font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
								</div>
								<Button
									size="sm"
									className="h-9 gap-2 bg-primary text-primary-foreground"
									onClick={() => navigate('/payment')}
								>
									💰 Record Payment
								</Button>
							</div>
						)}
					</>
				)}

				{/* ═══════════════════ UPCOMING TAB ═══════════════════ */}
				{tab === 'upcoming' && (
					<>
						{/* Summary stats */}
						<div className="grid grid-cols-2 gap-3">
							<Card className="border-none shadow-sm">
								<CardContent className="p-3 text-center">
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Pending Reminders
									</p>
									<p className="mt-0.5 text-xl font-bold text-primary">{upcomingReminders.length}</p>
								</CardContent>
							</Card>
							<Card className="border-none shadow-sm">
								<CardContent className="p-3 text-center">
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Expected Amount
									</p>
									<p className="mt-0.5 text-xl font-bold">{formatCurrency(totalExpected)}</p>
								</CardContent>
							</Card>
						</div>

						{/* Schedule new */}
						<Button
							className="h-10 w-full gap-2"
							onClick={() => {
								setReminderCustomer(undefined);
								setShowReminderDialog(true);
							}}
						>
							<CalendarClock className="h-4 w-4" />
							Schedule New Reminder
						</Button>

						{/* Reminders list */}
						<Card className="border-none shadow-sm">
							<CardContent className="p-0">
								{remindersLoading ? (
									<div className="space-y-0 divide-y">
										{[1, 2, 3].map((i) => (
											<div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
												<div className="h-9 w-9 rounded-full bg-muted" />
												<div className="flex-1 space-y-1.5">
													<div className="h-3.5 w-28 rounded bg-muted" />
													<div className="h-2.5 w-20 rounded bg-muted" />
												</div>
												<div className="h-4 w-14 rounded bg-muted" />
											</div>
										))}
									</div>
								) : upcomingReminders.length === 0 ? (
									<div className="flex flex-col items-center gap-2 py-12 text-center">
										<Clock className="h-10 w-10 text-muted-foreground/40" />
										<p className="font-medium">No upcoming reminders</p>
										<p className="text-sm text-muted-foreground">
											Schedule reminders for payment collection.
										</p>
									</div>
								) : (
									<div className="divide-y">
										{upcomingReminders.map((r: Reminder) => {
											const days = getDaysLeft(r.scheduledTime);
											const isPastDue = new Date(r.scheduledTime) < new Date();
											const amount = parseFloat(String(r.amount));
											const phone = r.customer?.phone;

											return (
												<div key={r.id} className="group flex items-center gap-3 px-4 py-3">
													{/* Avatar */}
													<button
														className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
														onClick={() =>
															r.customerId && navigate(`/customers/${r.customerId}`)
														}
													>
														{customerInitials(r.customer?.name ?? '?')}
													</button>

													{/* Info */}
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium">
															{r.customer?.name ?? '—'}
														</p>
														<div className="mt-0.5 flex flex-wrap items-center gap-1.5">
															<span
																className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${daysLeftBadgeCls(days)}`}
															>
																{isPastDue
																	? '⏰ Overdue'
																	: days === 0
																		? '🔴 Today'
																		: `${days === 1 ? '🟡' : '🟢'} ${days}d`}
															</span>
															<span className="text-[10px] text-muted-foreground">
																{formatDate(r.scheduledTime)}
															</span>
														</div>
													</div>

													{/* Amount */}
													<span className="shrink-0 text-sm font-semibold">
														{amount > 0 ? (
															formatCurrency(amount)
														) : (
															<span className="text-muted-foreground">—</span>
														)}
													</span>

													{/* Actions */}
													<div className="flex shrink-0 items-center gap-1">
														{phone && (
															<a
																href={`https://wa.me/91${phone.replace(/\D/g, '')}`}
																target="_blank"
																rel="noreferrer"
																className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-base"
																title="WhatsApp"
															>
																📱
															</a>
														)}
														<Button
															size="sm"
															variant="ghost"
															className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
															disabled={cancelReminder.isPending}
															onClick={async () => {
																try {
																	await cancelReminder.mutateAsync(r.id);
																	toast({ title: 'Reminder cancelled' });
																} catch {
																	toast({
																		title: 'Failed to cancel',
																		variant: 'destructive',
																	});
																}
															}}
														>
															<X className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Send all reminders nudge */}
						{upcomingReminders.length > 0 && (
							<div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
								<div>
									<p className="text-xs text-muted-foreground">Due for collection</p>
									<p className="text-lg font-bold">{formatCurrency(totalExpected)}</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="h-9 gap-2"
									disabled={bulkReminders.isPending}
									onClick={() => {
										const ids = [
											...new Set(
												upcomingReminders.map((r) => r.customerId).filter(Boolean) as string[]
											),
										];
										sendBulkReminders(ids);
									}}
								>
									<CheckCheck className="h-4 w-4" />
									Remind All
								</Button>
							</div>
						)}
					</>
				)}
			</div>

			{/* Record Payment dialog */}
			{payCustomer && <RecordPaymentDialog customer={payCustomer} onClose={() => setPayCustomer(null)} />}

			{/* Schedule Reminder dialog */}
			{showReminderDialog && (
				<ScheduleReminderDialog
					customers={allCustomers.filter((c) => parseFloat(String(c.balance)) > 0)}
					prefillCustomer={reminderCustomer}
					onClose={() => {
						setShowReminderDialog(false);
						setReminderCustomer(undefined);
					}}
				/>
			)}

			<BottomNav />
		</div>
	);
};

export default OverduePage;

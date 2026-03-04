/**
 * Expenses — Vyapar feature parity.
 * Tracks business expenses (rent, salary, stock purchase, travel, etc.)
 * Data persisted via REST API → PostgreSQL.
 */
import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, ShoppingCart, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VoiceBar from '@/components/VoiceBar';
import { useToast } from '@/hooks/use-toast';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';

// ── Config ────────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
	'Stock Purchase',
	'Rent',
	'Salary & Wages',
	'Electricity & Utilities',
	'Transport & Fuel',
	'Repairs & Maintenance',
	'Marketing',
	'Packaging',
	'Bank Charges',
	'Miscellaneous',
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const catIcon: Record<string, string> = {
	'Stock Purchase': '📦',
	Rent: '🏠',
	'Salary & Wages': '👷',
	'Electricity & Utilities': '⚡',
	'Transport & Fuel': '🚗',
	'Repairs & Maintenance': '🔧',
	Marketing: '📢',
	Packaging: '📫',
	'Bank Charges': '🏦',
	Miscellaneous: '🗂️',
};

const TABS = ['All', 'This Week', 'This Month'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().slice(0, 10);

function tabDateRange(tab: Tab): { from?: string; to?: string } {
	if (tab === 'All') return {};
	const now = new Date();
	const from = new Date(now);
	if (tab === 'This Week') from.setDate(now.getDate() - 7);
	else from.setDate(1);
	return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Expenses() {
	const navigate = useNavigate();
	const { toast } = useToast();

	const [filterTab, setFilterTab] = useState<Tab>('This Month');
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);

	// Form state
	const [category, setCategory] = useState<ExpenseCategory>('Miscellaneous');
	const [amount, setAmount] = useState('');
	const [note, setNote] = useState('');
	const [vendor, setVendor] = useState('');
	const [date, setDate] = useState(today());

	// API hooks
	const { data: expData } = useExpenses(tabDateRange(filterTab));
	const { data: monthData } = useExpenses(tabDateRange('This Month'));
	const createExpense = useCreateExpense();
	const deleteExpense = useDeleteExpense();
	useWsInvalidation(['expenses', 'cashbook']);

	const expenses = expData?.expenses ?? [];
	const monthExpenses = monthData?.expenses ?? [];

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		const amt = parseFloat(amount);
		if (!amt || amt <= 0) return;
		try {
			await createExpense.mutateAsync({
				category,
				amount: amt,
				note: note.trim(),
				vendor: vendor.trim() || undefined,
				date,
			});
			toast({ title: 'Expense added', description: `${category} · ${fmt(amt)}` });
			setAmount('');
			setNote('');
			setVendor('');
			setDate(today());
			setOpen(false);
		} catch {
			toast({ title: 'Failed to add expense', variant: 'destructive' });
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteExpense.mutateAsync(id);
			toast({ title: 'Deleted' });
		} catch {
			toast({ title: 'Failed to delete', variant: 'destructive' });
		}
	}

	const filtered = useMemo(() => {
		if (!search.trim()) return expenses;
		const q = search.toLowerCase();
		return expenses.filter(
			(e) =>
				e.category.toLowerCase().includes(q) ||
				(e.note ?? '').toLowerCase().includes(q) ||
				(e.vendor ?? '').toLowerCase().includes(q)
		);
	}, [expenses, search]);

	const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
	const totalMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

	const categoryTotals = useMemo(() => {
		const map: Record<string, number> = {};
		filtered.forEach((e) => {
			map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
		});
		return Object.entries(map)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);
	}, [filtered]);

	return (
		<div className="min-h-screen bg-background pb-24">
			{/* Header */}
			<header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<h1 className="text-lg font-bold">Expenses</h1>
							<p className="text-xs text-muted-foreground">This month: {fmt(totalMonth)}</p>
						</div>
					</div>
					<Button size="sm" onClick={() => setOpen(true)}>
						<Plus className="mr-1 h-4 w-4" /> Add
					</Button>
				</div>
				<VoiceBar
					idleHint={
						<>
							<span className="font-medium">"500 petrol expense add karo"</span> ·{' '}
							<span>"aaj kitna expense hua?"</span>
						</>
					}
				/>
			</header>

			<main className="mx-auto max-w-2xl space-y-4 p-4">
				{/* KPI strip */}
				<div className="grid grid-cols-3 gap-3">
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground">This Month</p>
							<p className="text-lg font-bold text-destructive">{fmt(totalMonth)}</p>
						</CardContent>
					</Card>
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Entries</p>
							<p className="text-lg font-bold">{monthExpenses.length}</p>
						</CardContent>
					</Card>
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground">Top Category</p>
							<p className="text-sm font-bold truncate">{categoryTotals[0]?.[0]?.split(' ')[0] ?? '—'}</p>
						</CardContent>
					</Card>
				</div>

				{/* Top categories */}
				{categoryTotals.length > 0 && (
					<Card className="border-none shadow-sm">
						<CardContent className="p-4">
							<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								<TrendingDown className="mr-1 inline h-3.5 w-3.5" />
								Top Categories
							</p>
							<div className="space-y-2">
								{categoryTotals.map(([cat, total]) => {
									const pct = totalFiltered > 0 ? Math.round((total / totalFiltered) * 100) : 0;
									return (
										<div key={cat} className="space-y-0.5">
											<div className="flex justify-between text-xs">
												<span>
													{catIcon[cat] ?? '🗂️'} {cat}
												</span>
												<span className="font-semibold">
													{fmt(total)} ({pct}%)
												</span>
											</div>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-destructive transition-all duration-500"
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Tab + search */}
				<div className="flex gap-1 overflow-x-auto scrollbar-none rounded-xl border bg-muted/30 p-1">
					{TABS.map((t) => (
						<button
							key={t}
							onClick={() => setFilterTab(t)}
							className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
								t === filterTab
									? 'bg-card shadow text-foreground'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							{t}
						</button>
					))}
				</div>
				<Input
					placeholder="Search category, vendor, note…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="bg-card"
				/>

				{/* List */}
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
						<ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
						<p className="text-sm font-medium">No expenses yet</p>
						<p className="text-xs text-muted-foreground">Tap + or say "500 ka rent dalo"</p>
						<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
							Add First Expense
						</Button>
					</div>
				) : (
					<div className="space-y-2">
						<p className="flex justify-between text-xs text-muted-foreground">
							<span>{filtered.length} entries</span>
							<span className="font-semibold text-destructive">Total: {fmt(totalFiltered)}</span>
						</p>
						{filtered.map((exp) => (
							<div
								key={exp.id}
								className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
							>
								<span className="text-2xl">{catIcon[exp.category] ?? '🗂️'}</span>
								<div className="min-w-0 flex-1">
									<div className="flex items-baseline gap-2">
										<p className="font-semibold">{fmt(Number(exp.amount))}</p>
										<p className="text-xs text-muted-foreground">{exp.category}</p>
									</div>
									{(exp.note || exp.vendor) && (
										<p className="truncate text-xs text-muted-foreground">
											{[exp.vendor, exp.note].filter(Boolean).join(' · ')}
										</p>
									)}
									<p className="text-[10px] text-muted-foreground">{exp.date?.slice(0, 10)}</p>
								</div>
								<button
									onClick={() => handleDelete(exp.id)}
									className="shrink-0 rounded-lg p-1.5 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				)}
			</main>

			{/* Add Expense Dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>💸 Add Expense</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleAdd} className="space-y-3 pt-2">
						<div className="space-y-1.5">
							<Label>Category</Label>
							<Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{EXPENSE_CATEGORIES.map((c) => (
										<SelectItem key={c} value={c}>
											{catIcon[c]} {c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Amount (₹) *</Label>
							<Input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="e.g. 5000"
								required
								min={1}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Vendor / Paid To</Label>
							<Input
								value={vendor}
								onChange={(e) => setVendor(e.target.value)}
								placeholder="Ramesh Hardware, Landlord Jim…"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Note</Label>
							<Input
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="Brief description"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Date</Label>
							<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
						</div>
						<DialogFooter className="pt-2">
							<Button variant="outline" type="button" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={!amount || createExpense.isPending}>
								{createExpense.isPending ? 'Saving…' : 'Add Expense'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

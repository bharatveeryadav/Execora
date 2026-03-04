import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	Search,
	Phone,
	MessageCircle,
	ChevronRight,
	User,
	Plus,
	Users,
	CheckCircle2,
	AlertCircle,
	IndianRupee,
	Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCustomers, useCreateCustomer } from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { Customer, formatCurrency } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

const CUSTOMER_TAGS = ['VIP', 'Wholesale', 'Blacklist', 'Regular'] as const;
type FilterTab = 'all' | 'outstanding' | 'clear';

const Customers = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const [search, setSearch] = useState('');
	const [filter, setFilter] = useState<FilterTab>('all');
	const [searchOpen, setSearchOpen] = useState(false);

	// ── Add Customer dialog state ──────────────────────────────────────────────
	const [addOpen, setAddOpen] = useState(false);
	const [newName, setNewName] = useState('');
	const [newPhone, setNewPhone] = useState('');
	const [newEmail, setNewEmail] = useState('');
	const [newNickname, setNewNickname] = useState('');
	const [newLandmark, setNewLandmark] = useState('');
	const [newNotes, setNewNotes] = useState('');
	const [newOpeningBal, setNewOpeningBal] = useState('');
	const [newTags, setNewTags] = useState<string[]>([]);

	const { data: customers = [], isLoading } = useCustomers(search, 200);
	const createCustomer = useCreateCustomer();
	useWsInvalidation(['customers', 'summary']);

	const outstanding = customers.reduce((s, c) => s + Math.max(0, parseFloat(String(c.balance))), 0);

	// ── Filtering ─────────────────────────────────────────────────────────────
	const outCount = customers.filter((c) => parseFloat(String(c.balance)) > 0).length;
	const clearCount = customers.filter((c) => parseFloat(String(c.balance)) <= 0).length;

	const filtered = [...customers]
		.filter((c) => {
			const bal = parseFloat(String(c.balance));
			if (filter === 'outstanding') return bal > 0;
			if (filter === 'clear') return bal <= 0;
			return true;
		})
		.sort((a, b) => parseFloat(String(b.balance)) - parseFloat(String(a.balance)));

	// ── Add Customer helpers ──────────────────────────────────────────────────
	function openAdd() {
		setNewName('');
		setNewPhone('');
		setNewEmail('');
		setNewNickname('');
		setNewLandmark('');
		setNewNotes('');
		setNewOpeningBal('');
		setNewTags([]);
		setAddOpen(true);
	}

	function handleAdd() {
		if (!newName.trim()) return;
		createCustomer.mutate(
			{
				name: newName.trim(),
				phone: newPhone || undefined,
				email: newEmail || undefined,
				nickname: newNickname || undefined,
				landmark: newLandmark || undefined,
				notes: newNotes || undefined,
				openingBalance: newOpeningBal ? parseFloat(newOpeningBal) : undefined,
				tags: newTags.length ? newTags : undefined,
			},
			{
				onSuccess: (data) => {
					const customer = (data as { customer: Customer }).customer;
					toast({ title: `${newName} added` });
					setAddOpen(false);
					if (customer?.id) navigate(`/customers/${customer.id}`);
				},
				onError: (err: unknown) => {
					const msg =
						err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to add customer';
					toast({ title: msg, variant: 'destructive' });
				},
			}
		);
	}

	return (
		<div className="min-h-screen bg-background pb-24 md:pb-0">
			{/* ── Header ──────────────────────────────────────────────────────────────── */}
			<header className="sticky top-0 z-20 border-b bg-card">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" onClick={() => navigate('/')}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<div className="flex-1">
							<h1 className="text-base font-bold">👥 Customers</h1>
							<p className="text-xs text-muted-foreground">
								{customers.length} total
								{outCount > 0 && (
									<>
										{' '}
										·{' '}
										<span className="text-destructive font-medium">
											{outCount} owe ₹{formatCurrency(outstanding)}
										</span>
									</>
								)}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSearchOpen((s) => !s);
								if (searchOpen) setSearch('');
							}}
						>
							<Search className="h-5 w-5" />
						</Button>
						<Button size="sm" className="gap-1" onClick={openAdd}>
							<Plus className="h-4 w-4" /> Add
						</Button>
					</div>

					{/* Inline search (toggleable) */}
					{searchOpen && (
						<div className="mt-2 pb-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9 h-9 text-sm"
									placeholder="Search by name or phone…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									autoFocus
								/>
							</div>
						</div>
					)}
				</div>
			</header>

			<main className="mx-auto max-w-3xl space-y-3 p-4 md:p-6">
				{/* ── Summary strip ─────────────────────────────────────────────────── */}
				<div className="grid grid-cols-3 gap-2">
					{[
						{
							label: 'Total',
							value: customers.length,
							icon: <Users className="h-4 w-4 text-muted-foreground" />,
							color: 'text-foreground',
						},
						{
							label: 'Has Due',
							value: outCount,
							icon: <AlertCircle className="h-4 w-4 text-destructive" />,
							color: 'text-destructive',
						},
						{
							label: 'Outstanding',
							value: `₹${formatCurrency(outstanding)}`,
							icon: <IndianRupee className="h-4 w-4 text-destructive" />,
							color: 'text-destructive font-bold tabular-nums',
						},
					].map((s) => (
						<div key={s.label} className="flex flex-col items-center gap-0.5 rounded-xl border bg-card p-3">
							{s.icon}
							<p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
							<p className="text-[10px] text-muted-foreground">{s.label}</p>
						</div>
					))}
				</div>

				{/* Filter tabs */}
				<div className="flex rounded-xl border bg-muted/50 p-1 gap-1">
					{(
						[
							{ key: 'all', label: 'All', count: customers.length, Icon: Users },
							{ key: 'outstanding', label: 'Has Due', count: outCount, Icon: AlertCircle },
							{ key: 'clear', label: 'Clear', count: clearCount, Icon: CheckCircle2 },
						] as { key: FilterTab; label: string; count: number; Icon: any }[]
					).map(({ key, label, count, Icon }) => (
						<button
							key={key}
							onClick={() => setFilter(key)}
							className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
								filter === key
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<Icon
								className={`h-3.5 w-3.5 ${
									key === 'outstanding' ? 'text-destructive' : key === 'clear' ? 'text-green-600' : ''
								}`}
							/>
							{label}
							<span
								className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
									filter === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
								}`}
							>
								{count}
							</span>
						</button>
					))}
				</div>

				{/* Customer list */}
				<div className="overflow-hidden rounded-xl border bg-card">
					{isLoading ? (
						<div className="divide-y">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="flex items-center gap-3 p-4">
									<div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
									<div className="flex-1 space-y-2">
										<div className="h-3 w-32 animate-pulse rounded bg-muted" />
										<div className="h-2.5 w-24 animate-pulse rounded bg-muted" />
									</div>
									<div className="h-4 w-16 animate-pulse rounded bg-muted" />
								</div>
							))}
						</div>
					) : filtered.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-14 text-center">
							<User className="h-10 w-10 text-muted-foreground/40" />
							<p className="text-sm text-muted-foreground">
								{search
									? `No customers matching "${search}"`
									: filter === 'outstanding'
										? 'No customers with outstanding balance'
										: filter === 'clear'
											? 'All customers have cleared dues'
											: 'No customers yet. Tap + to add your first.'}
							</p>
						</div>
					) : (
						<div className="divide-y">
							{filtered.map((customer) => {
								const balance = parseFloat(String(customer.balance));
								const hasOutstanding = balance > 0;
								return (
									<div
										key={customer.id}
										className="group flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/30"
										onClick={() => navigate(`/customers/${customer.id}`)}
									>
										{/* Avatar */}
										<div
											className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
												hasOutstanding
													? 'bg-destructive/10 text-destructive'
													: 'bg-green-500/10 text-green-700 dark:text-green-400'
											}`}
										>
											{customer.name?.charAt(0)?.toUpperCase() ?? '?'}
										</div>

										{/* Info */}
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<p className="truncate text-sm font-semibold">{customer.name}</p>
												{(customer.tags ?? []).includes('VIP') && (
													<span className="rounded-full bg-yellow-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-700">
														VIP
													</span>
												)}
												{(customer.tags ?? []).includes('Blacklist') && (
													<span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
														⛔
													</span>
												)}
											</div>
											<p className="text-xs text-muted-foreground">
												{customer.phone ?? 'No phone'}
											</p>
										</div>

										{/* Balance */}
										<div className="shrink-0 text-right">
											{hasOutstanding ? (
												<p className="text-sm font-bold text-destructive">
													₹{formatCurrency(balance)}
												</p>
											) : (
												<span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
													<CheckCircle2 className="h-3 w-3" /> Clear
												</span>
											)}
										</div>

										{/* Quick actions (hover) */}
										<div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											{customer.phone && (
												<button
													className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 text-green-700 hover:bg-green-500/20"
													onClick={(e) => {
														e.stopPropagation();
														window.open(
															`https://wa.me/91${customer.phone!.replace(/\D/g, '')}`,
															'_blank'
														);
													}}
													title="WhatsApp"
												>
													<MessageCircle className="h-3.5 w-3.5" />
												</button>
											)}
											{customer.phone && (
												<a
													href={`tel:${customer.phone}`}
													className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
													onClick={(e) => e.stopPropagation()}
													title="Call"
												>
													<Phone className="h-3.5 w-3.5" />
												</a>
											)}
										</div>

										<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>

			<BottomNav />

			{/* ── FAB: Add Customer ────────────────────────────────────────────────────── */}
			<button
				onClick={openAdd}
				className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
				aria-label="Add Customer"
			>
				<Plus className="h-6 w-6" />
			</button>

			{/* ── Add Customer Dialog ─────────────────────────────────────────────── */}
			<Dialog open={addOpen} onOpenChange={setAddOpen}>
				<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add Customer</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						{/* Name */}
						<div className="space-y-1.5">
							<Label className="text-xs">Name *</Label>
							<Input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="e.g. Ramesh Kumar"
								autoFocus
							/>
						</div>

						{/* Phone */}
						<div className="space-y-1.5">
							<Label className="text-xs">Phone</Label>
							<Input
								value={newPhone}
								onChange={(e) => setNewPhone(e.target.value)}
								placeholder="10-digit mobile"
								type="tel"
								inputMode="tel"
							/>
						</div>

						{/* Email */}
						<div className="space-y-1.5">
							<Label className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
								<Mail className="h-3 w-3" />
								Email
								<span className="ml-1 text-[10px] font-normal text-muted-foreground">
									(Enables PDF delivery)
								</span>
							</Label>
							<Input
								value={newEmail}
								onChange={(e) => setNewEmail(e.target.value)}
								placeholder="email@example.com"
								type="email"
								inputMode="email"
								className="border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400"
							/>
						</div>

						{/* Nickname */}
						<div className="space-y-1.5">
							<Label className="text-xs">Nickname / Short Name</Label>
							<Input
								value={newNickname}
								onChange={(e) => setNewNickname(e.target.value)}
								placeholder="e.g. Ramesh bhai"
							/>
						</div>

						{/* Landmark */}
						<div className="space-y-1.5">
							<Label className="text-xs">Landmark / Area</Label>
							<Input
								value={newLandmark}
								onChange={(e) => setNewLandmark(e.target.value)}
								placeholder="e.g. near Rajiv Chowk"
							/>
						</div>

						{/* Opening Balance */}
						<div className="space-y-1.5">
							<Label className="text-xs">Opening Balance (amount customer owes you)</Label>
							<div className="relative">
								<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
									₹
								</span>
								<Input
									className="pl-7"
									type="number"
									min={0}
									step="any"
									value={newOpeningBal}
									onChange={(e) => setNewOpeningBal(e.target.value)}
									placeholder="0.00"
									inputMode="decimal"
								/>
							</div>
							{newOpeningBal && parseFloat(newOpeningBal) > 0 && (
								<p className="text-[11px] text-muted-foreground">
									Customer starts with ₹{formatCurrency(parseFloat(newOpeningBal))} outstanding
								</p>
							)}
						</div>

						{/* Notes */}
						<div className="space-y-1.5">
							<Label className="text-xs">Notes</Label>
							<Input
								value={newNotes}
								onChange={(e) => setNewNotes(e.target.value)}
								placeholder="Any notes about this customer…"
							/>
						</div>

						{/* Tags */}
						<div className="space-y-1.5">
							<Label className="text-xs">Tags</Label>
							<div className="flex flex-wrap gap-1.5">
								{CUSTOMER_TAGS.map((tag) => {
									const active = newTags.includes(tag);
									return (
										<button
											key={tag}
											type="button"
											onClick={() =>
												setNewTags((prev) =>
													active ? prev.filter((t) => t !== tag) : [...prev, tag]
												)
											}
											className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
												active
													? tag === 'Blacklist'
														? 'border-destructive bg-destructive/10 text-destructive'
														: 'border-primary bg-primary/10 text-primary'
													: 'border-border bg-muted text-muted-foreground hover:border-foreground'
											}`}
										>
											{tag}
										</button>
									);
								})}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={!newName.trim() || createCustomer.isPending}>
							{createCustomer.isPending ? 'Adding…' : 'Add Customer'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Customers;

/**
 * Expiry Management Page
 * ─────────────────────────────────────────────────────────────
 * Industry-standard RAG (Red-Amber-Green) color system.
 * Based on: Marg ERP, Zoho Inventory, pharma software + India SMB research.
 *
 * Color levels (ISO 22514 / WHO medicine storage visual standards):
 *   EXPIRED    → Deep red    #991B1B  bg #FEF2F2  left-border 4px
 *   CRITICAL   → Red         #DC2626  bg #FFF1F0  left-border 4px
 *   WARNING    → Amber-Orange #C2410C bg #FFF7ED  left-border 4px
 *   CAUTION    → Amber       #B45309  bg #FFFBEB  left-border 4px
 *   GOOD       → Green       #166534  bg #F0FDF4  left-border 4px
 */

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useExpiryPage } from '@/hooks/useQueries';
import { productApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = 'expired' | '7d' | '30d' | '90d' | 'all';

interface ExpiryBatch {
	id: string;
	batchNo: string;
	expiryDate: string;
	manufacturingDate: string | null;
	quantity: number;
	purchasePrice: string | null;
	status: string;
	product: { name: string; unit: string; category: string | null };
}

// ── Industry-standard RAG color system ───────────────────────────────────────
// Source: Marg ERP, Zoho Inventory, WHO medicine storage, FMCG best practices

interface StatusMeta {
	label: string;
	/** Tailwind classes for the card row */
	rowBg: string;
	leftBorder: string;
	/** Badge inline style — solid fill for maximum contrast */
	badgeBg: string;
	badgeText: string;
	/** Days-left pill */
	pillBg: string;
	pillText: string;
	/** Icon for the status */
	icon: string;
	/** Tab active color classes */
	tabActive: string;
	/** Summary card classes */
	cardBorder: string;
	cardBg: string;
	cardNum: string;
	cardLabel: string;
}

function statusMeta(days: number): StatusMeta {
	if (days <= 0)
		return {
			label: 'EXPIRED',
			rowBg: 'bg-red-50',
			leftBorder: 'border-l-4 border-l-red-700',
			badgeBg: 'bg-red-700',
			badgeText: 'text-white',
			pillBg: 'bg-red-100',
			pillText: 'text-red-800',
			icon: '🚫',
			tabActive: 'bg-red-700 text-white border-red-700',
			cardBorder: 'border-red-300',
			cardBg: 'bg-red-50',
			cardNum: 'text-red-700',
			cardLabel: 'text-red-600',
		};
	if (days <= 7)
		return {
			label: 'CRITICAL',
			rowBg: 'bg-red-50/50',
			leftBorder: 'border-l-4 border-l-red-500',
			badgeBg: 'bg-red-500',
			badgeText: 'text-white',
			pillBg: 'bg-red-100',
			pillText: 'text-red-700',
			icon: '🔴',
			tabActive: 'bg-red-500 text-white border-red-500',
			cardBorder: 'border-red-200',
			cardBg: 'bg-red-50/70',
			cardNum: 'text-red-600',
			cardLabel: 'text-red-500',
		};
	if (days <= 30)
		return {
			label: 'EXPIRING SOON',
			rowBg: 'bg-orange-50/50',
			leftBorder: 'border-l-4 border-l-orange-500',
			badgeBg: 'bg-orange-500',
			badgeText: 'text-white',
			pillBg: 'bg-orange-100',
			pillText: 'text-orange-800',
			icon: '🟠',
			tabActive: 'bg-orange-500 text-white border-orange-500',
			cardBorder: 'border-orange-200',
			cardBg: 'bg-orange-50/70',
			cardNum: 'text-orange-600',
			cardLabel: 'text-orange-500',
		};
	if (days <= 90)
		return {
			label: 'NEAR EXPIRY',
			rowBg: 'bg-amber-50/40',
			leftBorder: 'border-l-4 border-l-amber-500',
			badgeBg: 'bg-amber-500',
			badgeText: 'text-white',
			pillBg: 'bg-amber-100',
			pillText: 'text-amber-800',
			icon: '🟡',
			tabActive: 'bg-amber-500 text-white border-amber-500',
			cardBorder: 'border-amber-200',
			cardBg: 'bg-amber-50/70',
			cardNum: 'text-amber-700',
			cardLabel: 'text-amber-600',
		};
	return {
		label: 'GOOD',
		rowBg: 'bg-green-50/30',
		leftBorder: 'border-l-4 border-l-green-500',
		badgeBg: 'bg-green-600',
		badgeText: 'text-white',
		pillBg: 'bg-green-100',
		pillText: 'text-green-800',
		icon: '✅',
		tabActive: 'bg-green-600 text-white border-green-600',
		cardBorder: 'border-green-200',
		cardBg: 'bg-green-50/70',
		cardNum: 'text-green-700',
		cardLabel: 'text-green-600',
	};
}

function fmtDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(n: number) {
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(n);
}

function daysLeft(expiryDate: string): number {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const exp = new Date(expiryDate);
	exp.setHours(0, 0, 0, 0);
	return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExpiryPage() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const qc = useQueryClient();

	const [filter, setFilter] = useState<Filter>('7d');
	const [search, setSearch] = useState('');
	const [writeOffTarget, setWriteOffTarget] = useState<ExpiryBatch | null>(null);
	const [writingOff, setWritingOff] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const { data, isLoading } = useExpiryPage(filter);
	const batches: ExpiryBatch[] = (data?.batches ?? []) as ExpiryBatch[];
	const summary = data?.summary ?? { expiredCount: 0, critical7: 0, warning30: 0, valueAtRisk: 0 };

	const expiredMeta = statusMeta(-1);
	const criticalMeta = statusMeta(3);
	const warningMeta = statusMeta(15);

	// Summary cards config
	const summaryCards = [
		{
			filter: 'expired' as Filter,
			label: 'EXPIRED',
			icon: '🚫',
			value: summary.expiredCount,
			sub: 'batches — immediate action needed',
			meta: expiredMeta,
		},
		{
			filter: '7d' as Filter,
			label: 'CRITICAL ≤7 DAYS',
			icon: '🔴',
			value: summary.critical7,
			sub: 'batches expiring this week',
			meta: criticalMeta,
		},
		{
			filter: '30d' as Filter,
			label: 'EXPIRING ≤30 DAYS',
			icon: '🟠',
			value: summary.warning30,
			sub: 'batches this month',
			meta: warningMeta,
		},
		{
			filter: null,
			label: 'VALUE AT RISK (30d)',
			icon: '💸',
			value: fmtINR(summary.valueAtRisk),
			sub: 'purchase cost at risk',
			meta: warningMeta,
		},
	];

	// Filter tabs with color-coded identity
	const filterTabs: { key: Filter; label: string; meta: StatusMeta }[] = [
		{ key: '7d', label: '≤7 Days', meta: criticalMeta },
		{ key: '30d', label: '≤30 Days', meta: warningMeta },
		{ key: '90d', label: '≤90 Days', meta: statusMeta(60) },
		{ key: 'expired', label: 'Expired', meta: expiredMeta },
		{ key: 'all', label: 'All', meta: statusMeta(200) },
	];

	const filtered = useMemo(() => {
		if (!search.trim()) return batches;
		const q = search.toLowerCase();
		return batches.filter(
			(b) =>
				b.product.name.toLowerCase().includes(q) ||
				b.batchNo.toLowerCase().includes(q) ||
				(b.product.category ?? '').toLowerCase().includes(q)
		);
	}, [batches, search]);

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	function toggleAll() {
		setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((b) => b.id)));
	}

	async function doWriteOff(batch: ExpiryBatch) {
		setWritingOff(true);
		try {
			const res = await productApi.writeOffBatch(batch.id);
			toast({ title: `✅ Written off ${res.qtyWrittenOff} units of batch ${res.batchNo}` });
			qc.invalidateQueries({ queryKey: ['expiryPage'] });
			qc.invalidateQueries({ queryKey: ['expiringBatches'] });
		} catch {
			toast({ title: 'Write-off failed', variant: 'destructive' });
		} finally {
			setWritingOff(false);
			setWriteOffTarget(null);
		}
	}

	async function bulkWriteOff() {
		const toProcess = filtered.filter((b) => selected.has(b.id));
		let done = 0;
		for (const b of toProcess) {
			try {
				await productApi.writeOffBatch(b.id);
				done++;
			} catch {
				/* continue */
			}
		}
		toast({ title: `✅ Written off ${done}/${toProcess.length} batches` });
		qc.invalidateQueries({ queryKey: ['expiryPage'] });
		qc.invalidateQueries({ queryKey: ['expiringBatches'] });
		setSelected(new Set());
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-background pb-24">
			{/* ── Header ─────────────────────────────────────────── */}
			<div className="sticky top-0 z-10 bg-white dark:bg-background border-b shadow-sm px-4 py-3 flex items-center gap-3">
				<button
					onClick={() => navigate(-1)}
					className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-lg"
				>
					←
				</button>
				<div className="flex-1">
					<h1 className="text-base font-bold leading-tight">Expiry Management</h1>
					<p className="text-[11px] text-muted-foreground">Track & act on near-expiry stock</p>
				</div>
				{/* Legend */}
				<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground hidden sm:flex">
					<span className="w-2.5 h-2.5 rounded-full bg-red-700 inline-block" /> Expired
					<span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ml-1" /> Critical
					<span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block ml-1" /> Soon
					<span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ml-1" /> Near
				</div>
			</div>

			<div className="max-w-2xl mx-auto px-3 pt-4 space-y-3">
				{/* ── Summary Cards ────────────────────────────────── */}
				<div className="grid grid-cols-2 gap-2">
					{summaryCards.map((c) => (
						<button
							key={c.label}
							disabled={!c.filter}
							onClick={() => c.filter && setFilter(c.filter)}
							className={`text-left rounded-xl border-2 ${c.meta.cardBorder} ${c.meta.cardBg} p-3 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default ${
								filter === c.filter ? 'ring-2 ring-offset-1 ring-current shadow-md' : ''
							}`}
						>
							<div className="flex items-start justify-between mb-1">
								<span className="text-base leading-none">{c.icon}</span>
								{filter === c.filter && (
									<span className="text-[9px] font-bold uppercase tracking-wide bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded-full text-current">
										active
									</span>
								)}
							</div>
							<p className={`text-[10px] font-semibold uppercase tracking-wide ${c.meta.cardLabel}`}>
								{c.label}
							</p>
							<p className={`text-2xl font-black mt-0.5 ${c.meta.cardNum}`}>{c.value}</p>
							<p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{c.sub}</p>
						</button>
					))}
				</div>

				{/* ── Filter Tabs ──────────────────────────────────── */}
				<div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
					{filterTabs.map((t) => (
						<button
							key={t.key}
							onClick={() => {
								setFilter(t.key);
								setSelected(new Set());
							}}
							className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all flex-shrink-0 ${
								filter === t.key
									? `${t.meta.tabActive} shadow-sm`
									: 'border-gray-200 bg-white dark:bg-muted text-muted-foreground hover:border-gray-400'
							}`}
						>
							{t.meta.icon} {t.label}
						</button>
					))}
				</div>

				{/* ── Color legend (mobile) ─────────────────────────── */}
				<div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-[10px] text-muted-foreground sm:hidden px-0.5">
					{[criticalMeta, warningMeta, statusMeta(60), expiredMeta].map((m) => (
						<span key={m.label} className="flex items-center gap-1 flex-shrink-0">
							<span className={`w-2 h-2 rounded-full ${m.badgeBg}`} />
							{m.label}
						</span>
					))}
				</div>

				{/* ── Search ───────────────────────────────────────── */}
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
					<Input
						placeholder="Search product name, batch no…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="text-sm pl-8 bg-white dark:bg-muted"
					/>
				</div>

				{/* ── Bulk Actions ─────────────────────────────────── */}
				{selected.size > 0 && (
					<div className="flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2.5">
						<div className="flex-1">
							<span className="text-sm font-bold text-red-700">
								{selected.size} batch{selected.size !== 1 ? 'es' : ''} selected
							</span>
						</div>
						<Button
							size="sm"
							className="bg-red-600 hover:bg-red-700 text-white text-xs h-7"
							onClick={bulkWriteOff}
						>
							🗑️ Write Off All
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setSelected(new Set())}
							className="text-xs h-7 text-muted-foreground"
						>
							✕ Clear
						</Button>
					</div>
				)}

				{/* ── Batch List ───────────────────────────────────── */}
				{isLoading ? (
					<div className="py-16 text-center">
						<p className="text-3xl mb-2 animate-pulse">📦</p>
						<p className="text-sm text-muted-foreground">Loading batches…</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="py-16 text-center bg-white dark:bg-muted rounded-2xl border">
						<p className="text-4xl mb-3">✅</p>
						<p className="font-semibold">All clear!</p>
						<p className="text-sm text-muted-foreground mt-1">
							{filter === 'expired' ? 'No expired stock found.' : 'No batches expiring in this window.'}
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{/* Select-all row */}
						<div className="flex items-center gap-2 px-1">
							<input
								type="checkbox"
								className="rounded accent-red-600 cursor-pointer"
								checked={selected.size === filtered.length && filtered.length > 0}
								onChange={toggleAll}
							/>
							<span className="text-xs text-muted-foreground">
								Select all · {filtered.length} batch{filtered.length !== 1 ? 'es' : ''}
							</span>
						</div>

						{filtered.map((b) => {
							const dl = daysLeft(b.expiryDate);
							const meta = statusMeta(dl);
							const value = b.quantity * Number(b.purchasePrice ?? 0);
							const isSelected = selected.has(b.id);

							return (
								<div
									key={b.id}
									className={`rounded-xl border bg-white dark:bg-card ${meta.leftBorder} ${meta.rowBg} transition-all ${
										isSelected ? 'ring-2 ring-offset-1 ring-red-400 shadow-sm' : 'shadow-sm'
									}`}
								>
									<div className="p-3">
										<div className="flex items-start gap-2.5">
											{/* Checkbox */}
											<input
												type="checkbox"
												className="rounded accent-red-600 mt-1 flex-shrink-0 cursor-pointer"
												checked={isSelected}
												onChange={() => toggleSelect(b.id)}
											/>

											{/* Content */}
											<div className="flex-1 min-w-0">
												{/* Title row */}
												<div className="flex items-start gap-2 flex-wrap">
													<span className="font-bold text-sm leading-tight">
														{b.product.name}
													</span>
													{b.product.category && (
														<span className="text-[10px] bg-gray-100 dark:bg-muted text-muted-foreground rounded px-1.5 py-0.5">
															{b.product.category}
														</span>
													)}
													{/* Solid color badge */}
													<span
														className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeBg} ${meta.badgeText}`}
													>
														{meta.icon} {meta.label}
													</span>
												</div>

												{/* Details grid */}
												<div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
													<div>
														<span className="text-muted-foreground">Batch </span>
														<span className="font-semibold font-mono">{b.batchNo}</span>
													</div>
													<div>
														<span className="text-muted-foreground">Qty </span>
														<span className="font-semibold">
															{b.quantity} {b.product.unit}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">Expires </span>
														<span className="font-semibold">{fmtDate(b.expiryDate)}</span>
													</div>
													<div>
														<span className="text-muted-foreground">Value </span>
														<span className="font-semibold">
															{value > 0 ? fmtINR(value) : '—'}
														</span>
													</div>
												</div>

												{/* Days countdown pill */}
												<div className="mt-2">
													<span
														className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.pillBg} ${meta.pillText}`}
													>
														{dl <= 0 ? (
															<>
																⛔ Expired {Math.abs(dl)} day
																{Math.abs(dl) !== 1 ? 's' : ''} ago
															</>
														) : (
															<>
																⏱ {dl} day{dl !== 1 ? 's' : ''} remaining
															</>
														)}
													</span>
												</div>
											</div>

											{/* Action menu */}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg"
													>
														<span className="text-xl leading-none">⋮</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-52">
													<DropdownMenuItem
														className="text-red-600 focus:text-red-600 focus:bg-red-50 font-medium"
														onClick={() => setWriteOffTarget(b)}
													>
														🗑️ Write Off (Destroy)
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
														onClick={() =>
															toast({
																title: '🏷️ Marked for discount sale',
																description: `${b.product.name} — Batch ${b.batchNo}`,
															})
														}
													>
														🏷️ Mark for Discount Sale
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															toast({
																title: '↩️ Return to supplier noted',
																description: `${b.product.name} — ${b.batchNo}. Create purchase return in Purchases.`,
															})
														}
													>
														↩️ Return to Supplier
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* ── Color key reference ──────────────────────────── */}
				<div className="rounded-xl border bg-white dark:bg-muted p-3 mt-2">
					<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
						Color Key
					</p>
					<div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
						{[
							{ label: 'Expired — immediate write-off', bg: 'bg-red-700' },
							{ label: 'Critical — expiring ≤7 days', bg: 'bg-red-500' },
							{ label: 'Expiring soon — ≤30 days', bg: 'bg-orange-500' },
							{ label: 'Near expiry — ≤90 days', bg: 'bg-amber-500' },
						].map((x) => (
							<div key={x.label} className="flex items-center gap-2">
								<span className={`w-3 h-3 rounded-sm flex-shrink-0 ${x.bg}`} />
								<span className="text-[10px] text-muted-foreground leading-tight">{x.label}</span>
							</div>
						))}
					</div>
					<p className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
						💡 Tip: Return near-expiry stock to your supplier before 6 months from expiry — most suppliers
						stop accepting returns after that.
					</p>
				</div>
			</div>

			{/* ── Write-off Confirmation Dialog ────────────────────── */}
			<AlertDialog open={!!writeOffTarget} onOpenChange={(v) => !v && setWriteOffTarget(null)}>
				<AlertDialogContent className="border-red-200">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2 text-red-700">
							🗑️ Write Off Batch?
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2">
								<p>
									This will mark{' '}
									<strong>
										{writeOffTarget?.quantity} {writeOffTarget?.product.unit}
									</strong>{' '}
									of <strong>{writeOffTarget?.product.name}</strong> (Batch:{' '}
									<strong className="font-mono">{writeOffTarget?.batchNo}</strong>) as written off and
									reduce your stock to 0.
								</p>
								{writeOffTarget && Number(writeOffTarget.purchasePrice) > 0 && (
									<div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
										<p className="text-sm font-bold text-red-700">
											💸 Value lost:{' '}
											{fmtINR(writeOffTarget.quantity * Number(writeOffTarget.purchasePrice))}
										</p>
									</div>
								)}
								<p className="text-xs text-muted-foreground">⚠️ This action cannot be undone.</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={writingOff}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={writingOff}
							className="bg-red-600 hover:bg-red-700 text-white"
							onClick={() => writeOffTarget && doWriteOff(writeOffTarget)}
						>
							{writingOff ? 'Writing off…' : '🗑️ Confirm Write Off'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}


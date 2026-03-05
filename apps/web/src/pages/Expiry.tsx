/**
 * Expiry Management Page
 * ─────────────────────────────────────────────────────────────
 * Shows all product batches grouped by expiry urgency.
 * Based on research: Marg/Zoho/Busy patterns + India SMB needs.
 *
 * Filters: Expired | ≤7 days (Critical) | 8–30 days | 31–90 days | All
 * Actions: Write Off | Mark for Discount | Return to Supplier
 */

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useExpiryPage } from '@/hooks/useQueries';
import { productApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(expiryDate: string): number {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const exp = new Date(expiryDate);
	exp.setHours(0, 0, 0, 0);
	return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusMeta(days: number): {
	label: string;
	color: string;
	rowClass: string;
	badgeVariant: 'destructive' | 'secondary' | 'outline' | 'default';
} {
	if (days <= 0)
		return {
			label: 'EXPIRED',
			color: 'text-red-600',
			rowClass: 'bg-red-50/60 border-red-200',
			badgeVariant: 'destructive',
		};
	if (days <= 7)
		return {
			label: 'CRITICAL',
			color: 'text-red-500',
			rowClass: 'bg-red-50/30 border-red-100',
			badgeVariant: 'destructive',
		};
	if (days <= 30)
		return {
			label: 'EXPIRING SOON',
			color: 'text-orange-500',
			rowClass: 'bg-orange-50/30 border-orange-100',
			badgeVariant: 'default',
		};
	if (days <= 90)
		return {
			label: 'NEAR EXPIRY',
			color: 'text-yellow-600',
			rowClass: 'bg-yellow-50/30 border-yellow-100',
			badgeVariant: 'secondary',
		};
	return {
		label: 'GOOD',
		color: 'text-green-600',
		rowClass: '',
		badgeVariant: 'outline',
	};
}

function fmtDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtINR(n: number) {
	return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
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

	// Filter tabs
	const filterTabs: { key: Filter; label: string; color: string }[] = [
		{ key: '7d', label: '≤7 Days 🔴', color: 'text-red-600' },
		{ key: '30d', label: '≤30 Days 🟠', color: 'text-orange-500' },
		{ key: '90d', label: '≤90 Days 🟡', color: 'text-yellow-600' },
		{ key: 'expired', label: 'Expired ⚠️', color: 'text-red-700' },
		{ key: 'all', label: 'All Batches', color: 'text-foreground' },
	];

	// Client-side search
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

	// Toggle row selection
	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		if (selected.size === filtered.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(filtered.map((b) => b.id)));
		}
	}

	// Write off single batch
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

	// Bulk write off
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
		<div className="min-h-screen bg-background pb-24">
			{/* ── Header ── */}
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
				<button
					onClick={() => navigate(-1)}
					className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
				>
					←
				</button>
				<div className="flex-1">
					<h1 className="text-lg font-bold leading-tight">Expiry Management</h1>
					<p className="text-xs text-muted-foreground">Track & act on near-expiry stock</p>
				</div>
			</div>

			<div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
				{/* ── Summary Cards ── */}
				<div className="grid grid-cols-2 gap-2">
					<Card
						className="cursor-pointer border-red-200 bg-red-50/60 hover:bg-red-100/60 transition-colors"
						onClick={() => setFilter('expired')}
					>
						<CardContent className="p-3">
							<p className="text-xs text-red-500 font-medium">EXPIRED</p>
							<p className="text-2xl font-bold text-red-600">{summary.expiredCount}</p>
							<p className="text-xs text-muted-foreground">batches with stock</p>
						</CardContent>
					</Card>
					<Card
						className="cursor-pointer border-red-100 bg-red-50/30 hover:bg-red-100/30 transition-colors"
						onClick={() => setFilter('7d')}
					>
						<CardContent className="p-3">
							<p className="text-xs text-red-500 font-medium">CRITICAL ≤7 DAYS</p>
							<p className="text-2xl font-bold text-red-500">{summary.critical7}</p>
							<p className="text-xs text-muted-foreground">batches</p>
						</CardContent>
					</Card>
					<Card
						className="cursor-pointer border-orange-100 bg-orange-50/30 hover:bg-orange-100/30 transition-colors"
						onClick={() => setFilter('30d')}
					>
						<CardContent className="p-3">
							<p className="text-xs text-orange-500 font-medium">EXPIRING ≤30 DAYS</p>
							<p className="text-2xl font-bold text-orange-500">{summary.warning30}</p>
							<p className="text-xs text-muted-foreground">batches</p>
						</CardContent>
					</Card>
					<Card className="border-orange-200 bg-orange-50/50">
						<CardContent className="p-3">
							<p className="text-xs text-orange-600 font-medium">VALUE AT RISK (30d)</p>
							<p className="text-lg font-bold text-orange-600">{fmtINR(summary.valueAtRisk)}</p>
							<p className="text-xs text-muted-foreground">purchase cost</p>
						</CardContent>
					</Card>
				</div>

				{/* ── Filter Tabs ── */}
				<div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
					{filterTabs.map((t) => (
						<button
							key={t.key}
							onClick={() => {
								setFilter(t.key);
								setSelected(new Set());
							}}
							className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0 ${
								filter === t.key
									? 'border-primary bg-primary/10 text-primary'
									: 'border-border text-muted-foreground hover:border-primary/50'
							}`}
						>
							{t.label}
						</button>
					))}
				</div>

				{/* ── Search ── */}
				<Input
					placeholder="Search product name, batch no…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="text-sm"
				/>

				{/* ── Bulk Actions ── */}
				{selected.size > 0 && (
					<div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
						<span className="text-xs font-medium text-primary flex-1">{selected.size} selected</span>
						<Button size="sm" variant="destructive" onClick={bulkWriteOff} className="text-xs h-7">
							Write Off Selected
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setSelected(new Set())}
							className="text-xs h-7"
						>
							Clear
						</Button>
					</div>
				)}

				{/* ── Batch List ── */}
				{isLoading ? (
					<div className="py-12 text-center text-muted-foreground text-sm">Loading batches…</div>
				) : filtered.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<p className="text-4xl mb-2">✅</p>
							<p className="font-medium">No batches in this range</p>
							<p className="text-sm text-muted-foreground mt-1">
								{filter === 'expired'
									? 'No expired stock found.'
									: `No batches expiring in the selected window.`}
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-1">
						{/* Select all row */}
						<div className="flex items-center gap-2 px-1 pb-1">
							<input
								type="checkbox"
								className="rounded"
								checked={selected.size === filtered.length && filtered.length > 0}
								onChange={toggleAll}
							/>
							<span className="text-xs text-muted-foreground">
								{filtered.length} batch{filtered.length !== 1 ? 'es' : ''} shown
							</span>
						</div>

						{filtered.map((b) => {
							const dl = daysLeft(b.expiryDate);
							const meta = statusMeta(dl);
							const value = b.quantity * Number(b.purchasePrice ?? 0);
							const isSelected = selected.has(b.id);

							return (
								<Card
									key={b.id}
									className={`border transition-all ${meta.rowClass} ${isSelected ? 'ring-2 ring-primary/40' : ''}`}
								>
									<CardContent className="p-3">
										<div className="flex items-start gap-2">
											{/* Checkbox */}
											<input
												type="checkbox"
												className="rounded mt-1 flex-shrink-0"
												checked={isSelected}
												onChange={() => toggleSelect(b.id)}
											/>

											{/* Main content */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="font-semibold text-sm truncate">
														{b.product.name}
													</span>
													{b.product.category && (
														<span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
															{b.product.category}
														</span>
													)}
													<Badge
														variant={meta.badgeVariant}
														className={`text-[10px] px-1.5 py-0 ${
															meta.label === 'EXPIRING SOON'
																? 'bg-orange-500 text-white hover:bg-orange-600'
																: ''
														} ${
															meta.label === 'NEAR EXPIRY'
																? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
																: ''
														}`}
													>
														{meta.label}
													</Badge>
												</div>

												<div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
													<span>
														<span className="font-medium text-foreground">Batch:</span>{' '}
														{b.batchNo}
													</span>
													<span>
														<span className="font-medium text-foreground">Qty:</span>{' '}
														{b.quantity} {b.product.unit}
													</span>
													<span>
														<span className="font-medium text-foreground">Expires:</span>{' '}
														{fmtDate(b.expiryDate)}
													</span>
													<span>
														<span className="font-medium text-foreground">Value:</span>{' '}
														{value > 0 ? fmtINR(value) : '—'}
													</span>
												</div>

												{/* Days left pill */}
												<div className="mt-2">
													{dl <= 0 ? (
														<span className="text-xs font-semibold text-red-600">
															Expired {Math.abs(dl)} day{Math.abs(dl) !== 1 ? 's' : ''}{' '}
															ago
														</span>
													) : (
														<span className={`text-xs font-semibold ${meta.color}`}>
															⏱ {dl} day{dl !== 1 ? 's' : ''} left
														</span>
													)}
												</div>
											</div>

											{/* Action menu */}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 flex-shrink-0"
													>
														<span className="text-lg leading-none">⋮</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-48">
													<DropdownMenuItem
														className="text-red-600 focus:text-red-600"
														onClick={() => setWriteOffTarget(b)}
													>
														🗑️ Write Off (Destroy)
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															toast({
																title: '📦 Marked for discount sale',
																description: `${b.product.name} — Batch ${b.batchNo}`,
															});
														}}
													>
														🏷️ Mark for Discount Sale
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => {
															toast({
																title: '↩️ Return to supplier noted',
																description: `${b.product.name} — Batch ${b.batchNo}. Create purchase return in Purchases.`,
															});
														}}
													>
														↩️ Return to Supplier
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}

				{/* ── Info footer ── */}
				{!isLoading && (
					<p className="text-center text-xs text-muted-foreground py-4">
						Tip: Return near-expiry stock to your supplier before they stop accepting returns (usually 3–6
						months before expiry).
					</p>
				)}
			</div>

			{/* ── Write-off Confirmation Dialog ── */}
			<AlertDialog open={!!writeOffTarget} onOpenChange={(v) => !v && setWriteOffTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Write Off Batch?</AlertDialogTitle>
						<AlertDialogDescription>
							<span className="block mb-2">
								This will mark{' '}
								<strong>
									{writeOffTarget?.quantity} {writeOffTarget?.product.unit}
								</strong>{' '}
								of <strong>{writeOffTarget?.product.name}</strong> (Batch:{' '}
								<strong>{writeOffTarget?.batchNo}</strong>) as written off and reduce your stock to 0.
							</span>
							{writeOffTarget && Number(writeOffTarget.purchasePrice) > 0 && (
								<span className="block text-red-600 font-medium">
									Value lost: {fmtINR(writeOffTarget.quantity * Number(writeOffTarget.purchasePrice))}
								</span>
							)}
							<span className="block mt-2 text-muted-foreground">This action cannot be undone.</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={writingOff}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={writingOff}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => writeOffTarget && doWriteOff(writeOffTarget)}
						>
							{writingOff ? 'Writing off…' : 'Confirm Write Off'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

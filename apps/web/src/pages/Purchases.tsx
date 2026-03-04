/**
 * Purchases — Track stock/supplier purchases.
 * Sprint 2: added OCR bill scanning via OpenAI Vision API.
 * Data persisted via REST API → PostgreSQL.
 * Separate from Expenses: focused on inventory procurement with unit/qty/rate.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Package, TrendingDown, Scan, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePurchases, useCreatePurchase, useDeletePurchase } from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { aiApi, draftApi, type OcrJob, type Draft } from '@/lib/api';
import { DraftConfirmDialog } from '@/components/DraftConfirmDialog';

// ── Config ────────────────────────────────────────────────────────────────────
const PURCHASE_CATEGORIES = [
	'Stock Purchase',
	'Raw Material',
	'Packaging',
	'Equipment',
	'Office Supplies',
	'Miscellaneous',
] as const;

type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

const UNITS = ['Piece', 'Kg', 'Gram', 'Litre', 'ML', 'Dozen', 'Box', 'Metre', 'Foot'] as const;
type Unit = (typeof UNITS)[number];

const catIcon: Record<string, string> = {
	'Stock Purchase': '📦',
	'Raw Material': '🌾',
	Packaging: '📫',
	Equipment: '🔧',
	'Office Supplies': '🗂️',
	Miscellaneous: '🛒',
};

const TABS = ['All', 'This Week', 'This Month'] as const;
type Tab = (typeof TABS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
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
export default function Purchases() {
	const navigate = useNavigate();
	const { toast } = useToast();

	const [filterTab, setFilterTab] = useState<Tab>('This Month');
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);

	// Form state
	const [supplier, setSupplier] = useState('');
	const [itemName, setItemName] = useState('');
	const [qty, setQty] = useState('1');
	const [unit, setUnit] = useState<Unit>('Piece');
	const [rate, setRate] = useState('');
	const [category, setCategory] = useState<PurchaseCategory>('Stock Purchase');
	const [date, setDate] = useState(today());
	const [notes, setNotes] = useState('');

	// API hooks
	const { data: purData } = usePurchases(tabDateRange(filterTab));
	const { data: monthData } = usePurchases(tabDateRange('This Month'));
	const createPurchase = useCreatePurchase();
	const deletePurchase = useDeletePurchase();
	useWsInvalidation(['purchases']);

	// ── Draft state ─────────────────────────────────────────────────────────
	const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

	// ── OCR state ────────────────────────────────────────────────────────────
	const fileInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const [ocrJobId, setOcrJobId] = useState<string | null>(null);
	const [ocrJob, setOcrJob] = useState<OcrJob | null>(null);
	const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
	const [ocrUploading, setOcrUploading] = useState(false);

	// Poll for OCR job status every 2s until completed/failed
	const pollOcrJob = useCallback(
		async (jobId: string) => {
			const timer = setInterval(async () => {
				try {
					const job = await aiApi.getOcrJob(jobId);
					setOcrJob(job);
					if (job.status === 'completed' || job.status === 'failed') {
						clearInterval(timer);
						if (job.status === 'completed') {
							// Invalidate purchases list so new PO items appear
							await queryClient.invalidateQueries({ queryKey: ['purchases'] });
							toast({
								title: '✅ Bill scanned',
								description: `${Array.isArray(job.parsedItems) ? job.parsedItems.length : 0} items imported from bill.`,
							});
						} else {
							toast({
								title: 'OCR failed',
								description: job.errorMessage ?? 'Could not read the bill',
								variant: 'destructive',
							});
						}
					}
				} catch {
					// Silently ignore poll errors — will retry next interval
				}
			}, 2000);
			return () => clearInterval(timer);
		},
		[queryClient, toast]
	);

	async function handleOcrFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		// Reset input so same file can be re-selected
		e.target.value = '';

		setOcrUploading(true);
		setOcrJob(null);
		setOcrJobId(null);
		setOcrDialogOpen(true);
		try {
			const { jobId } = await aiApi.uploadPurchaseBill(file);
			setOcrJobId(jobId);
			setOcrJob({ jobId, jobType: 'purchase_bill', status: 'pending', productsCreated: 0 });
			pollOcrJob(jobId);
		} catch (err: any) {
			toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
			setOcrDialogOpen(false);
		} finally {
			setOcrUploading(false);
		}
	}

	const purchases = purData?.purchases ?? [];
	const monthPurchases = monthData?.purchases ?? [];

	const computedTotal = useMemo(() => {
		const q = parseFloat(qty) || 0;
		const r = parseFloat(rate) || 0;
		return q * r;
	}, [qty, rate]);

	function resetForm() {
		setSupplier('');
		setItemName('');
		setQty('1');
		setUnit('Piece');
		setRate('');
		setCategory('Stock Purchase');
		setDate(today());
		setNotes('');
	}

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		const q = parseFloat(qty);
		const r = parseFloat(rate);
		if (!q || q <= 0 || !r || r <= 0) {
			toast({ title: 'Enter valid quantity and rate', variant: 'destructive' });
			return;
		}
		if (!itemName.trim()) {
			toast({ title: 'Item name is required', variant: 'destructive' });
			return;
		}
		const total = Math.round(q * r * 100) / 100;
		try {
			// Save as draft — user reviews and confirms before real DB write
			const { draft } = await draftApi.create(
				'purchase_entry',
				{
					category,
					amount: total,
					itemName: itemName.trim(),
					vendor: supplier.trim() || undefined,
					quantity: q,
					unit,
					ratePerUnit: r,
					note: notes.trim() || undefined,
					date,
				},
				`${itemName.trim()} — ${fmt(total)}`
			);
			setPendingDraft(draft);
			queryClient.invalidateQueries({ queryKey: ['drafts'] });
			resetForm();
			setOpen(false);
		} catch {
			toast({ title: 'Failed to create draft', variant: 'destructive' });
		}
	}

	async function handleDelete(id: string) {
		try {
			await deletePurchase.mutateAsync(id);
			toast({ title: 'Purchase deleted' });
		} catch {
			toast({ title: 'Failed to delete', variant: 'destructive' });
		}
	}

	const visible = useMemo(() => {
		if (!search.trim()) return purchases;
		const q = search.toLowerCase();
		return purchases.filter(
			(p) =>
				(p.itemName ?? '').toLowerCase().includes(q) ||
				(p.vendor ?? '').toLowerCase().includes(q) ||
				p.category.toLowerCase().includes(q)
		);
	}, [purchases, search]);

	const monthTotal = monthPurchases.reduce((s, p) => s + Number(p.amount), 0);

	const topSupplier = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const p of monthPurchases) {
			if (p.vendor) totals[p.vendor] = (totals[p.vendor] ?? 0) + Number(p.amount);
		}
		const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
		return sorted[0]?.[0] ?? '—';
	}, [monthPurchases]);

	const visibleTotal = visible.reduce((s, p) => s + Number(p.amount), 0);

	return (
		<div className="min-h-screen bg-background pb-24">
			{/* Header */}
			<header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<h1 className="text-lg font-semibold">Purchases</h1>
					</div>
					<div className="flex gap-2">
						{/* OCR Scan Bill button */}
						<Button
							variant="outline"
							size="sm"
							className="gap-1"
							disabled={ocrUploading}
							onClick={() => fileInputRef.current?.click()}
							title="Scan a supplier bill photo with AI"
						>
							{ocrUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
							<span className="hidden sm:inline">Scan Bill</span>
						</Button>
						{/* Hidden file input for OCR */}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							className="hidden"
							onChange={handleOcrFileSelected}
						/>
						<Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
							<Plus className="h-4 w-4" /> Add
						</Button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-2xl space-y-4 p-4">
				{/* KPI strip */}
				<div className="grid grid-cols-3 gap-3">
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-xs text-muted-foreground">This Month</p>
							<p className="text-lg font-bold text-red-600">{fmt(monthTotal)}</p>
						</CardContent>
					</Card>
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-xs text-muted-foreground">Entries</p>
							<p className="text-lg font-bold">{monthPurchases.length}</p>
						</CardContent>
					</Card>
					<Card className="border-none shadow-sm">
						<CardContent className="p-3 text-center">
							<p className="text-xs text-muted-foreground">Top Supplier</p>
							<p className="text-sm font-semibold truncate">{topSupplier}</p>
						</CardContent>
					</Card>
				</div>

				{/* Search */}
				<Input
					placeholder="Search item, supplier, category…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="bg-card"
				/>

				{/* Tabs */}
				<div className="flex gap-1 rounded-lg bg-muted p-1">
					{TABS.map((t) => (
						<button
							key={t}
							onClick={() => setFilterTab(t)}
							className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
								filterTab === t
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							{t}
						</button>
					))}
				</div>

				{visible.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-16 text-center">
						<Package className="h-12 w-12 text-muted-foreground/40" />
						<p className="text-muted-foreground">No purchase entries</p>
						<Button size="sm" onClick={() => setOpen(true)}>
							<Plus className="mr-1 h-4 w-4" /> Add First Purchase
						</Button>
					</div>
				) : (
					<>
						<div className="flex items-center justify-between">
							<p className="text-xs text-muted-foreground">
								{visible.length} {visible.length === 1 ? 'entry' : 'entries'}
							</p>
							<p className="text-sm font-semibold text-red-600">{fmt(visibleTotal)}</p>
						</div>

						<div className="space-y-2">
							{visible.map((p) => {
								const qty = p.qty ? Number(p.qty) : null;
								const rate = p.ratePerUnit ? Number(p.ratePerUnit) : null;
								const total = Number(p.amount);
								return (
									<Card key={p.id} className="border-none shadow-sm">
										<CardContent className="p-3">
											<div className="flex items-start justify-between gap-2">
												<div className="flex items-start gap-2 min-w-0">
													<span className="text-xl mt-0.5 shrink-0">
														{catIcon[p.category] ?? '🛒'}
													</span>
													<div className="min-w-0">
														<p className="font-medium truncate">
															{p.itemName ?? p.category}
														</p>
														<p className="text-xs text-muted-foreground">
															{qty != null && rate != null
																? `${qty} ${p.unit ?? ''} × ${fmt(rate)}`
																: fmt(total)}
															{p.vendor && (
																<>
																	{' '}
																	· <span className="text-blue-600">{p.vendor}</span>
																</>
															)}
														</p>
														<div className="flex flex-wrap gap-1 mt-1">
															<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
																{p.category}
															</span>
															<span className="text-xs text-muted-foreground">
																{p.date?.slice(0, 10)}
															</span>
														</div>
														{p.note && (
															<p className="mt-1 text-xs text-muted-foreground italic">
																{p.note}
															</p>
														)}
													</div>
												</div>
												<div className="flex flex-col items-end gap-1 shrink-0">
													<span className="font-semibold text-red-600">{fmt(total)}</span>
													<button
														onClick={() => handleDelete(p.id)}
														className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
														aria-label="Delete"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</>
				)}

				{/* Summary footer */}
				{visible.length > 0 && (
					<Card className="border-dashed">
						<CardContent className="flex items-center justify-between p-3">
							<div className="flex items-center gap-2 text-muted-foreground">
								<TrendingDown className="h-4 w-4" />
								<span className="text-sm">Total spend ({filterTab.toLowerCase()})</span>
							</div>
							<span className="font-bold text-red-600">{fmt(visibleTotal)}</span>
						</CardContent>
					</Card>
				)}
			</main>

			{/* Add Purchase Dialog */}
			<Dialog
				open={open}
				onOpenChange={(v) => {
					setOpen(v);
					if (!v) resetForm();
				}}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Add Purchase Entry</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleAdd} className="space-y-3 py-1">
						<div className="space-y-1">
							<Label>Item Name *</Label>
							<Input
								placeholder="e.g. Basmati Rice 1kg"
								value={itemName}
								onChange={(e) => setItemName(e.target.value)}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label>Quantity *</Label>
								<Input
									type="number"
									min="0.001"
									step="any"
									placeholder="1"
									value={qty}
									onChange={(e) => setQty(e.target.value)}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label>Unit</Label>
								<Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{UNITS.map((u) => (
											<SelectItem key={u} value={u}>
												{u}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-1">
							<Label>Rate per {unit} (₹) *</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={rate}
								onChange={(e) => setRate(e.target.value)}
								required
							/>
							{computedTotal > 0 && (
								<p className="text-xs text-muted-foreground">
									Total: <span className="font-semibold text-foreground">{fmt(computedTotal)}</span>
								</p>
							)}
						</div>

						<div className="space-y-1">
							<Label>Supplier</Label>
							<Input
								placeholder="Supplier / vendor name"
								value={supplier}
								onChange={(e) => setSupplier(e.target.value)}
							/>
						</div>

						<div className="space-y-1">
							<Label>Category</Label>
							<Select value={category} onValueChange={(v) => setCategory(v as PurchaseCategory)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PURCHASE_CATEGORIES.map((c) => (
										<SelectItem key={c} value={c}>
											{catIcon[c]} {c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1">
							<Label>Date</Label>
							<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
						</div>

						<div className="space-y-1">
							<Label>Notes (optional)</Label>
							<Input
								placeholder="Invoice no., batch no., remarks…"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
							/>
						</div>

						<DialogFooter className="pt-1">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!itemName.trim() || !rate || !qty || createPurchase.isPending}
							>
								{createPurchase.isPending ? 'Saving…' : 'Add Purchase'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* ── OCR Progress Dialog ──────────────────────────────────────────── */}
			<Dialog
				open={ocrDialogOpen}
				onOpenChange={(v) => {
					setOcrDialogOpen(v);
					if (!v) {
						setOcrJobId(null);
						setOcrJob(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Scan className="h-5 w-5" />
							OCR Purchase Bill
						</DialogTitle>
					</DialogHeader>

					{/* Uploading / Pending / Processing */}
					{(!ocrJob || ocrJob.status === 'pending' || ocrJob.status === 'processing') && (
						<div className="flex flex-col items-center gap-3 py-8">
							<Loader2 className="h-10 w-10 animate-spin text-primary" />
							<p className="text-sm text-muted-foreground">
								{ocrUploading ? 'Uploading bill…' : 'Reading bill with AI…'}
							</p>
							<p className="text-xs text-muted-foreground/60">This usually takes 5–15 seconds</p>
						</div>
					)}

					{/* Completed */}
					{ocrJob?.status === 'completed' && (
						<div className="space-y-4 py-2">
							<div className="flex items-center gap-2 text-green-600">
								<CheckCircle className="h-6 w-6 flex-shrink-0" />
								<div>
									<p className="font-medium">Bill scanned successfully</p>
									<p className="text-sm text-muted-foreground">
										{Array.isArray(ocrJob.parsedItems) ? ocrJob.parsedItems.length : 0} items
										extracted
									</p>
								</div>
							</div>

							{ocrJob.purchaseOrderId && (
								<div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
									✅ Purchase order created &amp; stock levels updated automatically.
								</div>
							)}

							{/* Parsed item list preview */}
							{Array.isArray(ocrJob.parsedItems) && ocrJob.parsedItems.length > 0 && (
								<div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
									{(ocrJob.parsedItems as Array<{ name?: string; qty?: number; rate?: number }>).map(
										(item, idx) => (
											<div key={idx} className="flex items-center justify-between text-xs">
												<span className="truncate pr-2">{item.name ?? 'Item'}</span>
												<Badge variant="secondary" className="shrink-0 text-xs">
													×{item.qty ?? 1}
												</Badge>
											</div>
										)
									)}
								</div>
							)}
						</div>
					)}

					{/* Failed */}
					{ocrJob?.status === 'failed' && (
						<div className="flex items-start gap-2 py-4 text-destructive">
							<XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
							<div>
								<p className="font-medium">OCR processing failed</p>
								<p className="text-sm">
									{ocrJob.errorMessage ?? 'Could not extract data from the image'}
								</p>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setOcrDialogOpen(false);
								setOcrJobId(null);
								setOcrJob(null);
							}}
						>
							Close
						</Button>
						{ocrJob?.status === 'failed' && (
							<Button
								onClick={() => {
									setOcrDialogOpen(false);
									setOcrJob(null);
									setOcrJobId(null);
									// Re-open file picker
									setTimeout(() => fileInputRef.current?.click(), 100);
								}}
							>
								Try Again
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Draft review & confirm */}
			<DraftConfirmDialog
				draft={pendingDraft}
				open={!!pendingDraft}
				onClose={() => setPendingDraft(null)}
				onConfirmed={() => setPendingDraft(null)}
				onDiscarded={() => setPendingDraft(null)}
			/>
		</div>
	);
}

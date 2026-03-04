/**
 * DraftManagerPanel
 *
 * Two view modes toggled by the "Fast Mode" switch in the panel header:
 *
 *  Standard  — card-per-draft with Confirm / Discard / Detail-Edit buttons
 *  Fast Mode — Excel-like spreadsheet; click any cell to edit inline,
 *              auto-saves on blur via draftApi.update.
 *              Per-row buttons: Detail ▸ (opens full dialog), Confirm ✓, Discard ✕
 *
 * • Real-time updates via WS invalidation
 * • Red badge on trigger button
 * • Fast Mode preference persisted in localStorage
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
	FileEdit,
	CheckCircle2,
	Trash2,
	Loader2,
	ClipboardList,
	ChevronRight,
	Zap,
	ZapOff,
	ExternalLink,
	Save,
	Check,
	AlertCircle,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { draftApi, type Draft } from '@/lib/api';
import { DraftConfirmDialog } from './DraftConfirmDialog';

// ─── helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Draft['type'], string> = {
	purchase_entry: 'Purchase',
	product: 'New Product',
	stock_adjustment: 'Stock Adj.',
};

const TYPE_COLOR: Record<Draft['type'], string> = {
	purchase_entry: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	stock_adjustment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const TYPE_ORDER: Draft['type'][] = ['purchase_entry', 'product', 'stock_adjustment'];

function relTime(iso: string) {
	try {
		return formatDistanceToNow(new Date(iso), { addSuffix: true });
	} catch {
		return '—';
	}
}

// ─── Standard card ────────────────────────────────────────────────────────────

function DraftCard({
	draft,
	onEdit,
	onConfirm,
	onDiscard,
	busy,
}: {
	draft: Draft;
	onEdit: (d: Draft) => void;
	onConfirm: (id: string) => void;
	onDiscard: (id: string) => void;
	busy: string | null;
}) {
	const isLoading = busy === draft.id;
	return (
		<div className="rounded-lg border bg-card p-3 space-y-2">
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm truncate">
						{draft.title ?? TYPE_LABEL[draft.type as Draft['type']]}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">{relTime(draft.createdAt)}</p>
				</div>
				<span
					className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR[draft.type as Draft['type']]}`}
				>
					{TYPE_LABEL[draft.type as Draft['type']]}
				</span>
			</div>
			{draft.notes && <p className="text-xs text-muted-foreground italic truncate">{draft.notes}</p>}
			<div className="flex items-center gap-1.5">
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2 text-xs"
					onClick={() => onEdit(draft)}
					disabled={isLoading}
				>
					<ChevronRight className="h-3 w-3 mr-1" />
					Detail
				</Button>
				<Button
					size="sm"
					variant="outline"
					className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
					onClick={() => onDiscard(draft.id)}
					disabled={isLoading}
				>
					{isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-0.5" />}
					Discard
				</Button>
				<Button
					size="sm"
					className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
					onClick={() => onConfirm(draft.id)}
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<CheckCircle2 className="h-3 w-3 mr-0.5" />
					)}
					Confirm
				</Button>
			</div>
		</div>
	);
}

// ─── Fast Mode Excel table ────────────────────────────────────────────────────

type RowStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface ProductRow {
	id: string;
	title: string;
	name: string;
	category: string;
	price: string;
	stock: string;
	unit: string;
	notes: string;
	_original: Draft;
	_status: RowStatus;
}

function toProductRow(d: Draft): ProductRow {
	const data = (d.data ?? {}) as Record<string, unknown>;
	return {
		id: d.id,
		title: d.title ?? '',
		name: String(data.name ?? ''),
		category: String(data.category ?? 'General'),
		price: String(data.price ?? ''),
		stock: String(data.stock ?? '0'),
		unit: String(data.unit ?? 'piece'),
		notes: d.notes ?? '',
		_original: d,
		_status: 'idle',
	};
}

type ColKey = keyof Omit<ProductRow, 'id' | '_original' | '_status'>;

const PRODUCT_COLS: { key: ColKey; label: string; width: string; type?: string }[] = [
	{ key: 'name', label: 'Name', width: 'min-w-[150px]' },
	{ key: 'category', label: 'Category', width: 'min-w-[100px]' },
	{ key: 'price', label: 'Price ₹', width: 'min-w-[75px]', type: 'number' },
	{ key: 'stock', label: 'Stock', width: 'min-w-[65px]', type: 'number' },
	{ key: 'unit', label: 'Unit', width: 'min-w-[80px]' },
	{ key: 'notes', label: 'Notes', width: 'min-w-[120px]' },
];

const UNIT_OPTIONS = ['piece', 'kg', 'g', 'litre', 'ml', 'box', 'packet', 'dozen', 'pair', 'set', 'metre', 'bundle'];

function StatusIcon({ status }: { status: RowStatus }) {
	if (status === 'saving') return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
	if (status === 'saved') return <Check className="h-3 w-3 text-green-500" />;
	if (status === 'error') return <AlertCircle className="h-3 w-3 text-red-500" />;
	if (status === 'dirty') return <Save className="h-3 w-3 text-amber-500" />;
	return null;
}

function EditableCell({
	value,
	type = 'text',
	isUnit = false,
	onChange,
	onBlur,
}: {
	value: string;
	type?: string;
	isUnit?: boolean;
	onChange: (v: string) => void;
	onBlur: () => void;
}) {
	if (isUnit) {
		return (
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				className="w-full bg-transparent text-xs border-0 outline-none focus:bg-background focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 cursor-pointer"
			>
				{UNIT_OPTIONS.map((u) => (
					<option key={u} value={u}>
						{u}
					</option>
				))}
			</select>
		);
	}
	return (
		<input
			type={type}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			onKeyDown={(e) => {
				if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
			}}
			className="w-full bg-transparent text-xs border-0 outline-none focus:bg-background focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5 min-w-0"
			step={type === 'number' ? '0.01' : undefined}
			min={type === 'number' ? '0' : undefined}
		/>
	);
}

function FastModeTable({
	drafts,
	onEdit,
	onConfirm,
	onDiscard,
	busy,
}: {
	drafts: Draft[];
	onEdit: (d: Draft) => void;
	onConfirm: (id: string) => void;
	onDiscard: (id: string) => void;
	busy: string | null;
}) {
	const [rows, setRows] = useState<ProductRow[]>(() => drafts.map(toProductRow));
	const { toast } = useToast();
	const qc = useQueryClient();

	// Sync rows when draft list changes (new drafts added / old ones confirmed/discarded)
	useEffect(() => {
		setRows((prev) => {
			const draftIds = new Set(drafts.map((d) => d.id));
			const kept = prev.filter((r) => draftIds.has(r.id));
			const existIds = new Set(kept.map((r) => r.id));
			const added = drafts.filter((d) => !existIds.has(d.id)).map(toProductRow);
			return [...kept, ...added];
		});
	}, [drafts]);

	const updateCell = (id: string, field: ColKey, value: string) => {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value, _status: 'dirty' as RowStatus } : r)));
	};

	const saveRow = useCallback(
		async (id: string) => {
			let rowToSave: ProductRow | undefined;

			setRows((prev) => {
				const row = prev.find((r) => r.id === id);
				if (!row || row._status !== 'dirty') return prev;
				rowToSave = row;
				return prev.map((r) => (r.id === id ? { ...r, _status: 'saving' as RowStatus } : r));
			});

			if (!rowToSave) return;
			const row = rowToSave;

			try {
				const updatedData = {
					name: row.name.trim(),
					category: row.category.trim() || 'General',
					price: parseFloat(row.price) || 0,
					stock: parseFloat(row.stock) || 0,
					unit: row.unit || 'piece',
				};
				const updatedTitle = row.name.trim() ? `OCR: ${row.name.trim()}` : (row._original.title ?? '');

				await draftApi.update(id, {
					data: updatedData,
					title: updatedTitle || undefined,
					notes: row.notes.trim() || undefined,
				});

				setRows((prev) =>
					prev.map((r) => (r.id === id ? { ...r, title: updatedTitle, _status: 'saved' as RowStatus } : r))
				);
				qc.invalidateQueries({ queryKey: ['drafts'] });

				// Auto-reset "saved" indicator after 2 s
				setTimeout(() => {
					setRows((prev) =>
						prev.map((r) =>
							r.id === id && r._status === 'saved' ? { ...r, _status: 'idle' as RowStatus } : r
						)
					);
				}, 2000);
			} catch {
				setRows((prev) => prev.map((r) => (r.id === id ? { ...r, _status: 'error' as RowStatus } : r)));
				toast({
					title: 'Save failed',
					description: 'Could not save edits. Try again.',
					variant: 'destructive',
				});
			}
		},
		[qc, toast]
	);

	const productRows = rows.filter((r) => r._original.type === 'product');
	const otherDrafts = drafts.filter((d) => d.type !== 'product');

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<ScrollArea className="flex-1">
				<div className="p-3">
					{/* ── Product Excel table ── */}
					{productRows.length > 0 && (
						<>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
								New Products · {productRows.length}
							</p>

							<div className="overflow-x-auto rounded-md border text-xs">
								<table className="w-full border-collapse">
									<thead>
										<tr className="bg-muted/60">
											<th className="px-2 py-1.5 text-center font-semibold text-muted-foreground border-b w-8">
												#
											</th>
											{PRODUCT_COLS.map((col) => (
												<th
													key={col.key}
													className={`px-2 py-1.5 text-left font-semibold text-muted-foreground border-b ${col.width}`}
												>
													{col.label}
												</th>
											))}
											<th className="px-2 py-1.5 text-center font-semibold text-muted-foreground border-b w-24">
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{productRows.map((row, idx) => {
											const isBusy = busy === row.id;
											let rowBg = '';
											if (row._status === 'dirty') rowBg = 'bg-amber-50/50 dark:bg-amber-900/10';
											if (row._status === 'error') rowBg = 'bg-red-50/50 dark:bg-red-900/10';

											return (
												<tr
													key={row.id}
													className={`group transition-colors hover:bg-accent/20 ${isBusy ? 'opacity-60' : ''} ${rowBg}`}
												>
													{/* Row # + status icon */}
													<td className="px-1 py-0.5 border-b text-center text-muted-foreground">
														<div className="flex items-center justify-center gap-0.5">
															<span className="text-[10px]">{idx + 1}</span>
															<StatusIcon status={row._status} />
														</div>
													</td>

													{/* Editable data cells */}
													{PRODUCT_COLS.map((col) => (
														<td key={col.key} className={`px-1 py-0 border-b ${col.width}`}>
															<EditableCell
																value={row[col.key] as string}
																type={col.type}
																isUnit={col.key === 'unit'}
																onChange={(v) => updateCell(row.id, col.key, v)}
																onBlur={() => saveRow(row.id)}
															/>
														</td>
													))}

													{/* Action buttons */}
													<td className="px-1 py-0.5 border-b">
														<TooltipProvider>
															<div className="flex items-center gap-0.5 justify-center">
																{/* Detail edit */}
																<Tooltip>
																	<TooltipTrigger asChild>
																		<button
																			className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
																			onClick={() => onEdit(row._original)}
																			disabled={isBusy}
																		>
																			<ExternalLink className="h-3 w-3" />
																		</button>
																	</TooltipTrigger>
																	<TooltipContent side="top" className="text-xs">
																		Full detail edit
																	</TooltipContent>
																</Tooltip>

																{/* Confirm */}
																<Tooltip>
																	<TooltipTrigger asChild>
																		<button
																			className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 disabled:opacity-40"
																			onClick={() => onConfirm(row.id)}
																			disabled={
																				isBusy ||
																				row._status === 'dirty' ||
																				row._status === 'saving'
																			}
																		>
																			{isBusy ? (
																				<Loader2 className="h-3 w-3 animate-spin" />
																			) : (
																				<CheckCircle2 className="h-3 w-3" />
																			)}
																		</button>
																	</TooltipTrigger>
																	<TooltipContent side="top" className="text-xs">
																		{row._status === 'dirty'
																			? 'Save first (Tab or Enter)'
																			: 'Confirm → add to inventory'}
																	</TooltipContent>
																</Tooltip>

																{/* Discard */}
																<Tooltip>
																	<TooltipTrigger asChild>
																		<button
																			className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 disabled:opacity-40"
																			onClick={() => onDiscard(row.id)}
																			disabled={isBusy}
																		>
																			<Trash2 className="h-3 w-3" />
																		</button>
																	</TooltipTrigger>
																	<TooltipContent side="top" className="text-xs">
																		Discard
																	</TooltipContent>
																</Tooltip>
															</div>
														</TooltipProvider>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							<p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
								💡 Click any cell to edit · Tab or Enter to save ·{' '}
								<span className="text-amber-600 font-medium">amber = unsaved</span> ·{' '}
								<span className="text-green-600 font-medium">✓ = saved</span> · detail icon opens full
								form
							</p>
						</>
					)}

					{/* ── Other draft types (non-product) ── */}
					{otherDrafts.length > 0 && (
						<div className="mt-4 space-y-2">
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
								Other Drafts · {otherDrafts.length}
							</p>
							{otherDrafts.map((d) => (
								<div
									key={d.id}
									className="flex items-center justify-between rounded border bg-card px-3 py-2 gap-2"
								>
									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium truncate">
											{d.title ?? TYPE_LABEL[d.type as Draft['type']]}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{TYPE_LABEL[d.type as Draft['type']]} · {relTime(d.createdAt)}
										</p>
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<button
											className="p-1 rounded hover:bg-muted text-muted-foreground"
											onClick={() => onEdit(d)}
										>
											<ExternalLink className="h-3 w-3" />
										</button>
										<button
											className="p-1 rounded hover:bg-green-100 text-green-700 disabled:opacity-40"
											onClick={() => onConfirm(d.id)}
											disabled={busy === d.id}
										>
											{busy === d.id ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<CheckCircle2 className="h-3 w-3" />
											)}
										</button>
										<button
											className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-40"
											onClick={() => onDiscard(d.id)}
											disabled={busy === d.id}
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function DraftManagerPanel() {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [editDraft, setEditDraft] = useState<Draft | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	// Fast Mode — persisted in localStorage
	const [fastMode, setFastMode] = useState(() => {
		try {
			return localStorage.getItem('draft-fast-mode') === 'true';
		} catch {
			return false;
		}
	});

	const toggleFastMode = (v: boolean) => {
		setFastMode(v);
		try {
			localStorage.setItem('draft-fast-mode', String(v));
		} catch {
			/* noop */
		}
	};

	// Keep drafts in sync with WS events
	useWsInvalidation(['drafts']);

	// Allow NotificationCenter "Review" link to open this panel
	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener('open-draft-panel', handler);
		return () => window.removeEventListener('open-draft-panel', handler);
	}, []);

	const { data } = useQuery({
		queryKey: ['drafts', 'pending'],
		queryFn: () => draftApi.list(undefined, 'pending'),
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchInterval: 15_000,
	});

	const drafts = data?.drafts ?? [];

	// ── confirm single ────────────────────────────────────────────────────────
	const confirmMutation = useMutation({
		mutationFn: (id: string) => draftApi.confirm(id),
		onMutate: (id) => setBusyId(id),
		onSettled: () => setBusyId(null),
		onSuccess: ({ draft }) => {
			toast({
				title: 'Confirmed!',
				description: draft.title ?? TYPE_LABEL[draft.type as Draft['type']],
			});
			['drafts', 'purchases', 'products', 'expenses'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
		},
		onError: (err: any) => {
			toast({
				title: 'Confirm failed',
				description: err?.message ?? 'Error',
				variant: 'destructive',
			});
		},
	});

	// ── discard single ────────────────────────────────────────────────────────
	const discardMutation = useMutation({
		mutationFn: (id: string) => draftApi.discard(id),
		onMutate: (id) => setBusyId(id),
		onSettled: () => setBusyId(null),
		onSuccess: () => {
			toast({ title: 'Draft discarded' });
			qc.invalidateQueries({ queryKey: ['drafts'] });
		},
	});

	// ── confirm all ───────────────────────────────────────────────────────────
	const [confirmingAll, setConfirmingAll] = useState(false);
	async function handleConfirmAll() {
		setConfirmingAll(true);
		let ok = 0;
		let fail = 0;
		for (const d of drafts) {
			try {
				await draftApi.confirm(d.id);
				ok++;
			} catch {
				fail++;
			}
		}
		setConfirmingAll(false);
		['drafts', 'purchases', 'products', 'expenses'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
		toast({
			title: `Confirmed ${ok} draft${ok !== 1 ? 's' : ''}${fail ? ` (${fail} failed)` : ''}`,
		});
	}

	// Group by type (Standard mode)
	const grouped = TYPE_ORDER.reduce<Record<string, Draft[]>>((acc, type) => {
		const items = drafts.filter((d) => d.type === type);
		if (items.length) acc[type] = items;
		return acc;
	}, {});

	const pendingCount = drafts.length;

	// Widen the panel in Fast Mode to accommodate the table
	const sheetWidth = fastMode ? 'w-[95vw] sm:w-[860px]' : 'w-[360px] sm:w-[420px]';

	return (
		<>
			{/* ── Trigger button ─────────────────────────────────────────────── */}
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetTrigger asChild>
					<button
						className="relative inline-flex items-center justify-center rounded-full w-10 h-10 bg-background border shadow-sm hover:bg-accent transition-colors"
						title="View pending drafts"
					>
						<FileEdit className="h-4 w-4" />
						{pendingCount > 0 && (
							<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
								{pendingCount > 9 ? '9+' : pendingCount}
							</span>
						)}
					</button>
				</SheetTrigger>

				<SheetContent
					side="right"
					className={`${sheetWidth} flex flex-col p-0 transition-all duration-200`}
					aria-describedby={undefined}
				>
					{/* ── Header ─────────────────────────────────────────────────── */}
					<SheetHeader className="px-4 pt-4 pb-2 shrink-0">
						<SheetTitle className="flex items-center gap-2 flex-wrap">
							<ClipboardList className="h-5 w-5 shrink-0" />
							<span>Draft Queue</span>
							{pendingCount > 0 && (
								<Badge variant="destructive" className="text-xs">
									{pendingCount} pending
								</Badge>
							)}

							{/* Fast Mode toggle */}
							<div className="ml-auto flex items-center gap-1.5">
								<Label
									htmlFor="fast-mode-toggle"
									className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 select-none"
								>
									{fastMode ? (
										<Zap className="h-3.5 w-3.5 text-amber-500" />
									) : (
										<ZapOff className="h-3.5 w-3.5 text-muted-foreground" />
									)}
									Fast Mode
								</Label>
								<Switch
									id="fast-mode-toggle"
									checked={fastMode}
									onCheckedChange={toggleFastMode}
									className="scale-75 origin-right"
								/>
							</div>
						</SheetTitle>

						{fastMode && pendingCount > 0 && (
							<p className="text-[11px] text-muted-foreground mt-0.5">
								⚡ Excel-like · click cell to edit · Tab / Enter saves · amber = unsaved
							</p>
						)}
					</SheetHeader>

					<Separator />

					{/* ── Body ───────────────────────────────────────────────────── */}
					{pendingCount === 0 ? (
						<div className="flex-1 flex items-center justify-center text-center px-6 text-muted-foreground">
							<div>
								<ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
								<p className="text-sm">No pending drafts</p>
								<p className="text-xs mt-1">
									Forms will create a draft first — you can review and confirm here.
								</p>
							</div>
						</div>
					) : fastMode ? (
						/* ── Fast Mode view ── */
						<>
							<FastModeTable
								drafts={drafts}
								onEdit={setEditDraft}
								onConfirm={(id) => confirmMutation.mutate(id)}
								onDiscard={(id) => discardMutation.mutate(id)}
								busy={busyId}
							/>
							<Separator />
							<div className="px-4 py-3 shrink-0">
								<Button
									className="w-full bg-green-600 hover:bg-green-700 text-white"
									onClick={handleConfirmAll}
									disabled={confirmingAll || !!busyId}
								>
									{confirmingAll ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<CheckCircle2 className="h-4 w-4 mr-2" />
									)}
									Confirm All ({pendingCount})
								</Button>
							</div>
						</>
					) : (
						/* ── Standard card view ── */
						<>
							<ScrollArea className="flex-1 px-4 py-3">
								<div className="space-y-4">
									{Object.entries(grouped).map(([type, items]) => (
										<div key={type}>
											<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
												{TYPE_LABEL[type as Draft['type']]} · {items.length}
											</p>
											<div className="space-y-2">
												{items.map((d) => (
													<DraftCard
														key={d.id}
														draft={d}
														onEdit={setEditDraft}
														onConfirm={(id) => confirmMutation.mutate(id)}
														onDiscard={(id) => discardMutation.mutate(id)}
														busy={busyId}
													/>
												))}
											</div>
										</div>
									))}
								</div>
							</ScrollArea>

							<Separator />
							<div className="px-4 py-3 shrink-0">
								<Button
									className="w-full bg-green-600 hover:bg-green-700 text-white"
									onClick={handleConfirmAll}
									disabled={confirmingAll || !!busyId}
								>
									{confirmingAll ? (
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
									) : (
										<CheckCircle2 className="h-4 w-4 mr-2" />
									)}
									Confirm All ({pendingCount})
								</Button>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* Full-edit dialog (both modes) */}
			<DraftConfirmDialog
				draft={editDraft}
				open={!!editDraft}
				onClose={() => setEditDraft(null)}
				onConfirmed={() => setEditDraft(null)}
				onDiscarded={() => setEditDraft(null)}
			/>
		</>
	);
}

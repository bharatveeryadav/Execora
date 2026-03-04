/**
 * DraftConfirmDialog
 *
 * Shows a modal so the user can review and optionally edit a draft before
 * confirming it into the real database.  Supports all three draft types:
 *   • purchase_entry  — supplier bill line
 *   • product         — new product card
 *   • stock_adjustment — stock in / out
 */
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { draftApi, type Draft } from '@/lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Draft['type'], string> = {
	purchase_entry: 'Purchase Entry',
	product: 'New Product',
	stock_adjustment: 'Stock Adjustment',
};

const TYPE_BADGE_COLOR: Record<Draft['type'], string> = {
	purchase_entry: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	product: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	stock_adjustment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

// ─── field editors per type ───────────────────────────────────────────────────

function PurchaseFields({
	data,
	onChange,
}: {
	data: Record<string, unknown>;
	onChange: (d: Record<string, unknown>) => void;
}) {
	const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });
	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="col-span-2">
				<Label>Item Name</Label>
				<Input
					value={String(data.itemName ?? '')}
					onChange={(e) => set('itemName', e.target.value)}
					placeholder="e.g. Basmati Rice 25kg"
				/>
			</div>
			<div>
				<Label>Amount (₹)</Label>
				<Input
					type="number"
					value={String(data.amount ?? '')}
					onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
					placeholder="0.00"
				/>
			</div>
			<div>
				<Label>Category</Label>
				<Input
					value={String(data.category ?? '')}
					onChange={(e) => set('category', e.target.value)}
					placeholder="Purchases"
				/>
			</div>
			<div>
				<Label>Quantity</Label>
				<Input
					type="number"
					value={String(data.quantity ?? '')}
					onChange={(e) => set('quantity', parseFloat(e.target.value) || undefined)}
					placeholder="1"
				/>
			</div>
			<div>
				<Label>Unit</Label>
				<Input
					value={String(data.unit ?? '')}
					onChange={(e) => set('unit', e.target.value)}
					placeholder="kg / pcs / bag"
				/>
			</div>
			<div>
				<Label>Rate / Unit (₹)</Label>
				<Input
					type="number"
					value={String(data.ratePerUnit ?? '')}
					onChange={(e) => set('ratePerUnit', parseFloat(e.target.value) || undefined)}
					placeholder="0.00"
				/>
			</div>
			<div>
				<Label>Vendor / Supplier</Label>
				<Input
					value={String(data.vendor ?? '')}
					onChange={(e) => set('vendor', e.target.value)}
					placeholder="Optional"
				/>
			</div>
			<div>
				<Label>Date</Label>
				<Input
					type="date"
					value={String(
						data.date
							? new Date(data.date as string).toISOString().split('T')[0]
							: new Date().toISOString().split('T')[0]
					)}
					onChange={(e) => set('date', e.target.value)}
				/>
			</div>
		</div>
	);
}

function ProductFields({
	data,
	onChange,
}: {
	data: Record<string, unknown>;
	onChange: (d: Record<string, unknown>) => void;
}) {
	const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });
	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="col-span-2">
				<Label>Product Name *</Label>
				<Input
					value={String(data.name ?? '')}
					onChange={(e) => set('name', e.target.value)}
					placeholder="e.g. Basmati Rice Premium"
				/>
			</div>
			<div>
				<Label>Category</Label>
				<Input
					value={String(data.category ?? '')}
					onChange={(e) => set('category', e.target.value)}
					placeholder="General"
				/>
			</div>
			<div>
				<Label>Unit</Label>
				<Input
					value={String(data.unit ?? '')}
					onChange={(e) => set('unit', e.target.value)}
					placeholder="pcs / kg / bag"
				/>
			</div>
			<div>
				<Label>Selling Price (₹)</Label>
				<Input
					type="number"
					value={String(data.price ?? '')}
					onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
					placeholder="0.00"
				/>
			</div>
			<div>
				<Label>MRP (₹)</Label>
				<Input
					type="number"
					value={String(data.mrp ?? '')}
					onChange={(e) => set('mrp', parseFloat(e.target.value) || undefined)}
					placeholder="Optional"
				/>
			</div>
			<div>
				<Label>Opening Stock</Label>
				<Input
					type="number"
					value={String(data.stock ?? 0)}
					onChange={(e) => set('stock', parseInt(e.target.value, 10) || 0)}
					placeholder="0"
				/>
			</div>
			<div>
				<Label>Min Stock (Reorder)</Label>
				<Input
					type="number"
					value={String(data.minStock ?? 5)}
					onChange={(e) => set('minStock', parseInt(e.target.value, 10) || 5)}
					placeholder="5"
				/>
			</div>
			<div>
				<Label>SKU</Label>
				<Input
					value={String(data.sku ?? '')}
					onChange={(e) => set('sku', e.target.value || undefined)}
					placeholder="Optional"
				/>
			</div>
			<div>
				<Label>Barcode</Label>
				<Input
					value={String(data.barcode ?? '')}
					onChange={(e) => set('barcode', e.target.value || undefined)}
					placeholder="Optional"
				/>
			</div>
		</div>
	);
}

function StockAdjFields({
	data,
	onChange,
}: {
	data: Record<string, unknown>;
	onChange: (d: Record<string, unknown>) => void;
}) {
	const set = (k: string, v: unknown) => onChange({ ...data, [k]: v });
	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="col-span-2">
				<Label>Product</Label>
				<Input value={String(data.productName ?? data.productId ?? '')} readOnly className="bg-muted" />
			</div>
			<div>
				<Label>Quantity</Label>
				<Input
					type="number"
					value={String(data.qty ?? '')}
					onChange={(e) => set('qty', parseInt(e.target.value, 10) || 0)}
					placeholder="1"
				/>
			</div>
			<div>
				<Label>Direction</Label>
				<select
					className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
					value={String(data.direction ?? 'in')}
					onChange={(e) => set('direction', e.target.value)}
				>
					<option value="in">Stock In (+)</option>
					<option value="out">Stock Out (-)</option>
				</select>
			</div>
		</div>
	);
}

// ─── main dialog ──────────────────────────────────────────────────────────────

interface Props {
	draft: Draft | null;
	open: boolean;
	onClose: () => void;
	onConfirmed?: (draft: Draft) => void;
	onDiscarded?: (draftId: string) => void;
}

export function DraftConfirmDialog({ draft, open, onClose, onConfirmed, onDiscarded }: Props) {
	const { toast } = useToast();
	const qc = useQueryClient();
	const [localData, setLocalData] = useState<Record<string, unknown>>({});
	const [notes, setNotes] = useState('');

	// Sync local state when draft changes
	useEffect(() => {
		if (draft) {
			setLocalData(draft.data as Record<string, unknown>);
			setNotes(draft.notes ?? '');
		}
	}, [draft?.id]);

	const updateMutation = useMutation({
		mutationFn: () => draftApi.update(draft!.id, { data: localData, notes: notes || undefined }),
		onSuccess: () => {
			toast({ title: 'Draft saved' });
			qc.invalidateQueries({ queryKey: ['drafts'] });
			onClose();
		},
	});

	const confirmMutation = useMutation({
		mutationFn: async () => {
			// Save latest edits first
			await draftApi.update(draft!.id, { data: localData, notes: notes || undefined });
			return draftApi.confirm(draft!.id);
		},
		onSuccess: ({ draft: confirmed }) => {
			toast({
				title: 'Draft confirmed!',
				description: confirmed.title ?? TYPE_LABEL[confirmed.type as Draft['type']],
			});
			qc.invalidateQueries({ queryKey: ['drafts'] });
			qc.invalidateQueries({ queryKey: ['purchases'] });
			qc.invalidateQueries({ queryKey: ['products'] });
			qc.invalidateQueries({ queryKey: ['expenses'] });
			onConfirmed?.(confirmed as Draft);
			onClose();
		},
		onError: (err: any) => {
			toast({ title: 'Confirm failed', description: err?.message ?? String(err), variant: 'destructive' });
		},
	});

	const discardMutation = useMutation({
		mutationFn: () => draftApi.discard(draft!.id),
		onSuccess: () => {
			toast({ title: 'Draft discarded' });
			qc.invalidateQueries({ queryKey: ['drafts'] });
			onDiscarded?.(draft!.id);
			onClose();
		},
	});

	if (!draft) return null;

	const isBusy = updateMutation.isPending || confirmMutation.isPending || discardMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={(o) => !o && !isBusy && onClose()}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<span>{draft.title ?? TYPE_LABEL[draft.type as Draft['type']]}</span>
						<span
							className={`text-xs px-2 py-0.5 rounded-full font-medium ${
								TYPE_BADGE_COLOR[draft.type as Draft['type']]
							}`}
						>
							{TYPE_LABEL[draft.type as Draft['type']]}
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Type-specific fields */}
					{draft.type === 'purchase_entry' && <PurchaseFields data={localData} onChange={setLocalData} />}
					{draft.type === 'product' && <ProductFields data={localData} onChange={setLocalData} />}
					{draft.type === 'stock_adjustment' && <StockAdjFields data={localData} onChange={setLocalData} />}

					{/* Notes */}
					<div>
						<Label>Notes (optional)</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Any additional notes…"
							rows={2}
						/>
					</div>
				</div>

				<DialogFooter className="flex-wrap gap-2">
					<Button
						variant="outline"
						className="text-red-600 border-red-300 hover:bg-red-50"
						onClick={() => discardMutation.mutate()}
						disabled={isBusy}
					>
						{discardMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<Trash2 className="h-4 w-4 mr-1" />
						)}
						Discard
					</Button>
					<Button variant="outline" onClick={() => updateMutation.mutate()} disabled={isBusy}>
						{updateMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<Save className="h-4 w-4 mr-1" />
						)}
						Save Draft
					</Button>
					<Button
						onClick={() => confirmMutation.mutate()}
						disabled={isBusy}
						className="bg-green-600 hover:bg-green-700 text-white"
					>
						{confirmMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<CheckCircle2 className="h-4 w-4 mr-1" />
						)}
						Confirm & Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

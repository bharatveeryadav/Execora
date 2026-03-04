/**
 * S9-05: Single-screen classic billing UI
 * Customer search + items + totals — all on one page, no navigation.
 * Addresses #1 UX complaint: "too many taps to create a bill".
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, User, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { customerApi, invoiceApi } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@/lib/api';

interface BillingItem {
	id: number;
	name: string;
	qty: string;
}

let _id = 1;
const newItem = (): BillingItem => ({ id: _id++, name: '', qty: '1' });

export default function ClassicBilling() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const qc = useQueryClient();

	// ── Customer ──────────────────────────────────────────────────────────────
	const [customerQuery, setCustomerQuery] = useState('');
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const customerInputRef = useRef<HTMLInputElement>(null);

	const { data: suggestData, isFetching: searchingCustomers } = useQuery({
		queryKey: ['customers-suggest', customerQuery],
		queryFn: () => customerApi.search(customerQuery, 8),
		enabled: customerQuery.length >= 1 && !selectedCustomer,
		staleTime: 2000,
	});

	const suggestions: Customer[] = suggestData?.customers ?? [];

	// ── Items ─────────────────────────────────────────────────────────────────
	const [items, setItems] = useState<BillingItem[]>([newItem()]);

	const updateItem = (id: number, field: keyof BillingItem, value: string) =>
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
	const removeItem = (id: number) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
	const addItem = () => setItems((prev) => [...prev, newItem()]);

	// ── Mutations ─────────────────────────────────────────────────────────────
	const createWalkIn = useMutation({
		mutationFn: async () => {
			const { customers } = await customerApi.search('Walk-in', 10);
			const existing = customers.find((c) => /walk\s*-?\s*in|cash\s*customer/i.test(c.name));
			if (existing) return existing;
			const res = await customerApi.create({ name: 'Walk-in Customer' });
			return (res as { customer: Customer }).customer;
		},
	});

	const createInvoice = useMutation({
		mutationFn: async (customerId: string) => {
			const validItems = items.filter((it) => it.name.trim());
			if (!validItems.length) throw new Error('Koi item nahi dala');
			return invoiceApi.create({
				customerId,
				items: validItems.map((it) => ({
					productName: it.name.trim(),
					quantity: Math.max(1, parseInt(it.qty) || 1),
				})),
			});
		},
		onSuccess: (data) => {
			void qc.invalidateQueries({ queryKey: ['invoices'] });
			void qc.invalidateQueries({ queryKey: ['customers'] });
			toast({
				title: 'Invoice created!',
				description: `#${(data.invoice as any).invoiceNo ?? data.invoice.id.slice(-8).toUpperCase()}`,
			});
			navigate(`/invoices/${data.invoice.id}`);
		},
		onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
	});

	const handleSubmit = async () => {
		let customerId = selectedCustomer?.id;
		if (!customerId) {
			const walkIn = await createWalkIn.mutateAsync();
			customerId = walkIn.id;
		}
		await createInvoice.mutateAsync(customerId);
	};

	const validItemCount = items.filter((it) => it.name.trim()).length;
	const isSubmitting = createWalkIn.isPending || createInvoice.isPending;

	// Close suggestions on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				customerInputRef.current &&
				!customerInputRef.current.closest('.customer-search-wrap')?.contains(e.target as Node)
			) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	return (
		<div className="flex flex-col min-h-screen bg-background">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
				<button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-muted">
					<ArrowLeft className="h-5 w-5" />
				</button>
				<div>
					<h1 className="font-bold text-base leading-tight">Quick Billing</h1>
					<p className="text-[11px] text-muted-foreground">Type items → Create invoice in seconds</p>
				</div>
				<Badge variant="outline" className="ml-auto text-xs">
					<ShoppingCart className="h-3 w-3 mr-1" />
					{validItemCount} item{validItemCount !== 1 ? 's' : ''}
				</Badge>
			</div>

			<div className="flex-1 px-4 py-4 space-y-5 pb-32">
				{/* ── Customer Search ──────────────────────────────────────────── */}
				<div className="customer-search-wrap space-y-1.5">
					<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Customer
					</label>
					{selectedCustomer ? (
						<div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5">
							<User className="h-4 w-4 text-primary shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold truncate">{selectedCustomer.name}</p>
								{selectedCustomer.phone && (
									<p className="text-[11px] text-muted-foreground">{selectedCustomer.phone}</p>
								)}
							</div>
							<button
								onClick={() => {
									setSelectedCustomer(null);
									setCustomerQuery('');
								}}
								className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 hover:border-destructive hover:text-destructive"
							>
								Change
							</button>
						</div>
					) : (
						<div className="relative">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
								<Input
									ref={customerInputRef}
									value={customerQuery}
									onChange={(e) => {
										setCustomerQuery(e.target.value);
										setShowSuggestions(true);
									}}
									onFocus={() => setShowSuggestions(true)}
									placeholder="Search customer… (leave blank = Walk-in)"
									className="pl-9 pr-3"
								/>
								{searchingCustomers && (
									<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
								)}
							</div>
							{showSuggestions && suggestions.length > 0 && (
								<div className="absolute z-20 w-full mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
									{suggestions.map((c) => (
										<button
											key={c.id}
											onMouseDown={(e) => {
												e.preventDefault();
												setSelectedCustomer(c);
												setCustomerQuery('');
												setShowSuggestions(false);
											}}
											className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors"
										>
											<User className="h-4 w-4 text-muted-foreground shrink-0" />
											<div>
												<p className="text-sm font-medium">{c.name}</p>
												{c.phone && (
													<p className="text-[11px] text-muted-foreground">{c.phone}</p>
												)}
											</div>
										</button>
									))}
								</div>
							)}
							{customerQuery.length === 0 && (
								<p className="text-[11px] text-muted-foreground mt-1 pl-1">
									Leave blank → Walk-in / cash customer
								</p>
							)}
						</div>
					)}
				</div>

				{/* ── Items Table ───────────────────────────────────────────────── */}
				<div className="space-y-1.5">
					<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</label>
					<div className="rounded-xl border overflow-hidden">
						<div className="grid grid-cols-[1fr_72px_36px] bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
							<span>Product / Service</span>
							<span className="text-center">Qty</span>
							<span />
						</div>
						{items.map((item, idx) => (
							<div
								key={item.id}
								className="grid grid-cols-[1fr_72px_36px] items-center border-t px-2 py-1.5 gap-1"
							>
								<Input
									value={item.name}
									onChange={(e) => updateItem(item.id, 'name', e.target.value)}
									placeholder={`Item ${idx + 1}`}
									className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
									autoFocus={idx === items.length - 1 && items.length > 1}
								/>
								<Input
									type="number"
									min={1}
									value={item.qty}
									onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
									className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
								/>
								<button
									onClick={() => removeItem(item.id)}
									className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
						<div className="border-t">
							<button
								onClick={addItem}
								className="w-full flex items-center gap-1.5 px-3 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
							>
								<Plus className="h-4 w-4" />
								Add item
							</button>
						</div>
					</div>
				</div>

				{/* ── Summary card ─────────────────────────────────────────────── */}
				<div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-1">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Items added</span>
						<span className="font-semibold">{validItemCount}</span>
					</div>
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Customer</span>
						<span className="font-semibold">{selectedCustomer?.name ?? 'Walk-in'}</span>
					</div>
					<p className="text-[11px] text-muted-foreground pt-1">
						Prices will be fetched from your product catalog. New products auto-created at ₹0.
					</p>
				</div>
			</div>

			{/* ── Sticky footer CTA ─────────────────────────────────────────── */}
			<div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-3 safe-area-inset-bottom">
				<Button
					className="w-full h-12 text-base font-bold gap-2"
					disabled={validItemCount === 0 || isSubmitting}
					onClick={() => void handleSubmit()}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="h-5 w-5 animate-spin" /> Creating invoice…
						</>
					) : (
						<>
							<CheckCircle2 className="h-5 w-5" /> Create Invoice
							{selectedCustomer ? ` — ${selectedCustomer.name}` : ' (Walk-in)'}
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

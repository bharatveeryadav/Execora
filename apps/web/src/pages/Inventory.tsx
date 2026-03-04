import { useState, useRef, useCallback, type FormEvent } from 'react';
import {
	ArrowLeft,
	Plus,
	Search,
	Package,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	ShoppingCart,
	Edit,
	Eye,
	ScanLine,
	ImagePlus,
	CheckCircle,
	XCircle,
	Loader2,
} from 'lucide-react';
import VoiceBar from '@/components/VoiceBar';
import BarcodeScanner from '@/components/BarcodeScanner';
import { wsClient } from '@/lib/ws';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
	useProducts,
	useLowStockProducts,
	useInvoices,
	useCreateProduct,
	useUpdateProduct,
	useAdjustStock,
	useProductByBarcode,
} from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { formatCurrency, draftApi, aiApi, type Product, type Draft, type OcrJob } from '@/lib/api';
import { DraftConfirmDialog } from '@/components/DraftConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { ReplenishmentBanner } from '@/components/ReplenishmentBanner';

const voiceCommands = [
	'Show low stock',
	'Find expiring products',
	'Search rice',
	'Show all products',
	'Check oil stock',
	'Order rice',
	'Update price',
	'Add new product',
];

const Inventory = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState('');
	const [category, setCategory] = useState('All');

	const { data: products = [], isLoading: productsLoading } = useProducts();
	const { data: lowStock = [], isLoading: lowStockLoading } = useLowStockProducts();
	const { data: allInvoices = [] } = useInvoices(200);
	const createProduct = useCreateProduct();
	const updateProduct = useUpdateProduct();
	const lookupByBarcode = useProductByBarcode();
	const adjustStock = useAdjustStock();
	useWsInvalidation(['products', 'lowStock']);

	// ── Edit product state ─────────────────────────────────────────────────────
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [editName, setEditName] = useState('');
	const [editPrice, setEditPrice] = useState('');
	const [editCategory, setEditCategory] = useState('');
	const [editMinStock, setEditMinStock] = useState('');

	// ── Stock adjust state ─────────────────────────────────────────────────────
	const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
	const [adjustQty, setAdjustQty] = useState('1');
	const [adjustOp, setAdjustOp] = useState<'add' | 'subtract'>('add');

	// ── Add product state ──────────────────────────────────────────────────────
	const [addProductOpen, setAddProductOpen] = useState(false);
	const [addName, setAddName] = useState('');
	const [addPrice, setAddPrice] = useState('');
	const [addStock, setAddStock] = useState('0');
	const [addUnit, setAddUnit] = useState('Piece');
	const [addCategory, setAddCategory] = useState('');
	const [addBarcode, setAddBarcode] = useState('');
	const [addSku, setAddSku] = useState('');

	// Draft review state for the confirm dialog
	const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

	// ── Bulk Product Import (OCR) state ───────────────────────────────────────
	const bulkImportFileRef = useRef<HTMLInputElement>(null);
	const [bulkOcrJobId, setBulkOcrJobId] = useState<string | null>(null);
	const [bulkOcrJob, setBulkOcrJob] = useState<OcrJob | null>(null);
	const [bulkOcrOpen, setBulkOcrOpen] = useState(false);
	const [bulkUploading, setBulkUploading] = useState(false);

	/** Poll catalog seed OCR job every 2 s until completed / failed */
	const pollBulkOcr = useCallback(
		(jobId: string) => {
			const timer = setInterval(async () => {
				try {
					const job = await aiApi.getOcrJob(jobId);
					setBulkOcrJob(job);
					if (job.status === 'completed' || job.status === 'failed') {
						clearInterval(timer);
						if (job.status === 'completed') {
							await queryClient.invalidateQueries({ queryKey: ['drafts'] });
							// Auto-open the Draft panel so the user can review immediately
							window.dispatchEvent(new CustomEvent('open-draft-panel'));
							toast({
								title: '✅ Drafts ready for review',
								description: `${job.productsCreated ?? 0} product draft${(job.productsCreated ?? 0) === 1 ? '' : 's'} created — review in the Draft panel.`,
							});
						} else {
							toast({
								title: 'Import failed',
								description: job.errorMessage ?? 'Could not read products from the image',
								variant: 'destructive',
							});
						}
					}
				} catch {
					// silently retry
				}
			}, 2000);
		},
		[queryClient, toast]
	);

	async function handleBulkImportFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = ''; // allow re-selecting same file

		setBulkUploading(true);
		setBulkOcrJob(null);
		setBulkOcrJobId(null);
		setBulkOcrOpen(true);
		try {
			const { jobId } = await aiApi.seedCatalogFromPhoto(file);
			setBulkOcrJobId(jobId);
			setBulkOcrJob({ jobId, jobType: 'product_catalog', status: 'pending', productsCreated: 0 });
			pollBulkOcr(jobId);
		} catch (err: any) {
			toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
			setBulkOcrOpen(false);
		} finally {
			setBulkUploading(false);
		}
	}

	const resetAddProduct = () => {
		setAddName('');
		setAddPrice('');
		setAddStock('0');
		setAddUnit('Piece');
		setAddCategory('');
		setAddBarcode('');
		setAddSku('');
	};

	// ── Inline stock quick-edit ─────────────────────────────────────────────────
	const [inlineEditId, setInlineEditId] = useState<string | null>(null);
	const [inlineEditQty, setInlineEditQty] = useState('');
	const [inlineSaving, setInlineSaving] = useState(false);
	const [inventoryScannerOpen, setInventoryScannerOpen] = useState(false);

	const startInlineEdit = (p: Product) => {
		setInlineEditId(p.id);
		setInlineEditQty(String(p.stock));
	};

	const saveInlineEdit = async (p: Product) => {
		const newQty = parseInt(inlineEditQty, 10);
		if (isNaN(newQty) || newQty < 0) {
			toast({ title: '⚠️ Invalid quantity', variant: 'destructive' });
			return;
		}
		const delta = newQty - p.stock;
		if (delta === 0) {
			setInlineEditId(null);
			return;
		}
		setInlineSaving(true);
		try {
			await adjustStock.mutateAsync({
				id: p.id,
				quantity: Math.abs(delta),
				operation: delta > 0 ? 'add' : 'subtract',
			});
			toast({ title: `✅ Stock updated to ${newQty} ${p.unit}` });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Update failed';
			toast({ title: '❌ Stock update failed', description: msg, variant: 'destructive' });
		}
		setInlineEditId(null);
		setInlineSaving(false);
	};

	const openEdit = (p: Product) => {
		setEditingProduct(p);
		setEditName(p.name);
		setEditPrice(String(parseFloat(String(p.price))));
		setEditCategory(p.category ?? '');
		setEditMinStock(p.minStock != null ? String(p.minStock) : '');
	};

	const handleSaveEdit = async () => {
		if (!editingProduct) return;
		await updateProduct.mutateAsync({
			id: editingProduct.id,
			name: editName || undefined,
			price: editPrice ? parseFloat(editPrice) : undefined,
			category: editCategory || undefined,
			minStock: editMinStock !== '' ? parseInt(editMinStock, 10) : undefined,
		});
		toast({ title: '✅ Product updated' });
		setEditingProduct(null);
	};

	const handleAdjustStock = async () => {
		if (!adjustingProduct) return;
		const qty = parseInt(adjustQty, 10);
		if (!qty || qty <= 0) {
			toast({ title: '⚠️ Enter a valid quantity', variant: 'destructive' });
			return;
		}
		try {
			await adjustStock.mutateAsync({ id: adjustingProduct.id, quantity: qty, operation: adjustOp });
			toast({ title: `✅ Stock ${adjustOp === 'add' ? 'added' : 'reduced'} by ${qty}` });
			setAdjustingProduct(null);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Stock update failed';
			toast({ title: '❌ Cannot update stock', description: msg, variant: 'destructive' });
		}
	};

	// Compute per-product sales from invoice items
	const salesMap = new Map<string, { units: number; revenue: number }>();
	for (const inv of allInvoices) {
		if (inv.status === 'cancelled') continue;
		for (const item of inv.items ?? []) {
			// Backend includes items via relation: item.product.name (not item.productName column)
			const name = item.product?.name ?? item.productName ?? 'Unknown';
			const existing = salesMap.get(name) ?? { units: 0, revenue: 0 };
			salesMap.set(name, {
				units: existing.units + item.quantity,
				revenue: existing.revenue + parseFloat(String(item.itemTotal ?? 0)),
			});
		}
	}

	// Low stock IDs set
	const lowStockIds = new Set(lowStock.map((p) => p.id));

	// Summary stats
	const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
	const totalValue = products.reduce((sum, p) => sum + parseFloat(String(p.price)) * p.stock, 0);

	// Filtered products for the main table
	const filteredProducts = products.filter((p) => {
		const matchesSearch =
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			(p.category ?? '').toLowerCase().includes(search.toLowerCase());
		const matchesCategory = category === 'All' || p.category === category;
		return matchesSearch && matchesCategory;
	});

	// Top selling: sorted by revenue from invoices (fallback: lowest stock first)
	const topSelling = [...products]
		.filter((p) => p.isActive)
		.sort((a, b) => {
			const aRev = salesMap.get(a.name)?.revenue ?? 0;
			const bRev = salesMap.get(b.name)?.revenue ?? 0;
			return bRev - aRev || a.stock - b.stock;
		})
		.slice(0, 5);

	// Slow moving: active products with no sales and high stock
	const slowMoving = [...products]
		.filter((p) => p.isActive && p.stock > 0)
		.sort((a, b) => {
			const aUnits = salesMap.get(a.name)?.units ?? 0;
			const bUnits = salesMap.get(b.name)?.units ?? 0;
			return aUnits - bUnits || b.stock - a.stock;
		})
		.slice(0, 5);

	// Recent stock movements from invoices
	const recentMovements = allInvoices
		.filter((inv) => inv.status !== 'cancelled')
		.slice(0, 10)
		.flatMap((inv) =>
			(inv.items ?? []).slice(0, 2).map((item) => ({
				time: new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
				product: item.productName ?? 'Unknown',
				qty: `-${item.quantity}`,
				type: 'Sale',
				ref: inv.invoiceNo,
				notes: inv.customer?.name ? `Sold to ${inv.customer.name}` : 'Sale',
			}))
		)
		.slice(0, 8);

	const handleAddProduct = () => setAddProductOpen(true);

	/** Called when BarcodeScanner finds a code in the Inventory add-product context */
	const handleInventoryBarcodeScan = async (code: string) => {
		setInventoryScannerOpen(false);
		setAddBarcode(code);
		// Try to look up an existing product with this barcode
		try {
			const res = await lookupByBarcode.mutateAsync(code);
			if (res?.product) {
				const p = res.product;
				setAddName(p.name);
				setAddPrice(String(parseFloat(String(p.price))));
				setAddUnit(p.unit || 'Piece');
				if (p.category) setAddCategory(p.category);
				if (p.sku) setAddSku(p.sku);
				toast({ title: `🔍 Found: ${p.name}`, description: 'Details pre-filled from existing product' });
			}
		} catch {
			// 404 = new product — that's fine, barcode is set, user fills the rest
			toast({ title: `🔷 Barcode: ${code}`, description: 'New product — fill in the details below' });
		}
	};

	const handleSubmitAddProduct = async (e: FormEvent) => {
		e.preventDefault();
		const price = parseFloat(addPrice);
		const stock = parseInt(addStock, 10);
		if (!addName.trim()) {
			toast({ title: '⚠️ Product name is required', variant: 'destructive' });
			return;
		}
		if (isNaN(price) || price <= 0) {
			toast({ title: '⚠️ Enter a valid price', variant: 'destructive' });
			return;
		}
		try {
			// Save as draft first — user reviews before final save
			const { draft } = await draftApi.create(
				'product',
				{
					name: addName.trim(),
					price,
					stock: isNaN(stock) ? 0 : stock,
					unit: addUnit || undefined,
					category: addCategory.trim() || undefined,
					barcode: addBarcode.trim() || undefined,
					sku: addSku.trim() || undefined,
				},
				`New product: ${addName.trim()}`
			);
			// Immediately refresh the draft panel badge
			queryClient.invalidateQueries({ queryKey: ['drafts'] });
			setPendingDraft(draft);
			resetAddProduct();
			setAddProductOpen(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to create draft';
			toast({ title: '❌ Could not create draft', description: msg, variant: 'destructive' });
		}
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" onClick={() => navigate('/')}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-lg font-bold">📦 Inventory Dashboard</h1>
					</div>
					<div className="flex gap-2">
						{/* Bulk Import via Photo — opens file picker, sends to AI OCR */}
						<Button
							size="sm"
							variant="outline"
							onClick={() => bulkImportFileRef.current?.click()}
							disabled={bulkUploading}
							title="Import multiple products from a photo or image"
						>
							{bulkUploading ? (
								<Loader2 className="mr-1 h-4 w-4 animate-spin" />
							) : (
								<ImagePlus className="mr-1 h-4 w-4" />
							)}
							Import
						</Button>
						<Button size="sm" onClick={handleAddProduct}>
							<Plus className="mr-1 h-4 w-4" /> Add Product
						</Button>
					</div>

					{/* Hidden file input — accept images only, no camera capture */}
					<input
						ref={bulkImportFileRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleBulkImportFile}
					/>
				</div>
			</header>

			<main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
				{/* Voice Search Center */}
				<Card className="border-none bg-primary/5 shadow-sm">
					<CardContent className="p-4">
						<p className="mb-1 text-sm font-semibold">🎤 Voice Search Center</p>
						<VoiceBar
							idleHint={
								<>
									<span className="font-medium text-foreground">"Search for rice"</span>
									{' · '}
									<span>"Show low stock"</span>
									{' · '}
									<span>"Find oil"</span>
								</>
							}
						/>
					</CardContent>
				</Card>

				{/* Replenishment Banner — AI stock advisor */}
				<ReplenishmentBanner />

				{/* Inventory Summary */}
				<div>
					<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						📊 Inventory Summary
					</h2>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						{[
							{
								label: 'Total Products',
								value: productsLoading ? '…' : String(products.length),
								sub: `${categories.length - 1} categories`,
								icon: Package,
								color: 'text-primary',
							},
							{
								label: 'Low Stock ⚠️',
								value: lowStockLoading ? '…' : String(lowStock.length),
								sub: 'Need reorder',
								icon: AlertTriangle,
								color: 'text-destructive',
							},
							{
								label: 'Out of Stock 🔴',
								value: String(products.filter((p) => p.stock === 0).length),
								sub: 'Needs urgent reorder',
								icon: TrendingDown,
								color: 'text-destructive',
							},
							{
								label: 'Total Value',
								value: formatCurrency(totalValue),
								sub: '',
								icon: TrendingUp,
								color: 'text-primary',
							},
						].map((s) => (
							<Card key={s.label} className="border-none shadow-sm">
								<CardContent className="p-4">
									<div className="flex items-start justify-between">
										<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
											{s.label}
										</p>
										<s.icon className={`h-4 w-4 ${s.color}`} />
									</div>
									<p className="mt-2 text-2xl font-bold">{s.value}</p>
									{s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Voice Quick Commands */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">🎤 Voice Quick Commands</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="flex flex-wrap gap-2">
							{voiceCommands.map((cmd) => (
								<Button
									key={cmd}
									size="sm"
									variant="outline"
									className="h-7 text-xs"
									onClick={() => {
										setSearch(cmd.replace(/^(Show |Find |Search |Check |Order |Update |Add )/, ''));
										wsClient.send('voice:final', { text: cmd });
										toast({ title: `🎤 "${cmd}"`, description: 'Voice command sent' });
									}}
								>
									"{cmd}"
								</Button>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Search Bar */}
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="🔍 Search products by name or voice..."
							className="pl-9"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<select
						className="rounded-md border border-input bg-background px-3 text-sm"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						{categories.map((c) => (
							<option key={c}>{c}</option>
						))}
					</select>
				</div>

				{/* Low Stock Alerts */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">
								⚠️ Low Stock Alerts ({lowStockLoading ? '…' : lowStock.length})
							</CardTitle>
							<Button
								size="sm"
								variant="outline"
								className="h-7 text-xs"
								onClick={() => toast({ title: 'All items ordered!' })}
							>
								Order All
							</Button>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-8">#</TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Current</TableHead>
										<TableHead>Min Stock</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Price</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{lowStockLoading ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
												Loading…
											</TableCell>
										</TableRow>
									) : lowStock.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
												✅ All items well stocked!
											</TableCell>
										</TableRow>
									) : (
										lowStock.map((item, i) => (
											<TableRow key={item.id}>
												<TableCell>{i + 1}</TableCell>
												<TableCell className="font-medium">📦 {item.name}</TableCell>
												<TableCell>
													{item.stock} {item.unit}{' '}
													{item.stock === 0 ? (
														<span className="text-destructive">🔴</span>
													) : (
														<span className="text-yellow-500">🟡</span>
													)}
												</TableCell>
												<TableCell className="text-muted-foreground">—</TableCell>
												<TableCell>{item.category}</TableCell>
												<TableCell>{formatCurrency(parseFloat(String(item.price)))}</TableCell>
												<TableCell className="text-right">
													<Button
														size="sm"
														className="h-7 text-xs"
														onClick={() =>
															toast({ title: `Order placed for ${item.name}` })
														}
													>
														Order
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Top Selling Products */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">🔥 Top Selling Products (This Month)</CardTitle>
							<Button size="sm" variant="ghost" className="h-7 text-xs">
								View All
							</Button>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-8">#</TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Units Sold</TableHead>
										<TableHead>Revenue</TableHead>
										<TableHead>Stock</TableHead>
										<TableHead>Reorder?</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topSelling.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
												No products found
											</TableCell>
										</TableRow>
									) : (
										topSelling.map((p, i) => {
											const sales = salesMap.get(p.name);
											const needsReorder = lowStockIds.has(p.id) || p.stock === 0;
											const stockLabel =
												p.stock === 0
													? `0 ${p.unit} 🔴`
													: p.stock <= 5
														? `${p.stock} ${p.unit} ⚠️`
														: `${p.stock} ${p.unit} ✅`;
											return (
												<TableRow key={p.id}>
													<TableCell>{i + 1}</TableCell>
													<TableCell className="font-medium">📦 {p.name}</TableCell>
													<TableCell>{sales?.units ?? 0}</TableCell>
													<TableCell>{formatCurrency(sales?.revenue ?? 0)}</TableCell>
													<TableCell>{stockLabel}</TableCell>
													<TableCell>
														{needsReorder ? (
															<Badge variant="destructive" className="text-[10px]">
																YES - URGENT
															</Badge>
														) : (
															'No'
														)}
													</TableCell>
													<TableCell className="text-right">
														<Button
															size="sm"
															variant={needsReorder ? 'default' : 'ghost'}
															className="h-7 text-xs"
														>
															{needsReorder ? (
																<>
																	<ShoppingCart className="mr-1 h-3 w-3" /> Order
																</>
															) : (
																<>
																	<Eye className="mr-1 h-3 w-3" /> View
																</>
															)}
														</Button>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Slow Moving Products */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">🐢 Slow Moving Products (Risk of Dead Stock)</CardTitle>
							<Button size="sm" variant="ghost" className="h-7 text-xs">
								View All
							</Button>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-8">#</TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Stock</TableHead>
										<TableHead>Units Sold</TableHead>
										<TableHead>Loss Risk</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{slowMoving.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
												No slow moving products
											</TableCell>
										</TableRow>
									) : (
										slowMoving.map((p, i) => {
											const sold = salesMap.get(p.name)?.units ?? 0;
											const risk = sold === 0 ? 'High' : sold < 5 ? 'Medium' : 'Low';
											return (
												<TableRow key={p.id}>
													<TableCell>{i + 1}</TableCell>
													<TableCell className="font-medium">📦 {p.name}</TableCell>
													<TableCell>
														{p.stock} {p.unit}
													</TableCell>
													<TableCell>{sold} units</TableCell>
													<TableCell>
														<Badge
															variant={
																risk === 'High'
																	? 'destructive'
																	: risk === 'Medium'
																		? 'secondary'
																		: 'outline'
															}
															className="text-[10px]"
														>
															{risk}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<Button size="sm" variant="outline" className="h-7 text-xs">
															{risk !== 'Low' ? 'Discount' : 'Promote'}
														</Button>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* All Products */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">📋 All Products ({filteredProducts.length})</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-10"></TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Stock</TableHead>
										<TableHead>Price</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Reorder?</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{productsLoading ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
												Loading…
											</TableCell>
										</TableRow>
									) : filteredProducts.length === 0 ? (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
												No products found
											</TableCell>
										</TableRow>
									) : (
										filteredProducts.map((p) => {
											const isLow = lowStockIds.has(p.id) || p.stock === 0;
											const isEditing = inlineEditId === p.id;
											return (
												<TableRow key={p.id}>
													<TableCell className="text-lg">📦</TableCell>
													<TableCell className="font-medium">{p.name}</TableCell>
													<TableCell>
														{isEditing ? (
															<div className="flex items-center gap-1">
																<input
																	type="number"
																	min="0"
																	value={inlineEditQty}
																	onChange={(e) => setInlineEditQty(e.target.value)}
																	onKeyDown={(e) => {
																		if (e.key === 'Enter') void saveInlineEdit(p);
																		if (e.key === 'Escape') setInlineEditId(null);
																	}}
																	autoFocus
																	className="w-16 rounded border border-primary bg-background px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
																/>
																<span className="text-xs text-muted-foreground">
																	{p.unit}
																</span>
																<button
																	onClick={() => void saveInlineEdit(p)}
																	disabled={inlineSaving}
																	className="rounded px-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
																	title="Save (Enter)"
																>
																	✓
																</button>
																<button
																	onClick={() => setInlineEditId(null)}
																	className="rounded px-1 text-xs text-muted-foreground hover:bg-muted"
																	title="Cancel (Esc)"
																>
																	✕
																</button>
															</div>
														) : (
															<button
																onClick={() => startInlineEdit(p)}
																className="group flex items-center gap-1 rounded px-1 hover:bg-muted"
																title="Click to edit stock"
															>
																<span
																	className={
																		isLow ? 'text-destructive font-semibold' : ''
																	}
																>
																	{p.stock} {p.unit}
																</span>
																{isLow ? (
																	<span className="text-destructive">🔴</span>
																) : (
																	<span>✅</span>
																)}
																<span className="invisible text-[10px] text-muted-foreground group-hover:visible">
																	✎
																</span>
															</button>
														)}
													</TableCell>
													<TableCell>
														{formatCurrency(parseFloat(String(p.price)))}/{p.unit}
													</TableCell>
													<TableCell>{p.category}</TableCell>
													<TableCell>
														{isLow ? (
															<Badge variant="destructive" className="text-[10px]">
																YES - URGENT
															</Badge>
														) : (
															'No'
														)}
													</TableCell>
													<TableCell className="text-right">
														<div className="flex justify-end gap-1">
															<Button
																size="sm"
																variant="ghost"
																className="h-7 text-xs"
																onClick={() => openEdit(p)}
															>
																<Edit className="mr-1 h-3 w-3" /> Edit
															</Button>
															<Button
																size="sm"
																variant="outline"
																className="h-7 text-xs"
																onClick={() => {
																	setAdjustingProduct(p);
																	setAdjustQty('1');
																	setAdjustOp('add');
																}}
															>
																<ShoppingCart className="mr-1 h-3 w-3" /> Stock
															</Button>
														</div>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
						<div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Button size="sm" variant="outline" className="h-7 text-xs" disabled>
								← Prev
							</Button>
							<span>
								Showing {filteredProducts.length} of {products.length} products
							</span>
							<Button size="sm" variant="outline" className="h-7 text-xs" disabled>
								Next →
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Recent Stock Movements */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">📦 Recent Stock Movements</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Time</TableHead>
										<TableHead>Product</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Reference</TableHead>
										<TableHead>Notes</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{recentMovements.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
												No movements yet
											</TableCell>
										</TableRow>
									) : (
										recentMovements.map((m, i) => (
											<TableRow key={i}>
												<TableCell className="text-xs text-muted-foreground">
													{m.time}
												</TableCell>
												<TableCell className="font-medium">{m.product}</TableCell>
												<TableCell className="text-destructive font-medium">{m.qty}</TableCell>
												<TableCell>
													<Badge variant="secondary" className="text-[10px]">
														{m.type}
													</Badge>
												</TableCell>
												<TableCell className="text-xs">{m.ref}</TableCell>
												<TableCell className="text-xs text-muted-foreground">
													{m.notes}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				{/* Footer voice hints */}
				<div className="rounded-lg border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
					🎤 Voice Commands: "Search for rice" · "Find oil" · "Show low stock" · "Check sugar" · "Where is
					basmati rice?" · "Show me all products"
				</div>

				<div className="h-4" />
			</main>

			{/* ── Edit Product Modal ──────────────────────────────────────────── */}
			{editingProduct && (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
					onClick={() => setEditingProduct(null)}
				>
					<div
						className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="mb-4 text-base font-bold">✏️ Edit Product</h2>
						<div className="space-y-3">
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">Name</label>
								<input
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">Price (₹)</label>
								<input
									type="number"
									min="0"
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={editPrice}
									onChange={(e) => setEditPrice(e.target.value)}
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">Category</label>
								<input
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={editCategory}
									onChange={(e) => setEditCategory(e.target.value)}
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">
									Min Stock Alert (units)
								</label>
								<input
									type="number"
									min="0"
									placeholder="e.g. 5"
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={editMinStock}
									onChange={(e) => setEditMinStock(e.target.value)}
								/>
								<p className="mt-0.5 text-[10px] text-muted-foreground">
									Alert when stock falls below this level
								</p>
							</div>
						</div>
						<div className="mt-4 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setEditingProduct(null)}>
								Cancel
							</Button>
							<Button className="flex-1" onClick={handleSaveEdit} disabled={updateProduct.isPending}>
								{updateProduct.isPending ? 'Saving…' : 'Save'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* ── Adjust Stock Modal ─────────────────────────────────────────── */}
			{adjustingProduct && (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
					onClick={() => setAdjustingProduct(null)}
				>
					<div
						className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="mb-1 text-base font-bold">📦 Adjust Stock</h2>
						<p className="mb-4 text-sm text-muted-foreground">
							{adjustingProduct.name} · Current: {adjustingProduct.stock} {adjustingProduct.unit}
						</p>
						<div className="space-y-3">
							<div className="flex gap-2">
								<button
									onClick={() => setAdjustOp('add')}
									className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === 'add' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
								>
									+ Add Stock
								</button>
								<button
									onClick={() => setAdjustOp('subtract')}
									className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${adjustOp === 'subtract' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border'}`}
								>
									- Remove Stock
								</button>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">Quantity</label>
								<input
									type="number"
									min="1"
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={adjustQty}
									onChange={(e) => setAdjustQty(e.target.value)}
								/>
							</div>
						</div>
						<div className="mt-4 flex gap-2">
							<Button variant="outline" className="flex-1" onClick={() => setAdjustingProduct(null)}>
								Cancel
							</Button>
							<Button
								className="flex-1"
								onClick={handleAdjustStock}
								disabled={adjustStock.isPending}
								variant={adjustOp === 'subtract' ? 'destructive' : 'default'}
							>
								{adjustStock.isPending
									? 'Saving…'
									: adjustOp === 'add'
										? `+ Add ${adjustQty}`
										: `- Remove ${adjustQty}`}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* ── Add Product Modal ──────────────────────────────────────────── */}
			{addProductOpen && (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
					onClick={() => {
						setAddProductOpen(false);
						resetAddProduct();
					}}
				>
					<div
						className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="mb-4 text-base font-bold">➕ Add New Product</h2>
						<form onSubmit={handleSubmitAddProduct} className="space-y-3">
							{/*
							 * Barcode row — SCAN ONLY.
							 * No photo capture / camera image upload here.
							 * Use the "Import" button in the header for bulk imports from photos.
							 */}
							<div className="flex items-center gap-2">
								<div className="flex-1">
									<label className="mb-1 block text-xs text-muted-foreground">Barcode / EAN</label>
									<input
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										placeholder="Scan or type barcode…"
										value={addBarcode}
										onChange={(e) => setAddBarcode(e.target.value)}
									/>
								</div>
								{/* Scan button — opens live barcode scanner (camera), NOT a photo picker */}
								<button
									type="button"
									onClick={() => setInventoryScannerOpen(true)}
									className="mt-5 flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
								>
									<ScanLine className="h-4 w-4" />
									Scan
								</button>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">Product Name *</label>
								<input
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									placeholder="e.g. Basmati Rice 1kg"
									value={addName}
									onChange={(e) => setAddName(e.target.value)}
									required
									autoFocus
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="mb-1 block text-xs text-muted-foreground">
										Selling Price (₹) *
									</label>
									<input
										type="number"
										min="0"
										step="0.01"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										placeholder="0.00"
										value={addPrice}
										onChange={(e) => setAddPrice(e.target.value)}
										required
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs text-muted-foreground">Opening Stock</label>
									<input
										type="number"
										min="0"
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										placeholder="0"
										value={addStock}
										onChange={(e) => setAddStock(e.target.value)}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="mb-1 block text-xs text-muted-foreground">Unit</label>
									<select
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										value={addUnit}
										onChange={(e) => setAddUnit(e.target.value)}
									>
										<option>Piece</option>
										<option>Kg</option>
										<option>Gram</option>
										<option>Litre</option>
										<option>ML</option>
										<option>Box</option>
										<option>Dozen</option>
										<option>Bag</option>
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs text-muted-foreground">Category</label>
									<input
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										placeholder="e.g. Grains"
										value={addCategory}
										onChange={(e) => setAddCategory(e.target.value)}
									/>
								</div>
							</div>
							<div>
								<label className="mb-1 block text-xs text-muted-foreground">SKU (optional)</label>
								<input
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									placeholder="e.g. SKU-001"
									value={addSku}
									onChange={(e) => setAddSku(e.target.value)}
								/>
							</div>
							<div className="mt-4 flex gap-2">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => {
										setAddProductOpen(false);
										resetAddProduct();
									}}
								>
									Cancel
								</Button>
								<Button type="submit" className="flex-1" disabled={createProduct.isPending}>
									{createProduct.isPending ? 'Adding…' : 'Add Product'}
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ── Barcode Scanner (inventory context) ───────────────────────── */}
			{inventoryScannerOpen && (
				<BarcodeScanner
					hint="Point camera at product barcode to auto-fill details"
					onScan={handleInventoryBarcodeScan}
					onClose={() => setInventoryScannerOpen(false)}
				/>
			)}

			{/* ── Bulk Product Import — OCR progress dialog ────────────────── */}
			<Dialog
				open={bulkOcrOpen}
				onOpenChange={(o) => {
					if (!o && bulkOcrJob?.status !== 'pending' && bulkOcrJob?.status !== 'processing') {
						setBulkOcrOpen(false);
						setBulkOcrJobId(null);
						setBulkOcrJob(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<ImagePlus className="h-5 w-5" />
							Bulk Product Import
						</DialogTitle>
					</DialogHeader>

					{/* Uploading / Processing */}
					{(!bulkOcrJob || bulkOcrJob.status === 'pending' || bulkOcrJob.status === 'processing') && (
						<div className="flex flex-col items-center gap-3 py-8">
							<Loader2 className="h-10 w-10 animate-spin text-primary" />
							<p className="text-sm text-muted-foreground">
								{bulkUploading ? 'Uploading image…' : 'AI is reading product details…'}
							</p>
							<p className="text-xs text-muted-foreground/60">This usually takes 5–20 seconds</p>
						</div>
					)}

					{/* Completed */}
					{bulkOcrJob?.status === 'completed' && (
						<div className="space-y-4 py-2">
							<div className="flex items-center gap-2 text-green-600">
								<CheckCircle className="h-6 w-6 flex-shrink-0" />
								<div>
									<p className="font-medium">Drafts created for review!</p>
									<p className="text-sm text-muted-foreground">
										{bulkOcrJob.productsCreated || (bulkOcrJob as any).parsedItems?.length || 0}{' '}
										product draft
										{(bulkOcrJob.productsCreated ||
											(bulkOcrJob as any).parsedItems?.length ||
											0) === 1
											? ''
											: 's'}{' '}
										waiting for your approval
									</p>
								</div>
							</div>
							<div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
								📋 Open the <strong>Drafts panel</strong> (top-right) to review and confirm each product
								before it's saved.
							</div>
							{/* Preview parsed items */}
							{Array.isArray((bulkOcrJob as any).parsedItems) &&
								(bulkOcrJob as any).parsedItems.length > 0 && (
									<div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
										{(
											(bulkOcrJob as any).parsedItems as Array<{
												name?: string;
												price?: number;
												category?: string;
											}>
										).map((item, idx) => (
											<div key={idx} className="flex items-center justify-between text-xs">
												<span className="truncate pr-2">{item.name ?? 'Product'}</span>
												{item.price != null && (
													<span className="shrink-0 text-muted-foreground">
														₹{item.price}
													</span>
												)}
											</div>
										))}
									</div>
								)}
						</div>
					)}

					{/* Failed */}
					{bulkOcrJob?.status === 'failed' && (
						<div className="flex items-start gap-2 py-4 text-destructive">
							<XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
							<div>
								<p className="font-medium">Import failed</p>
								<p className="text-sm">
									{bulkOcrJob.errorMessage ?? 'Could not extract products from the image'}
								</p>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setBulkOcrOpen(false);
								setBulkOcrJobId(null);
								setBulkOcrJob(null);
							}}
						>
							Close
						</Button>
						{bulkOcrJob?.status === 'failed' && (
							<Button
								onClick={() => {
									setBulkOcrOpen(false);
									setBulkOcrJob(null);
									setBulkOcrJobId(null);
									setTimeout(() => bulkImportFileRef.current?.click(), 100);
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
};

export default Inventory;

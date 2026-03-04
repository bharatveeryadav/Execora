import { useState } from 'react';
import { ArrowLeft, Save, Search, Plus, X, CheckCircle2, MessageCircle } from 'lucide-react';
import VoiceBar from '@/components/VoiceBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useCustomers, useInvoices, useRecordPayment, useCustomerInvoices } from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { formatCurrency, type Customer } from '@/lib/api';
import { fireConfetti } from '@/components/ConfettiOverlay';

const paymentMethods = [
	{ id: 'cash', label: 'Cash', icon: '💵' },
	{ id: 'upi', label: 'UPI', icon: '📱' },
	{ id: 'card', label: 'Card', icon: '💳' },
	{ id: 'bank', label: 'Bank', icon: '🏦' },
];

const Payment = () => {
	const navigate = useNavigate();
	const [method, setMethod] = useState('cash');
	const [amount, setAmount] = useState('500');
	const [applyTo, setApplyTo] = useState('specific');
	const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
	const [reference, setReference] = useState('');
	const [notes, setNotes] = useState('');

	// Split payment
	const [splitMode, setSplitMode] = useState(false);
	const [splits, setSplits] = useState<Array<{ method: string; amount: string }>>([
		{ method: 'cash', amount: '' },
		{ method: 'upi', amount: '' },
	]);

	const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);

	// Post-payment receipt dialog
	const [receiptDialog, setReceiptDialog] = useState<{ amount: number; customer: Customer } | null>(null);

	// Customer search
	const [customerSearch, setCustomerSearch] = useState('');
	const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
	const [showCustomerList, setShowCustomerList] = useState(false);

	const { data: customers = [] } = useCustomers(customerSearch, 10);
	const { data: allInvoices = [] } = useInvoices(100);
	const { data: recentCustomerInvoices = [] } = useCustomerInvoices(selectedCustomer?.id ?? '', 5);
	const recordPayment = useRecordPayment();
	useWsInvalidation(['customers', 'invoices', 'summary']);

	// Filter invoices for selected customer (non-paid/non-cancelled)
	const customerInvoices = selectedCustomer
		? allInvoices.filter(
				(inv) => inv.customerId === selectedCustomer.id && inv.status !== 'paid' && inv.status !== 'cancelled'
			)
		: [];

	const previousBalance = selectedCustomer ? parseFloat(String(selectedCustomer.balance)) : 0;
	const paymentAmount = parseFloat(amount) || 0;
	const newBalance = previousBalance - paymentAmount;

	const toggleInvoice = (id: string) => {
		setSelectedInvoiceIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const handleSelectCustomer = (c: Customer) => {
		setSelectedCustomer(c);
		setCustomerSearch(c.name);
		setShowCustomerList(false);
		setSelectedInvoiceIds([]);
	};

	const handleRecord = async () => {
		if (!selectedCustomer) {
			toast({ title: '⚠️ Please select a customer', variant: 'destructive' });
			return;
		}
		if (paymentAmount <= 0) {
			toast({ title: '⚠️ Enter a valid amount', variant: 'destructive' });
			return;
		}
		try {
			if (splitMode) {
				const activeSplits = splits.filter((sp) => parseFloat(sp.amount) > 0);
				if (activeSplits.length === 0) {
					toast({ title: '⚠️ Enter at least one split amount', variant: 'destructive' });
					return;
				}
				for (const sp of activeSplits) {
					await recordPayment.mutateAsync({
						customerId: selectedCustomer.id,
						amount: parseFloat(sp.amount),
						paymentMode: sp.method,
						notes: notes || undefined,
					});
				}
				toast({
					title: '✅ Split Payment Recorded',
					description: `${formatCurrency(splitTotal)} from ${selectedCustomer.name} (${activeSplits.length} methods).`,
				});
			} else {
				await recordPayment.mutateAsync({
					customerId: selectedCustomer.id,
					amount: paymentAmount,
					paymentMode: method,
					notes: notes || undefined,
				});
				toast({
					title: '✅ Payment Recorded',
					description: `${formatCurrency(paymentAmount)} received from ${selectedCustomer.name} via ${method}.`,
				});
			}
			fireConfetti();
			setReceiptDialog({ amount: splitMode ? splitTotal : paymentAmount, customer: selectedCustomer! });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to record payment';
			toast({ title: '❌ Error', description: msg, variant: 'destructive' });
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b bg-card px-4 py-3 md:px-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" onClick={() => navigate('/')}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-lg font-bold tracking-tight md:text-xl">💰 Record Payment</h1>
					</div>
					<Button size="sm" onClick={handleRecord} disabled={recordPayment.isPending}>
						<Save className="mr-1.5 h-4 w-4" /> {recordPayment.isPending ? 'Saving...' : 'Save'}
					</Button>
				</div>

				<VoiceBar
					idleHint={
						<>
							<span className="font-medium text-foreground">"Ramesh ne 500 diye"</span>
							{' · '}
							<span>"Customer ka payment"</span>
							{' · '}
							<span>"500 cash liya"</span>
						</>
					}
				/>
			</header>

			<main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
				{/* Customer */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">👤 Customer</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="relative flex gap-2">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search customer..."
									className="pl-9"
									value={customerSearch}
									onChange={(e) => {
										setCustomerSearch(e.target.value);
										setShowCustomerList(true);
										if (!e.target.value) setSelectedCustomer(null);
									}}
									onFocus={() => setShowCustomerList(true)}
									onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
								/>
							</div>
							<Button variant="outline" size="icon">
								<Plus className="h-4 w-4" />
							</Button>
							{showCustomerList && customers.length > 0 && (
								<div className="absolute top-full left-0 right-10 z-50 mt-1 rounded-lg border bg-card shadow-lg">
									{customers.map((c) => (
										<button
											key={c.id}
											className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
											onMouseDown={() => handleSelectCustomer(c)}
										>
											<span className="font-medium">{c.name}</span>
											{parseFloat(String(c.balance)) > 0 && (
												<span className="text-xs text-destructive">
													{formatCurrency(parseFloat(String(c.balance)))}
												</span>
											)}
										</button>
									))}
								</div>
							)}
						</div>
						{selectedCustomer && (
							<div className="rounded-lg border border-border p-3 space-y-2">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">
											{selectedCustomer.name}
											{selectedCustomer.phone ? ` · 📞 ${selectedCustomer.phone}` : ''}
										</p>
										<p className="text-xs text-muted-foreground">
											Current Balance:{' '}
											<span
												className={`font-semibold ${previousBalance > 0 ? 'text-destructive' : 'text-success'}`}
											>
												{formatCurrency(previousBalance)}
											</span>
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs"
										onClick={() => {
											setSelectedCustomer(null);
											setCustomerSearch('');
										}}
									>
										<X className="h-3 w-3 mr-1" /> Change
									</Button>
								</div>
								{/* Mini payment history */}
								{recentCustomerInvoices.length > 0 && (
									<div className="border-t pt-2 space-y-1">
										<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
											Recent Invoices
										</p>
										{recentCustomerInvoices.slice(0, 3).map((inv) => (
											<div key={inv.id} className="flex items-center justify-between text-xs">
												<span className="text-muted-foreground">{inv.invoiceNo}</span>
												<span className="font-medium">
													{formatCurrency(parseFloat(String(inv.total ?? inv.subtotal)))}
												</span>
												<span
													className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
														inv.status === 'paid'
															? 'bg-green-500/10 text-green-600 dark:text-green-400'
															: inv.status === 'cancelled'
																? 'bg-muted text-muted-foreground'
																: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
													}`}
												>
													{inv.status === 'paid'
														? '✅ Paid'
														: inv.status === 'cancelled'
															? '❌ Void'
															: '⏳ Due'}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Payment Details */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">💵 Payment Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						{/* Amount */}
						<div className="space-y-1.5">
							<Label className="text-xs">Amount *</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
									₹
								</span>
								<Input
									type="number"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="pl-7 text-lg font-semibold"
								/>
							</div>
							{/* Quick amount presets */}
							<div className="flex flex-wrap gap-1.5 pt-0.5">
								{['100', '500', '1000', '2000', '5000'].map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => setAmount(p)}
										className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
											amount === p
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border bg-muted text-muted-foreground hover:border-primary/60 hover:text-foreground'
										}`}
									>
										₹{Number(p).toLocaleString('en-IN')}
									</button>
								))}
								{previousBalance > 0 && (
									<button
										type="button"
										onClick={() => setAmount(String(previousBalance))}
										className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
											amount === String(previousBalance)
												? 'border-destructive bg-destructive text-destructive-foreground'
												: 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
										}`}
									>
										₹{previousBalance.toLocaleString('en-IN')} (Full)
									</button>
								)}
							</div>
						</div>

						{/* Payment Method */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<Label className="text-xs">Payment Method *</Label>
								<button
									onClick={() => setSplitMode((v) => !v)}
									className={`text-xs font-medium underline-offset-2 ${
										splitMode ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
									}`}
								>
									{splitMode ? '✕ Single method' : '＋ Split payment'}
								</button>
							</div>

							{!splitMode ? (
								<div className="grid grid-cols-4 gap-2">
									{paymentMethods.map((pm) => (
										<button
											key={pm.id}
											onClick={() => setMethod(pm.id)}
											className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
												method === pm.id
													? 'border-primary bg-primary/10 text-primary'
													: 'border-border bg-card hover:bg-accent'
											}`}
										>
											<span className="text-lg">{pm.icon}</span>
											<span className="text-xs font-medium">{pm.label}</span>
											{method === pm.id && <span className="text-[10px]">✓ Selected</span>}
										</button>
									))}
								</div>
							) : (
								<div className="space-y-2">
									{splits.map((sp, idx) => (
										<div key={idx} className="flex items-center gap-2">
											<select
												value={sp.method}
												onChange={(e) =>
													setSplits((prev) =>
														prev.map((s, i) =>
															i === idx ? { ...s, method: e.target.value } : s
														)
													)
												}
												className="rounded-md border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
											>
												{paymentMethods.map((pm) => (
													<option key={pm.id} value={pm.id}>
														{pm.icon} {pm.label}
													</option>
												))}
											</select>
											<Input
												type="number"
												min={0}
												step="any"
												placeholder="Amount"
												value={sp.amount}
												onChange={(e) =>
													setSplits((prev) =>
														prev.map((s, i) =>
															i === idx ? { ...s, amount: e.target.value } : s
														)
													)
												}
												className="flex-1"
											/>
											{splits.length > 2 && (
												<button
													onClick={() =>
														setSplits((prev) => prev.filter((_, i) => i !== idx))
													}
													className="text-destructive hover:opacity-80"
												>
													<X className="h-4 w-4" />
												</button>
											)}
										</div>
									))}
									<button
										onClick={() => setSplits((prev) => [...prev, { method: 'cash', amount: '' }])}
										className="flex items-center gap-1 text-xs text-primary hover:underline"
									>
										<Plus className="h-3 w-3" /> Add split
									</button>
									<p className="text-right text-xs text-muted-foreground">
										Total:{' '}
										<span
											className={
												splitTotal !== paymentAmount
													? 'text-destructive font-medium'
													: 'text-green-600 font-medium'
											}
										>
											{formatCurrency(splitTotal)}
										</span>
										{' / '}
										{formatCurrency(paymentAmount)}
									</p>
								</div>
							)}
						</div>

						{/* Reference */}
						<div className="space-y-1.5">
							<Label className="text-xs">Reference/Transaction ID (Optional)</Label>
							<Input
								placeholder="UPI1234567890"
								value={reference}
								onChange={(e) => setReference(e.target.value)}
							/>
						</div>

						{/* Apply To */}
						<div className="space-y-3">
							<Label className="text-xs">Apply To</Label>
							<RadioGroup value={applyTo} onValueChange={setApplyTo} className="space-y-2">
								<div className="flex items-start gap-2">
									<RadioGroupItem value="oldest" id="oldest" className="mt-0.5" />
									<Label htmlFor="oldest" className="text-sm font-normal leading-snug">
										Oldest invoice first
									</Label>
								</div>
								<div className="flex items-start gap-2">
									<RadioGroupItem value="specific" id="specific" className="mt-0.5" />
									<Label htmlFor="specific" className="text-sm font-normal">
										Specific invoice(s)
									</Label>
								</div>
								<div className="flex items-start gap-2">
									<RadioGroupItem value="balance" id="balance" className="mt-0.5" />
									<Label htmlFor="balance" className="text-sm font-normal">
										Against balance (reduce total due)
									</Label>
								</div>
							</RadioGroup>
						</div>

						{/* Select Invoices */}
						{applyTo === 'specific' && (
							<div className="space-y-2">
								<Label className="text-xs">Select Invoices:</Label>
								<div className="space-y-2 rounded-lg border border-border p-3">
									{customerInvoices.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											{selectedCustomer ? 'No outstanding invoices' : 'Select a customer first'}
										</p>
									) : (
										customerInvoices.map((inv) => (
											<div key={inv.id} className="flex items-start gap-2">
												<Checkbox
													checked={selectedInvoiceIds.includes(inv.id)}
													onCheckedChange={() => toggleInvoice(inv.id)}
													className="mt-0.5"
												/>
												<span
													className={`text-sm ${inv.status === 'pending' || inv.status === 'partial' ? 'text-destructive' : 'text-foreground'}`}
												>
													{inv.invoiceNo} ·{' '}
													{new Date(inv.createdAt).toLocaleDateString('en-IN', {
														day: '2-digit',
														month: 'short',
														year: 'numeric',
													})}{' '}
													· {formatCurrency(parseFloat(String(inv.total)))} · {inv.status}
												</span>
											</div>
										))
									)}
								</div>
							</div>
						)}

						{/* Notes */}
						<div className="space-y-1.5">
							<Label className="text-xs">Notes (Optional)</Label>
							<Textarea
								placeholder="Cash diya shop par aake"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={2}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Summary */}
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">💰 Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Previous Balance:</span>
							<span className="font-medium">{formatCurrency(previousBalance)}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Payment Amount:</span>
							<span className="font-medium text-primary">-{formatCurrency(paymentAmount)}</span>
						</div>
						<Separator />
						<div className="flex justify-between text-sm font-semibold">
							<span>New Balance:</span>
							<span className={newBalance > 0 ? 'text-destructive' : 'text-success'}>
								{formatCurrency(Math.max(0, newBalance))}
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Bottom Actions */}
				<div className="flex items-center justify-between pb-6">
					<Button variant="outline" onClick={() => navigate('/')}>
						❌ Cancel
					</Button>
					<Button onClick={handleRecord} disabled={recordPayment.isPending}>
						{recordPayment.isPending ? 'Recording...' : '✅ Record Payment & Send Receipt'}
					</Button>
				</div>
			</main>

			{/* ── Post-payment Receipt Dialog ─────────────────────────────── */}
			{receiptDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
						<div className="mb-4 flex flex-col items-center gap-2 text-center">
							<CheckCircle2 className="h-12 w-12 text-green-500" />
							<h2 className="text-lg font-bold">Payment Recorded!</h2>
							<p className="text-sm text-muted-foreground">
								{formatCurrency(receiptDialog.amount)} received from{' '}
								<span className="font-semibold text-foreground">{receiptDialog.customer.name}</span>
							</p>
							{receiptDialog.customer.phone && (
								<p className="text-xs text-muted-foreground">
									New balance:{' '}
									<span
										className={
											newBalance <= 0 ? 'font-bold text-green-600' : 'font-bold text-orange-600'
										}
									>
										{newBalance <= 0 ? 'Cleared ✅' : formatCurrency(newBalance) + ' pending'}
									</span>
								</p>
							)}
						</div>

						<div className="space-y-2">
							{receiptDialog.customer.phone && (
								<a
									href={`https://wa.me/91${receiptDialog.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
										`Hi ${receiptDialog.customer.name}, we received your payment of ₹${receiptDialog.amount.toLocaleString('en-IN')}. Thank you! 🙏`
									)}`}
									target="_blank"
									rel="noreferrer"
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1ebe5d] transition-colors"
								>
									<MessageCircle className="h-4 w-4" />
									Send Receipt via WhatsApp
								</a>
							)}
							<Button
								variant="outline"
								className="w-full"
								onClick={() => {
									setReceiptDialog(null);
									navigate('/');
								}}
							>
								Done
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Payment;

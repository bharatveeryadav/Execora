import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	ArrowLeft,
	Phone,
	MessageCircle,
	Clock,
	FileText,
	CreditCard,
	TrendingUp,
	PencilLine,
	Bell,
	Plus,
	Receipt,
	Trash2,
	RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
	useCustomer,
	useCustomerInvoices,
	useCustomerLedger,
	useReminders,
	useUpdateCustomer,
	useCommPrefs,
	useUpdateCommPrefs,
	useCreateReminder,
	useDeleteCustomer,
} from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { LedgerEntry, Customer, invoiceApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';
import InvoiceCreation from '@/components/InvoiceCreation';

const STATUS_STYLES: Record<string, string> = {
	paid: 'bg-green-500/10 text-green-700 dark:text-green-400',
	pending: 'bg-blue-500/10  text-blue-700  dark:text-blue-400',
	partial: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
	draft: 'bg-muted         text-muted-foreground',
	proforma: 'bg-muted         text-muted-foreground',
	cancelled: 'bg-destructive/10 text-destructive opacity-60',
};

const TABS = ['Overview', 'Invoices', 'Ledger', 'Reminders'] as const;
type Tab = (typeof TABS)[number];

const CustomerDetail = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const [tab, setTab] = useState<Tab>('Overview');
	const [editOpen, setEditOpen] = useState(false);
	const [editName, setEditName] = useState('');
	const [editPhone, setEditPhone] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editNickname, setEditNickname] = useState('');
	const [editLandmark, setEditLandmark] = useState('');
	const [editCreditLimit, setEditCreditLimit] = useState('');
	const [editTags, setEditTags] = useState<string[]>([]);

	// Notes in edit dialog
	const [editNotes, setEditNotes] = useState('');

	// Delete confirm
	const [deleteConfirm, setDeleteConfirm] = useState(false);

	// Invoice creation (new bill + repeat last order)
	const [invoiceOpen, setInvoiceOpen] = useState(false);
	const [repeatItems, setRepeatItems] = useState<
		Array<{ name: string; qty: string; price: number; discount: number; total: number }>
	>([]);
	const [repeatLoading, setRepeatLoading] = useState<string | null>(null);

	// Reminder dialog state
	const [reminderOpen, setReminderOpen] = useState(false);
	const [remAmount, setRemAmount] = useState('');
	const [remDate, setRemDate] = useState('');
	const [remMessage, setRemMessage] = useState('');

	// Notification prefs state
	const [prefsOpen, setPrefsOpen] = useState(false);
	const [pWaEnabled, setPWaEnabled] = useState(true);
	const [pWaNumber, setPWaNumber] = useState('');
	const [pEmailEnabled, setPEmailEnabled] = useState(false);
	const [pEmailAddress, setPEmailAddress] = useState('');
	const [pSmsEnabled, setPSmsEnabled] = useState(false);
	const [pLang, setPLang] = useState('hi');

	const CUSTOMER_TAGS = ['VIP', 'Wholesale', 'Blacklist', 'Regular'] as const;

	const { data: customer, isLoading } = useCustomer(id!);
	const { data: invoices = [] } = useCustomerInvoices(id!);
	useWsInvalidation(['customers', 'invoices', 'ledger']);
	const { data: ledger = [] } = useCustomerLedger(id!) as { data: LedgerEntry[] };
	const { data: allReminders = [] } = useReminders(id);
	const updateCustomer = useUpdateCustomer();
	const createReminder = useCreateReminder();
	const deleteCustomer = useDeleteCustomer();
	const { data: commPrefs } = useCommPrefs(id!);
	const updateCommPrefs = useUpdateCommPrefs();

	function openEdit() {
		if (!customer) return;
		setEditName(customer.name ?? '');
		setEditPhone(customer.phone ?? '');
		setEditEmail(customer.email ?? '');
		setEditNickname(Array.isArray(customer.nickname) ? (customer.nickname[0] ?? '') : (customer.nickname ?? ''));
		setEditLandmark(customer.landmark ?? '');
		setEditCreditLimit(String(customer.creditLimit ?? ''));
		setEditTags(customer.tags ?? []);
		setEditNotes(customer.notes ?? '');
		setDeleteConfirm(false);
		setEditOpen(true);
	}

	function handleSave() {
		updateCustomer.mutate(
			{
				id: id!,
				name: editName,
				phone: editPhone,
				email: editEmail,
				nickname: editNickname,
				landmark: editLandmark,
				creditLimit: editCreditLimit ? Number(editCreditLimit) : undefined,
				tags: editTags.length ? editTags : undefined,
				notes: editNotes || undefined,
			},
			{
				onSuccess: () => {
					toast({ title: 'Customer updated' });
					setEditOpen(false);
				},
				onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
			}
		);
	}

	function openPrefs() {
		setPWaEnabled(commPrefs?.whatsappEnabled ?? true);
		setPWaNumber(commPrefs?.whatsappNumber ?? customer?.phone ?? '');
		setPEmailEnabled(commPrefs?.emailEnabled ?? false);
		setPEmailAddress(commPrefs?.emailAddress ?? customer?.email ?? '');
		setPSmsEnabled(commPrefs?.smsEnabled ?? false);
		setPLang(commPrefs?.preferredLanguage ?? 'hi');
		setPrefsOpen(true);
	}

	function handleSavePrefs() {
		updateCommPrefs.mutate(
			{
				customerId: id!,
				whatsappEnabled: pWaEnabled,
				whatsappNumber: pWaNumber || undefined,
				emailEnabled: pEmailEnabled,
				emailAddress: pEmailAddress || undefined,
				smsEnabled: pSmsEnabled,
				preferredLanguage: pLang,
			},
			{
				onSuccess: () => {
					toast({ title: 'Notification preferences saved' });
					setPrefsOpen(false);
				},
				onError: () => toast({ title: 'Save failed', variant: 'destructive' }),
			}
		);
	}

	const balance = parseFloat(String(customer?.balance ?? 0));
	const totalBilled = invoices.reduce((s, inv) => s + parseFloat(String(inv.total ?? 0)), 0);
	const paidInvoices = invoices.filter((i) => i.status === 'paid').length;

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!customer) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">Customer not found</p>
				<Button onClick={() => navigate('/customers')}>← Back to Customers</Button>
			</div>
		);
	}

	return (
		<>
			<div className="min-h-screen bg-background pb-20 md:pb-0">
				{/* Header */}
				<header className="sticky top-0 z-20 border-b bg-card">
					<div className="mx-auto max-w-3xl px-4 py-3">
						<div className="flex items-center gap-3">
							<Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							{/* Avatar */}
							<div
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
									balance > 0
										? 'bg-destructive/10 text-destructive'
										: 'bg-green-500/10 text-green-700 dark:text-green-400'
								}`}
							>
								{customer.name?.charAt(0)?.toUpperCase() ?? '?'}
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="truncate text-base font-bold">{customer.name}</h1>
								<p className="text-xs text-muted-foreground">{customer.phone ?? 'No phone'}</p>
							</div>
							{/* Actions */}
							<div className="flex gap-1">
								{customer.phone && (
									<Button variant="ghost" size="icon" asChild title="WhatsApp">
										<a
											href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
											target="_blank"
											rel="noreferrer"
										>
											<MessageCircle className="h-5 w-5 text-green-600" />
										</a>
									</Button>
								)}
								{customer.phone && (
									<Button variant="ghost" size="icon" asChild title="Call">
										<a href={`tel:${customer.phone}`}>
											<Phone className="h-5 w-5" />
										</a>
									</Button>
								)}
								<Button
									variant="ghost"
									size="icon"
									title="New Invoice"
									onClick={() => navigate(`/invoice/new?customerId=${customer.id}`)}
								>
									<Receipt className="h-5 w-5 text-primary" />
								</Button>
								<Button variant="ghost" size="icon" title="Edit customer" onClick={openEdit}>
									<PencilLine className="h-5 w-5" />
								</Button>
							</div>
						</div>

						{/* Tabs */}
						<div className="mt-3 flex gap-0 border-t">
							{TABS.map((t) => (
								<button
									key={t}
									onClick={() => setTab(t)}
									className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
										tab === t
											? 'border-primary text-primary'
											: 'border-transparent text-muted-foreground hover:text-foreground'
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				</header>

				<main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
					{/* ── OVERVIEW ── */}
					{tab === 'Overview' && (
						<>
							{/* Outstanding balance hero */}
							<div
								className={`rounded-xl p-5 text-center ${
									balance > 0
										? 'border border-destructive/30 bg-destructive/5'
										: 'border border-green-400/30 bg-green-500/5'
								}`}
							>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Outstanding Balance
								</p>
								<p
									className={`mt-1 text-3xl font-extrabold ${balance > 0 ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}
								>
									{formatCurrency(balance)}
								</p>
								{balance > 0 && (
									<Button
										size="sm"
										className="mt-3"
										onClick={() => navigate(`/payment?customerId=${customer.id}`)}
									>
										💰 Record Payment
									</Button>
								)}
							</div>

							{/* Stats row */}
							<div className="grid grid-cols-3 gap-3">
								<div className="rounded-xl border bg-card p-3 text-center">
									<TrendingUp className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
									<p className="text-lg font-bold">{formatCurrency(totalBilled)}</p>
									<p className="text-xs text-muted-foreground">Total Billed</p>
								</div>
								<div className="rounded-xl border bg-card p-3 text-center">
									<FileText className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
									<p className="text-lg font-bold">{invoices.length}</p>
									<p className="text-xs text-muted-foreground">Invoices</p>
								</div>
								<div className="rounded-xl border bg-card p-3 text-center">
									<CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
									<p className="text-lg font-bold">{paidInvoices}</p>
									<p className="text-xs text-muted-foreground">Paid</p>
								</div>
							</div>

							{/* Credit limit + tags */}
							{(Number(customer.creditLimit) > 0 || (customer.tags ?? []).length > 0) && (
								<div className="rounded-xl border bg-card p-4 space-y-2">
									{Number(customer.creditLimit) > 0 && (
										<div className="flex items-center justify-between">
											<span className="text-xs text-muted-foreground">Credit Limit</span>
											<div className="flex items-center gap-1.5">
												<span className="text-sm font-semibold">
													{formatCurrency(customer.creditLimit)}
												</span>
												{balance >= Number(customer.creditLimit) && (
													<span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
														⚠️ Limit reached
													</span>
												)}
											</div>
										</div>
									)}
									{(customer.tags ?? []).length > 0 && (
										<div className="flex flex-wrap gap-1">
											{(customer.tags ?? []).map((tag) => (
												<span
													key={tag}
													className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
														tag === 'Blacklist'
															? 'border-destructive/40 text-destructive bg-destructive/10'
															: tag === 'VIP'
																? 'border-yellow-400/40 text-yellow-700 bg-yellow-400/10'
																: 'border-border text-muted-foreground bg-muted'
													}`}
												>
													{tag}
												</span>
											))}
										</div>
									)}
								</div>
							)}

							{/* Contact details */}
							<div className="rounded-xl border bg-card p-4 space-y-2">
								<p className="text-xs font-semibold uppercase text-muted-foreground">Contact Info</p>
								{customer.phone && <p className="text-sm">📞 {customer.phone}</p>}
								{customer.email && <p className="text-sm">✉️ {customer.email}</p>}
								{customer.landmark && <p className="text-sm">📍 {customer.landmark}</p>}
								{customer.gstin && <p className="text-sm font-mono text-xs">GST: {customer.gstin}</p>}
								{customer.notes && (
									<div className="mt-1 rounded-lg border bg-muted/40 px-3 py-2">
										<p className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">
											Notes
										</p>
										<p className="text-[13px] text-foreground/80 whitespace-pre-line">
											{customer.notes}
										</p>
									</div>
								)}
							</div>

							{/* Notification Preferences */}
							<div className="rounded-xl border bg-card p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Bell className="h-4 w-4 text-muted-foreground" />
										<p className="text-xs font-semibold uppercase text-muted-foreground">
											Notification Channels
										</p>
									</div>
									<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openPrefs}>
										Edit
									</Button>
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm">WhatsApp</span>
										<span
											className={`text-xs font-medium ${(commPrefs?.whatsappEnabled ?? true) ? 'text-green-600' : 'text-muted-foreground'}`}
										>
											{(commPrefs?.whatsappEnabled ?? true) ? '✓ On' : 'Off'}
											{commPrefs?.whatsappNumber ? ` · ${commPrefs.whatsappNumber}` : ''}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Email</span>
										<span
											className={`text-xs font-medium ${commPrefs?.emailEnabled ? 'text-green-600' : 'text-muted-foreground'}`}
										>
											{commPrefs?.emailEnabled ? '✓ On' : 'Off'}
											{commPrefs?.emailAddress ? ` · ${commPrefs.emailAddress}` : ''}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">SMS</span>
										<span
											className={`text-xs font-medium ${commPrefs?.smsEnabled ? 'text-green-600' : 'text-muted-foreground'}`}
										>
											{commPrefs?.smsEnabled ? '✓ On' : 'Off'}
										</span>
									</div>
									{!commPrefs && (
										<p className="text-[11px] text-muted-foreground italic">
											No preferences set — using defaults
										</p>
									)}
								</div>
							</div>
						</>
					)}

					{/* ── INVOICES ── */}
					{tab === 'Invoices' && (
						<div className="space-y-3">
							{/* Repeat last order — one tap to pre-fill items from most recent invoice */}
							{invoices.length > 0 && (
								<Button
									variant="outline"
									size="sm"
									className="w-full gap-1.5"
									disabled={!!repeatLoading}
									onClick={async () => {
										const last = invoices[0];
										setRepeatLoading(last.id);
										try {
											const { invoice } = await invoiceApi.getById(last.id);
											const preItems = (invoice.items ?? [])
												.map((it) => ({
													name: it.product?.name ?? it.productName ?? '',
													qty: String(it.quantity),
													price: parseFloat(String(it.unitPrice ?? 0)),
													discount: 0,
													total: parseFloat(String(it.itemTotal ?? 0)),
												}))
												.filter((it) => it.name);
											setRepeatItems(preItems);
										} catch {
											setRepeatItems([]);
										} finally {
											setRepeatLoading(null);
										}
										setInvoiceOpen(true);
									}}
								>
									<RefreshCw className="h-3.5 w-3.5" />
									{repeatLoading ? 'Loading last order…' : 'Repeat Last Order'}
								</Button>
							)}
							<div className="overflow-hidden rounded-xl border bg-card">
								{invoices.length === 0 ? (
									<div className="py-10 text-center text-sm text-muted-foreground">
										No invoices yet
									</div>
								) : (
									<div className="divide-y">
										{invoices.map((inv) => (
											<div
												key={inv.id}
												className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
												onClick={() => navigate(`/invoices/${inv.id}`)}
											>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium">{inv.invoiceNo}</p>
													<p className="text-xs text-muted-foreground">
														{formatDate(inv.createdAt)}
													</p>
												</div>
												<span
													className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[inv.status] ?? ''}`}
												>
													{inv.status}
												</span>
												<p className="shrink-0 text-sm font-semibold">
													{formatCurrency(parseFloat(String(inv.total ?? 0)))}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── LEDGER ── */}
					{tab === 'Ledger' && (
						<div className="overflow-hidden rounded-xl border bg-card">
							{ledger.length === 0 ? (
								<div className="py-10 text-center text-sm text-muted-foreground">No ledger entries</div>
							) : (
								<div className="divide-y">
									{ledger.map((entry, i) => {
										const isCharge = entry.type === 'invoice';
										return (
											<div key={entry.id ?? i} className="flex items-center gap-3 px-4 py-2.5">
												<div className="min-w-0 flex-1">
													<p className="text-sm capitalize">
														{entry.description ?? entry.type ?? 'Transaction'}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatDate(entry.createdAt)}
													</p>
												</div>
												<p
													className={`shrink-0 text-sm font-semibold ${isCharge ? 'text-destructive' : 'text-green-600'}`}
												>
													{isCharge ? '+' : '-'}
													{formatCurrency(parseFloat(String(entry.amount ?? 0)))}
												</p>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}

					{/* ── REMINDERS ── */}
					{tab === 'Reminders' && (
						<>
							<div className="flex items-center justify-between">
								<p className="text-xs font-semibold uppercase text-muted-foreground">
									{allReminders.length} reminder{allReminders.length !== 1 ? 's' : ''}
								</p>
								<Button
									size="sm"
									className="gap-1.5"
									onClick={() => {
										setRemAmount('');
										setRemDate('');
										setRemMessage('');
										setReminderOpen(true);
									}}
								>
									<Plus className="h-4 w-4" />
									Set Reminder
								</Button>
							</div>

							<div className="overflow-hidden rounded-xl border bg-card">
								{allReminders.length === 0 ? (
									<div className="py-10 text-center text-sm text-muted-foreground">
										No reminders yet
									</div>
								) : (
									<div className="divide-y">
										{allReminders.map((r) => (
											<div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
												<Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm">
														{(r as any).message ?? 'Reminder'}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatDate(r.scheduledTime)}
													</p>
												</div>
												<span
													className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
														r.status === 'sent'
															? 'bg-green-500/10 text-green-700 dark:text-green-400'
															: 'bg-muted text-muted-foreground'
													}`}
												>
													{r.status}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						</>
					)}
				</main>

				{/* Edit Customer Dialog */}
				<Dialog open={editOpen} onOpenChange={setEditOpen}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Edit Customer</DialogTitle>
						</DialogHeader>
						<div className="space-y-3 py-2">
							<div className="space-y-1.5">
								<Label className="text-xs">Name *</Label>
								<Input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="Customer name"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Phone</Label>
								<Input
									value={editPhone}
									onChange={(e) => setEditPhone(e.target.value)}
									placeholder="10-digit mobile"
									type="tel"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Email</Label>
								<Input
									value={editEmail}
									onChange={(e) => setEditEmail(e.target.value)}
									placeholder="email@example.com"
									type="email"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Nickname / Short Name</Label>
								<Input
									value={editNickname}
									onChange={(e) => setEditNickname(e.target.value)}
									placeholder="e.g. Ramesh bhai"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Landmark / Area</Label>
								<Input
									value={editLandmark}
									onChange={(e) => setEditLandmark(e.target.value)}
									placeholder="e.g. near Rajiv Chowk"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Credit Limit (0 = no limit)</Label>
								<Input
									type="number"
									min={0}
									step="any"
									value={editCreditLimit}
									onChange={(e) => setEditCreditLimit(e.target.value)}
									placeholder="0"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Tags</Label>
								<div className="flex flex-wrap gap-1.5">
									{CUSTOMER_TAGS.map((tag) => {
										const active = editTags.includes(tag);
										return (
											<button
												key={tag}
												type="button"
												onClick={() =>
													setEditTags((prev) =>
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

							{/* Notes */}
							<div className="space-y-1.5">
								<Label className="text-xs">Notes</Label>
								<Input
									value={editNotes}
									onChange={(e) => setEditNotes(e.target.value)}
									placeholder="Any notes about this customer…"
								/>
							</div>

							{/* Delete section */}
							<div className="border-t pt-3">
								{!deleteConfirm ? (
									<button
										type="button"
										className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
										onClick={() => setDeleteConfirm(true)}
									>
										<Trash2 className="h-3.5 w-3.5" />
										Delete this customer
									</button>
								) : (
									<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
										<p className="text-xs font-medium text-destructive">
											⚠️ Deleting <strong>{customer?.name}</strong> will remove all their
											invoices, ledger entries and reminders. This cannot be undone.
										</p>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="destructive"
												className="gap-1.5"
												disabled={deleteCustomer.isPending}
												onClick={() => {
													deleteCustomer.mutate(id!, {
														onSuccess: () => {
															toast({ title: `${customer?.name ?? 'Customer'} deleted` });
															setEditOpen(false);
															navigate('/customers');
														},
														onError: () =>
															toast({ title: 'Delete failed', variant: 'destructive' }),
													});
												}}
											>
												<Trash2 className="h-3.5 w-3.5" />
												{deleteCustomer.isPending ? 'Deleting…' : 'Yes, Delete'}
											</Button>
											<Button size="sm" variant="outline" onClick={() => setDeleteConfirm(false)}>
												Cancel
											</Button>
										</div>
									</div>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setEditOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={!editName.trim() || updateCustomer.isPending}>
								{updateCustomer.isPending ? 'Saving…' : 'Save Changes'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<BottomNav />

				{/* Notification Prefs Dialog */}
				<Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Notification Preferences</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-2">
							{/* WhatsApp */}
							<div className="space-y-2 rounded-lg border p-3">
								<div className="flex items-center justify-between">
									<Label className="text-sm font-medium">WhatsApp</Label>
									<Switch checked={pWaEnabled} onCheckedChange={setPWaEnabled} />
								</div>
								{pWaEnabled && (
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">WhatsApp Number</Label>
										<Input
											value={pWaNumber}
											onChange={(e) => setPWaNumber(e.target.value)}
											placeholder="10-digit number"
											type="tel"
										/>
									</div>
								)}
							</div>

							{/* Email */}
							<div className="space-y-2 rounded-lg border p-3">
								<div className="flex items-center justify-between">
									<Label className="text-sm font-medium">Email Reminders</Label>
									<Switch checked={pEmailEnabled} onCheckedChange={setPEmailEnabled} />
								</div>
								{pEmailEnabled && (
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">Email Address</Label>
										<Input
											value={pEmailAddress}
											onChange={(e) => setPEmailAddress(e.target.value)}
											placeholder="customer@email.com"
											type="email"
										/>
									</div>
								)}
							</div>

							{/* SMS */}
							<div className="flex items-center justify-between rounded-lg border p-3">
								<Label className="text-sm font-medium">SMS Reminders</Label>
								<Switch checked={pSmsEnabled} onCheckedChange={setPSmsEnabled} />
							</div>

							{/* Language */}
							<div className="space-y-1.5">
								<Label className="text-xs">Preferred Language</Label>
								<div className="flex gap-2">
									{(['hi', 'en', 'mr', 'gu'] as const).map((lang) => (
										<button
											key={lang}
											type="button"
											onClick={() => setPLang(lang)}
											className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
												pLang === lang
													? 'border-primary bg-primary/10 text-primary'
													: 'border-border bg-muted text-muted-foreground'
											}`}
										>
											{{ hi: 'Hindi', en: 'English', mr: 'Marathi', gu: 'Gujarati' }[lang]}
										</button>
									))}
								</div>
							</div>

							<p className="text-[11px] text-muted-foreground">
								Reminders are sent email-first. If email is off or fails, WhatsApp is used as fallback.
							</p>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setPrefsOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSavePrefs} disabled={updateCommPrefs.isPending}>
								{updateCommPrefs.isPending ? 'Saving…' : 'Save'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Set Reminder Dialog */}
				<Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
					<DialogContent className="sm:max-w-sm">
						<DialogHeader>
							<DialogTitle>Set Reminder</DialogTitle>
						</DialogHeader>
						<div className="space-y-3 py-2">
							<div className="space-y-1.5">
								<Label className="text-xs">Amount Outstanding (₹)</Label>
								<div className="relative">
									<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
										₹
									</span>
									<Input
										className="pl-7"
										type="number"
										min={0}
										step="any"
										value={remAmount}
										onChange={(e) => setRemAmount(e.target.value)}
										placeholder={String(balance > 0 ? balance : 0)}
										inputMode="decimal"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Date &amp; Time</Label>
								<Input
									type="datetime-local"
									value={remDate}
									onChange={(e) => setRemDate(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Message (optional)</Label>
								<Input
									value={remMessage}
									onChange={(e) => setRemMessage(e.target.value)}
									placeholder={`Reminder for ${customer?.name ?? 'customer'}`}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setReminderOpen(false)}>
								Cancel
							</Button>
							<Button
								disabled={!remDate || createReminder.isPending}
								onClick={() => {
									createReminder.mutate(
										{
											customerId: id!,
											amount: remAmount ? parseFloat(remAmount) : balance,
											datetime: remDate,
											message: remMessage || undefined,
										},
										{
											onSuccess: () => {
												toast({ title: 'Reminder set' });
												setReminderOpen(false);
											},
											onError: () =>
												toast({ title: 'Failed to set reminder', variant: 'destructive' }),
										}
									);
								}}
							>
								{createReminder.isPending ? 'Saving…' : 'Set Reminder'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Invoice creation modal — pre-fills customer and optionally last order items */}
			<InvoiceCreation
				open={invoiceOpen}
				onOpenChange={setInvoiceOpen}
				repeatForCustomer={customer}
				repeatItems={repeatItems.length > 0 ? repeatItems : undefined}
			/>
		</>
	);
};

export default CustomerDetail;

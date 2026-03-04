import { useState } from 'react';
import {
	ArrowLeft,
	Download,
	FileText,
	Mail,
	Printer,
	RefreshCw,
	TrendingUp,
	FileSpreadsheet,
	AlertCircle,
	CheckCircle2,
} from 'lucide-react';
import VoiceBar from '@/components/VoiceBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Progress } from '@/components/ui/progress';
import {
	useDailySummary,
	useSummaryRange,
	useCustomers,
	useProducts,
	useInvoices,
	useGstr1Report,
	usePnlReport,
	useEmailReport,
} from '@/hooks/useQueries';
import { useWsInvalidation } from '@/hooks/useWsInvalidation';
import { formatCurrency, reportApi, getToken } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

// ── Helpers ───────────────────────────────────────────────────────────────────

const periods = ['Today', 'This Week', 'This Month', 'Custom'] as const;
const TABS = ['Overview', 'GSTR-1', 'P&L', 'Aging'] as const;

function getPeriodRange(period: string): { from: string; to: string } {
	const now = new Date();
	const fmt = (d: Date) => d.toISOString().slice(0, 10);
	if (period === 'This Week') {
		const start = new Date(now);
		start.setDate(now.getDate() - now.getDay());
		return { from: fmt(start), to: fmt(now) };
	}
	if (period === 'This Month') {
		return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
	}
	return { from: fmt(now), to: fmt(now) };
}

async function downloadWithAuth(url: string, filename: string) {
	const token = getToken();
	const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
	if (!res.ok) {
		alert('Download failed: ' + res.statusText);
		return;
	}
	const blob = await res.blob();
	const href = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = href;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(href);
}

function currentIndianFY(): string {
	const now = new Date();
	const year = now.getFullYear();
	const mon = now.getMonth() + 1;
	return mon >= 4 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ period }: { period: string }) {
	const periodRange = getPeriodRange(period);
	const useRange = period === 'This Week' || period === 'This Month';
	const { data: dailySummary } = useDailySummary();
	const { data: rangeSummary } = useSummaryRange(periodRange.from, periodRange.to);
	const { data: customers = [] } = useCustomers('', 100);
	const { data: products = [] } = useProducts();
	const { data: invoices = [] } = useInvoices(200);

	const summary = useRange ? rangeSummary : dailySummary;
	const totalSales = summary?.totalSales ?? 0;
	const totalPayments = summary?.totalPayments ?? 0;
	const collectionRate = totalSales > 0 ? Math.round((totalPayments / totalSales) * 100) : 0;
	const pendingAmount = summary?.pendingAmount ?? 0;

	const salesByDay = new Map<string, number>();
	for (const inv of invoices) {
		if (inv.status === 'cancelled') continue;
		const day = String(new Date(inv.createdAt).getDate());
		salesByDay.set(day, (salesByDay.get(day) ?? 0) + parseFloat(String(inv.total)));
	}
	const salesTrendData = Array.from(salesByDay.entries())
		.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
		.map(([day, sales]) => ({ day, sales: Math.round(sales) }));

	const productRevMap = new Map<string, number>();
	for (const inv of invoices) {
		if (inv.status === 'cancelled') continue;
		for (const item of inv.items ?? []) {
			const name = item.product?.name ?? item.productName ?? 'Unknown';
			productRevMap.set(name, (productRevMap.get(name) ?? 0) + parseFloat(String(item.itemTotal ?? 0)));
		}
	}
	const topProductsFromInvoices = [...productRevMap.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([name, amount]) => ({ name, amount }));
	const topProductsFallback = [...products]
		.sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)))
		.slice(0, 5)
		.map((p) => ({ name: p.name, amount: parseFloat(String(p.price)) * p.stock }));
	const topProductsList = topProductsFromInvoices.length > 0 ? topProductsFromInvoices : topProductsFallback;

	const topCustomers = [...customers]
		.filter((c) => parseFloat(String(c.totalPurchases)) > 0)
		.sort((a, b) => parseFloat(String(b.totalPurchases)) - parseFloat(String(a.totalPurchases)))
		.slice(0, 5)
		.map((c) => ({ name: c.name, amount: parseFloat(String(c.totalPurchases)) }));

	const cash = summary?.cashPayments ?? 0;
	const upi = summary?.upiPayments ?? 0;
	const other = Math.max(0, totalPayments - cash - upi);
	const paymentMethods = [
		{
			method: 'Cash',
			icon: '💵',
			amount: cash,
			percent: totalPayments > 0 ? Math.round((cash / totalPayments) * 100) : 0,
		},
		{
			method: 'UPI',
			icon: '📱',
			amount: upi,
			percent: totalPayments > 0 ? Math.round((upi / totalPayments) * 100) : 0,
		},
		{
			method: 'Card / Other',
			icon: '💳',
			amount: other,
			percent: totalPayments > 0 ? Math.round((other / totalPayments) * 100) : 0,
		},
		{
			method: 'Credit (Pending)',
			icon: '📝',
			amount: pendingAmount,
			percent: totalSales > 0 ? Math.round((pendingAmount / totalSales) * 100) : 0,
		},
	];

	const handleExport = () => {
		const rows = [
			['Period', period],
			['Total Sales', String(totalSales)],
			['Total Collected', String(totalPayments)],
			['Collection Rate (%)', String(collectionRate)],
			['Pending Dues', String(pendingAmount)],
		];
		const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `execora-report-${period.toLowerCase().replace(/ /g, '-')}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-5">
			<section>
				<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					📈 Revenue Overview
				</h2>
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					{[
						{ label: 'Total Sales', value: formatCurrency(totalSales) },
						{ label: 'Collected', value: formatCurrency(totalPayments) },
						{ label: 'Collection Rate', value: `${collectionRate}%` },
						{ label: 'Pending Dues', value: formatCurrency(pendingAmount) },
					].map((s) => (
						<Card key={s.label} className="border-none shadow-sm">
							<CardContent className="p-4">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									{s.label}
								</p>
								<p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			<Card className="border-none shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Sales Trend</CardTitle>
				</CardHeader>
				<CardContent>
					{salesTrendData.length === 0 ? (
						<div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
							No sales data yet
						</div>
					) : (
						<ResponsiveContainer width="100%" height={220}>
							<AreaChart data={salesTrendData}>
								<defs>
									<linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="hsl(24 85% 52%)" stopOpacity={0.3} />
										<stop offset="95%" stopColor="hsl(24 85% 52%)" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30 15% 88%)" />
								<XAxis
									dataKey="day"
									axisLine={false}
									tickLine={false}
									tick={{ fill: 'hsl(20 10% 45%)', fontSize: 12 }}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fill: 'hsl(20 10% 45%)', fontSize: 12 }}
									tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
								/>
								<Tooltip
									formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Sales']}
									contentStyle={{ borderRadius: '8px', border: '1px solid hsl(30 15% 88%)' }}
								/>
								<Area
									type="monotone"
									dataKey="sales"
									stroke="hsl(24 85% 52%)"
									strokeWidth={2}
									fill="url(#salesGrad)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2">
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">🏷️ Top Products</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{topProductsList.length === 0 ? (
							<p className="text-sm text-muted-foreground">No data yet</p>
						) : (
							topProductsList.map((p, i) => (
								<div key={p.name} className="flex items-center justify-between">
									<span className="text-sm">
										<span className="mr-2 text-muted-foreground">{i + 1}.</span>📦 {p.name}
									</span>
									<span className="font-semibold">{formatCurrency(p.amount)}</span>
								</div>
							))
						)}
					</CardContent>
				</Card>
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-3">
						<CardTitle className="text-base">👥 Top Customers</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{topCustomers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No data yet</p>
						) : (
							topCustomers.map((c, i) => (
								<div key={c.name} className="flex items-center justify-between">
									<span className="text-sm">
										<span className="mr-2 text-muted-foreground">{i + 1}.</span>
										{c.name}
									</span>
									<span className="font-semibold">{formatCurrency(c.amount)}</span>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>

			<Card className="border-none shadow-sm">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">📊 Payment Breakdown</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{paymentMethods.map((pm) => (
						<div key={pm.method} className="space-y-1.5">
							<div className="flex items-center justify-between text-sm">
								<span>
									{pm.icon} {pm.method}
								</span>
								<span className="font-semibold">
									{formatCurrency(pm.amount)} ({pm.percent}%)
								</span>
							</div>
							<Progress value={pm.percent} className="h-2.5" />
						</div>
					))}
				</CardContent>
			</Card>

			<div className="flex flex-wrap gap-2 pb-6">
				<Button variant="outline" size="sm" onClick={handleExport}>
					<Download className="mr-1.5 h-4 w-4" /> Download CSV
				</Button>
				<Button variant="outline" size="sm" onClick={() => window.print()}>
					<Printer className="mr-1.5 h-4 w-4" /> Print
				</Button>
			</div>
		</div>
	);
}

// ── GSTR-1 tab ────────────────────────────────────────────────────────────────

function Gstr1Tab() {
	const fy = currentIndianFY();
	const { data: report, isLoading, error, refetch } = useGstr1Report({ fy });
	const emailMutation = useEmailReport();
	const [emailAddr, setEmailAddr] = useState('');
	const [emailSent, setEmailSent] = useState(false);

	const fyStart = parseInt(fy.split('-')[0]);
	const fyFrom = `${fyStart}-04-01`;
	const fyTo = `${fyStart + 1}-03-31`;

	const handleEmail = async () => {
		if (!emailAddr) return;
		await emailMutation.mutateAsync({ type: 'gstr1', from: fyFrom, to: fyTo, email: emailAddr, fy });
		setEmailSent(true);
	};

	if (isLoading)
		return (
			<div className="flex h-48 items-center justify-center">
				<div className="text-center text-muted-foreground">
					<RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
					<p className="text-sm">Loading GSTR-1 data…</p>
				</div>
			</div>
		);

	if (error)
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
				<AlertCircle className="mr-2 inline h-4 w-4" />
				Failed to load GSTR-1: {String(error)}
			</div>
		);

	const t = report?.totals;

	return (
		<div className="space-y-5">
			{/* Header row */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-bold">GSTR-1 — FY {fy}</h2>
					{report?.gstin && (
						<p className="text-xs text-muted-foreground">
							GSTIN: {report.gstin} | {report.legalName}
						</p>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						<RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => downloadWithAuth(reportApi.downloadGstr1Pdf({ fy }), `GSTR1_${fy}.pdf`)}
					>
						<FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadWithAuth(reportApi.downloadGstr1Csv({ fy, section: 'b2b' }), `GSTR1_B2B_${fy}.csv`)
						}
					>
						<FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> B2B CSV
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadWithAuth(reportApi.downloadGstr1Csv({ fy, section: 'hsn' }), `GSTR1_HSN_${fy}.csv`)
						}
					>
						<FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> HSN CSV
					</Button>
				</div>
			</div>

			{/* Summary cards */}
			{t && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{ label: 'Invoices', value: String(t.invoiceCount) },
						{ label: 'Taxable Value', value: formatCurrency(t.totalTaxableValue) },
						{ label: 'Total Tax', value: formatCurrency(t.totalTaxValue) },
						{ label: 'Invoice Value', value: formatCurrency(t.totalInvoiceValue) },
					].map((s) => (
						<Card key={s.label} className="border-none shadow-sm">
							<CardContent className="p-4">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									{s.label}
								</p>
								<p className="mt-1.5 text-xl font-bold">{s.value}</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Tax breakdown */}
			{t && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Tax Breakdown (FY {fy})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{[
								{ label: 'CGST', value: formatCurrency(t.totalCgst), color: 'text-blue-600' },
								{ label: 'SGST', value: formatCurrency(t.totalSgst), color: 'text-purple-600' },
								{ label: 'IGST', value: formatCurrency(t.totalIgst), color: 'text-orange-600' },
								{ label: 'CESS', value: formatCurrency(t.totalCess), color: 'text-gray-600' },
							].map((s) => (
								<div key={s.label} className="rounded-lg bg-muted/40 p-3">
									<p className="text-xs text-muted-foreground">{s.label}</p>
									<p className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* B2B table */}
			{report && report.b2b.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">4A — B2B Invoices ({report.b2b.length})</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b bg-muted/30">
										{[
											'Receiver GSTIN',
											'Receiver',
											'Invoice No',
											'Date',
											'POS',
											'Value',
											'Taxable',
											'IGST',
										].map((h) => (
											<th
												key={h}
												className="px-3 py-2 text-left font-semibold text-muted-foreground"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{report.b2b.map((row, i) => (
										<tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
											<td className="px-3 py-1.5 font-mono">{row.receiverGstin}</td>
											<td className="px-3 py-1.5">{row.receiverName}</td>
											<td className="px-3 py-1.5">{row.invoiceNo}</td>
											<td className="px-3 py-1.5">{row.invoiceDate}</td>
											<td className="px-3 py-1.5">{row.placeOfSupply || '—'}</td>
											<td className="px-3 py-1.5 text-right">
												{formatCurrency(row.invoiceValue)}
											</td>
											<td className="px-3 py-1.5 text-right">
												{formatCurrency(row.taxableValue)}
											</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.igst)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* HSN summary table */}
			{report && report.hsn.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">12 — HSN Summary ({report.hsn.length} entries)</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b bg-muted/30">
										{[
											'HSN',
											'Description',
											'UQC',
											'Qty',
											'GST%',
											'Taxable',
											'CGST',
											'SGST',
											'IGST',
										].map((h) => (
											<th
												key={h}
												className="px-3 py-2 text-left font-semibold text-muted-foreground"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{report.hsn.map((row, i) => (
										<tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
											<td className="px-3 py-1.5 font-mono">{row.hsnCode}</td>
											<td className="max-w-[120px] truncate px-3 py-1.5">{row.description}</td>
											<td className="px-3 py-1.5">{row.uqc}</td>
											<td className="px-3 py-1.5 text-right">{row.totalQty.toFixed(2)}</td>
											<td className="px-3 py-1.5 text-right">{row.gstRate}%</td>
											<td className="px-3 py-1.5 text-right">
												{formatCurrency(row.taxableValue)}
											</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.cgst)}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.sgst)}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.igst)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* B2CS table */}
			{report && (report.b2cs?.length ?? 0) > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">7 — B2C Small ({report.b2cs!.length} entries)</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b bg-muted/30">
										{[
											'Supply Type',
											'Place of Supply',
											'GST Rate',
											'Taxable Value',
											'IGST',
											'CGST',
											'SGST',
											'CESS',
										].map((h) => (
											<th
												key={h}
												className="px-3 py-2 text-left font-semibold text-muted-foreground"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{report.b2cs!.map((row, i) => (
										<tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
											<td className="px-3 py-1.5">{row.supplyType}</td>
											<td className="px-3 py-1.5">{row.placeOfSupply}</td>
											<td className="px-3 py-1.5 text-right">{row.gstRate}%</td>
											<td className="px-3 py-1.5 text-right">
												{formatCurrency(row.taxableValue)}
											</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.igst)}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.cgst)}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.sgst)}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(row.cess)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* No data */}
			{report && report.b2b.length === 0 && report.hsn.length === 0 && (report.b2cs?.length ?? 0) === 0 && (
				<div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
					<FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
					<p className="text-sm font-medium">No invoice data for FY {fy}</p>
					<p className="mt-1 text-xs">Create GST invoices to see GSTR-1 data here</p>
				</div>
			)}

			{/* Email */}
			<Card className="border-none shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">📧 Email GSTR-1 Report</CardTitle>
				</CardHeader>
				<CardContent>
					{emailSent ? (
						<div className="flex items-center gap-2 text-sm text-green-600">
							<CheckCircle2 className="h-4 w-4" /> Report sent to {emailAddr}
						</div>
					) : (
						<div className="flex gap-2">
							<input
								type="email"
								placeholder="your@email.com"
								value={emailAddr}
								onChange={(e) => setEmailAddr(e.target.value)}
								className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<Button size="sm" onClick={handleEmail} disabled={!emailAddr || emailMutation.isPending}>
								{emailMutation.isPending ? (
									<RefreshCw className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Mail className="h-3.5 w-3.5" />
								)}
								<span className="ml-1.5">Send</span>
							</Button>
						</div>
					)}
					{emailMutation.isError && (
						<p className="mt-2 text-xs text-destructive">{String(emailMutation.error)}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ── P&L tab ───────────────────────────────────────────────────────────────────

function PnlTab() {
	const now = new Date();
	const [from, setFrom] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
	const [to, setTo] = useState(() => {
		const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return last.toISOString().slice(0, 10);
	});

	// Comparison period defaults to same period of previous month
	const [showCompare, setShowCompare] = useState(false);
	const [compareFrom, setCompareFrom] = useState(() => {
		const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		return d.toISOString().slice(0, 10);
	});
	const [compareTo, setCompareTo] = useState(() => {
		const d = new Date(now.getFullYear(), now.getMonth(), 0);
		return d.toISOString().slice(0, 10);
	});

	const {
		data: report,
		isLoading,
		error,
		refetch,
	} = usePnlReport({
		from,
		to,
		compareFrom: showCompare ? compareFrom : undefined,
		compareTo: showCompare ? compareTo : undefined,
	});
	const emailMutation = useEmailReport();
	const [emailAddr, setEmailAddr] = useState('');
	const [emailSent, setEmailSent] = useState(false);

	const handleEmail = async () => {
		if (!emailAddr) return;
		await emailMutation.mutateAsync({ type: 'pnl', from, to, email: emailAddr });
		setEmailSent(true);
	};

	if (isLoading)
		return (
			<div className="flex h-48 items-center justify-center">
				<div className="text-center text-muted-foreground">
					<RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
					<p className="text-sm">Loading P&L data…</p>
				</div>
			</div>
		);

	if (error)
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
				<AlertCircle className="mr-2 inline h-4 w-4" />
				Failed to load P&L: {String(error)}
			</div>
		);

	const t = report?.totals;

	const chartData = (report?.months ?? []).map((m) => ({
		month: m.month,
		revenue: Math.round(m.revenue),
		collected: Math.round(m.collected),
	}));

	return (
		<div className="space-y-5">
			{/* Date range + actions */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<label className="text-xs text-muted-foreground">From</label>
					<input
						type="date"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						className="rounded-md border bg-background px-2 py-1 text-sm"
					/>
					<label className="text-xs text-muted-foreground">To</label>
					<input
						type="date"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						className="rounded-md border bg-background px-2 py-1 text-sm"
					/>
					<Button size="sm" variant="outline" onClick={() => refetch()}>
						<RefreshCw className="h-3.5 w-3.5" />
					</Button>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadWithAuth(reportApi.downloadPnlPdf({ from, to }), `PnL_${from}_${to}.pdf`)
						}
					>
						<FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadWithAuth(reportApi.downloadPnlCsv({ from, to }), `PnL_${from}_${to}.csv`)
						}
					>
						<FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
					</Button>
				</div>
			</div>

			{/* Compare period toggle */}
			<div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
				<label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
					<input
						type="checkbox"
						checked={showCompare}
						onChange={(e) => setShowCompare(e.target.checked)}
						className="h-4 w-4 accent-primary"
					/>
					Compare with previous period
				</label>
				{showCompare && (
					<div className="flex flex-wrap items-center gap-2">
						<label className="text-xs text-muted-foreground">Compare From</label>
						<input
							type="date"
							value={compareFrom}
							onChange={(e) => setCompareFrom(e.target.value)}
							className="rounded-md border bg-background px-2 py-1 text-xs"
						/>
						<label className="text-xs text-muted-foreground">To</label>
						<input
							type="date"
							value={compareTo}
							onChange={(e) => setCompareTo(e.target.value)}
							className="rounded-md border bg-background px-2 py-1 text-xs"
						/>
					</div>
				)}
			</div>

			{/* Summary cards */}
			{t && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{[
						{ label: 'Revenue', value: formatCurrency(t.revenue), sub: `${t.invoiceCount} invoices` },
						{ label: 'Net Revenue', value: formatCurrency(t.netRevenue), sub: 'After discounts' },
						{
							label: 'Collected',
							value: formatCurrency(t.collected),
							sub: `${t.collectionRate.toFixed(1)}%`,
						},
						{ label: 'Outstanding', value: formatCurrency(t.outstanding), sub: 'Pending' },
					].map((s) => (
						<Card key={s.label} className="border-none shadow-sm">
							<CardContent className="p-4">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
									{s.label}
								</p>
								<p className="mt-1.5 text-xl font-bold">{s.value}</p>
								<p className="mt-0.5 text-[10px] text-muted-foreground">{s.sub}</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Period comparison table */}
			{showCompare && report?.comparison && report.comparison.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">
							📊 Period Comparison ({from.slice(0, 7)} vs {compareFrom.slice(0, 7)})
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/30">
										<th className="px-4 py-2 text-left font-semibold text-muted-foreground">
											Metric
										</th>
										<th className="px-4 py-2 text-right font-semibold text-muted-foreground">
											Current Period
										</th>
										<th className="px-4 py-2 text-right font-semibold text-muted-foreground">
											Previous Period
										</th>
										<th className="px-4 py-2 text-right font-semibold text-muted-foreground">
											Change
										</th>
									</tr>
								</thead>
								<tbody>
									{report.comparison.map((row, i) => (
										<tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
											<td className="px-4 py-2 font-medium">{row.label}</td>
											<td className="px-4 py-2 text-right">{formatCurrency(row.currentValue)}</td>
											<td className="px-4 py-2 text-right text-muted-foreground">
												{formatCurrency(row.previousValue)}
											</td>
											<td
												className={`px-4 py-2 text-right font-semibold ${row.changePercent >= 0 ? 'text-green-600' : 'text-destructive'}`}
											>
												{row.changePercent >= 0 ? '▲' : '▼'}{' '}
												{Math.abs(row.changePercent).toFixed(1)}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Collection rate */}
			{t && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Collection Rate</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex justify-between text-sm">
							<span>
								Collected {formatCurrency(t.collected)} of {formatCurrency(t.revenue)}
							</span>
							<span className="font-bold text-primary">{t.collectionRate.toFixed(1)}%</span>
						</div>
						<Progress value={t.collectionRate} className="h-3" />
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Tax collected: {formatCurrency(t.taxCollected)}</span>
							<span>Discounts given: {formatCurrency(t.discounts)}</span>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Monthly bar chart */}
			{chartData.length > 1 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Monthly Revenue vs Collected</CardTitle>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={220}>
							<BarChart data={chartData} barGap={4}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30 15% 88%)" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fontSize: 11 }}
									tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
								/>
								<Tooltip
									formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']}
									contentStyle={{ borderRadius: '8px' }}
								/>
								<Bar dataKey="revenue" name="Revenue" fill="hsl(24 85% 52%)" radius={[4, 4, 0, 0]} />
								<Bar
									dataKey="collected"
									name="Collected"
									fill="hsl(142 71% 45%)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			)}

			{/* Month-wise table */}
			{report && report.months.length > 0 && (
				<Card className="border-none shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Month-wise Breakdown</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b bg-muted/30">
										{[
											'Month',
											'Bills',
											'Revenue',
											'Discounts',
											'Net Revenue',
											'Tax',
											'Collected',
											'Outstanding',
										].map((h) => (
											<th
												key={h}
												className="px-3 py-2 text-left font-semibold text-muted-foreground"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{report.months.map((m, i) => (
										<tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
											<td className="px-3 py-1.5 font-medium">{m.month}</td>
											<td className="px-3 py-1.5 text-center">{m.invoiceCount}</td>
											<td className="px-3 py-1.5 text-right">{formatCurrency(m.revenue)}</td>
											<td className="px-3 py-1.5 text-right text-orange-600">
												{formatCurrency(m.discounts)}
											</td>
											<td className="px-3 py-1.5 text-right font-medium">
												{formatCurrency(m.netRevenue)}
											</td>
											<td className="px-3 py-1.5 text-right text-blue-600">
												{formatCurrency(m.taxCollected)}
											</td>
											<td className="px-3 py-1.5 text-right text-green-600">
												{formatCurrency(m.collected)}
											</td>
											<td className="px-3 py-1.5 text-right text-red-600">
												{formatCurrency(m.outstanding)}
											</td>
										</tr>
									))}
								</tbody>
								{t && (
									<tfoot>
										<tr className="border-t-2 bg-muted/20 font-bold">
											<td className="px-3 py-2">TOTAL</td>
											<td className="px-3 py-2 text-center">{t.invoiceCount}</td>
											<td className="px-3 py-2 text-right">{formatCurrency(t.revenue)}</td>
											<td className="px-3 py-2 text-right text-orange-600">
												{formatCurrency(t.discounts)}
											</td>
											<td className="px-3 py-2 text-right">{formatCurrency(t.netRevenue)}</td>
											<td className="px-3 py-2 text-right text-blue-600">
												{formatCurrency(t.taxCollected)}
											</td>
											<td className="px-3 py-2 text-right text-green-600">
												{formatCurrency(t.collected)}
											</td>
											<td className="px-3 py-2 text-right text-red-600">
												{formatCurrency(t.outstanding)}
											</td>
										</tr>
									</tfoot>
								)}
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* No data */}
			{report && report.months.length === 0 && (
				<div className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">
					<TrendingUp className="mx-auto mb-3 h-10 w-10 opacity-30" />
					<p className="text-sm font-medium">No data for selected period</p>
					<p className="mt-1 text-xs">Adjust the date range or create some invoices first</p>
				</div>
			)}

			{/* Email */}
			<Card className="border-none shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">📧 Email P&L Report</CardTitle>
				</CardHeader>
				<CardContent>
					{emailSent ? (
						<div className="flex items-center gap-2 text-sm text-green-600">
							<CheckCircle2 className="h-4 w-4" /> Report sent to {emailAddr}
						</div>
					) : (
						<div className="flex gap-2">
							<input
								type="email"
								placeholder="your@email.com"
								value={emailAddr}
								onChange={(e) => setEmailAddr(e.target.value)}
								className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							/>
							<Button size="sm" onClick={handleEmail} disabled={!emailAddr || emailMutation.isPending}>
								{emailMutation.isPending ? (
									<RefreshCw className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Mail className="h-3.5 w-3.5" />
								)}
								<span className="ml-1.5">Send</span>
							</Button>
						</div>
					)}
					{emailMutation.isError && (
						<p className="mt-2 text-xs text-destructive">{String(emailMutation.error)}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ── Aging / Outstanding Report ───────────────────────────────────────────────

const AGING_BUCKETS = [
	{ label: '0–30 days', max: 30, cls: 'bg-green-500/10  text-green-700  dark:text-green-400' },
	{ label: '31–60 days', max: 60, cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
	{ label: '61–90 days', max: 90, cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
	{ label: '90+ days', max: Infinity, cls: 'bg-destructive/10 text-destructive' },
];

function AgingTab() {
	const { data: invoices = [], isLoading } = useInvoices(500);

	const unpaid = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'partial');

	const now = Date.now();

	function ageDays(inv: (typeof unpaid)[0]) {
		return Math.floor((now - new Date(inv.createdAt).getTime()) / 86_400_000);
	}

	function bucket(age: number) {
		if (age <= 30) return 0;
		if (age <= 60) return 1;
		if (age <= 90) return 2;
		return 3;
	}

	const buckets: { total: number; count: number; invoices: typeof unpaid }[] = AGING_BUCKETS.map(() => ({
		total: 0,
		count: 0,
		invoices: [],
	}));

	for (const inv of unpaid) {
		const b = bucket(ageDays(inv));
		const pending = parseFloat(String(inv.total ?? 0)) - parseFloat(String(inv.paidAmount ?? 0));
		buckets[b].total += pending;
		buckets[b].count += 1;
		buckets[b].invoices.push(inv);
	}

	const grandTotal = buckets.reduce((s, b) => s + b.total, 0);
	const [open, setOpen] = useState<number | null>(null);

	if (isLoading) {
		return (
			<div className="flex h-48 items-center justify-center">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary */}
			<Card className="border-none shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Total Outstanding</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-3xl font-extrabold tabular-nums">{formatCurrency(grandTotal)}</p>
					<p className="mt-1 text-xs text-muted-foreground">{unpaid.length} unpaid / partial invoices</p>
				</CardContent>
			</Card>

			{/* Buckets */}
			{AGING_BUCKETS.map((def, idx) => (
				<div key={def.label}>
					<button
						className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-md ${open === idx ? 'border-primary/40 shadow-md' : 'bg-card'}`}
						onClick={() => setOpen(open === idx ? null : idx)}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span
									className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${def.cls}`}
								>
									{def.label}
								</span>
								<span className="text-xs text-muted-foreground">{buckets[idx].count} invoices</span>
							</div>
							<p className="text-base font-bold tabular-nums">{formatCurrency(buckets[idx].total)}</p>
						</div>
						{grandTotal > 0 && (
							<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all"
									style={{ width: `${(buckets[idx].total / grandTotal) * 100}%` }}
								/>
							</div>
						)}
					</button>

					{/* Expanded invoice list */}
					{open === idx && buckets[idx].invoices.length > 0 && (
						<div className="mt-1 overflow-hidden rounded-xl border bg-card">
							<div className="divide-y">
								{buckets[idx].invoices.map((inv) => {
									const due =
										parseFloat(String(inv.total ?? 0)) - parseFloat(String(inv.paidAmount ?? 0));
									return (
										<div
											key={inv.id}
											className="flex items-center justify-between px-4 py-2.5 text-sm"
										>
											<div>
												<p className="font-medium">{inv.invoiceNo}</p>
												<p className="text-xs text-muted-foreground">
													{inv.customer?.name ?? ''} · {ageDays(inv)}d old
												</p>
											</div>
											<p className="font-semibold tabular-nums text-destructive">
												{formatCurrency(due)}
											</p>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// ── Main Reports page ─────────────────────────────────────────────────────────

const Reports = () => {
	const [activePeriod, setActivePeriod] = useState<string>('Today');
	const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview');
	const navigate = useNavigate();
	useWsInvalidation(['summary', 'invoices', 'customers', 'products']);

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b bg-card px-4 py-3 md:px-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" onClick={() => navigate('/')}>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-lg font-bold tracking-tight md:text-xl">📊 Reports & Analytics</h1>
					</div>
				</div>

				{/* Tab nav */}
				<div className="mt-3 flex gap-0 border-b">
					{TABS.map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={[
								'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
								activeTab === tab
									? 'border-primary text-primary'
									: 'border-transparent text-muted-foreground hover:text-foreground',
							].join(' ')}
						>
							{tab === 'GSTR-1'
								? '🏛️ GSTR-1'
								: tab === 'P&L'
									? '📈 P&L'
									: tab === 'Aging'
										? '⏰ Aging'
										: '📊 Overview'}
						</button>
					))}
				</div>

				{/* Period selector — Overview only */}
				{activeTab === 'Overview' && (
					<div className="mt-3 flex flex-wrap gap-2">
						{periods.map((p) => (
							<Button
								key={p}
								variant={activePeriod === p ? 'default' : 'outline'}
								size="sm"
								onClick={() => setActivePeriod(p)}
								className="text-xs"
							>
								{p}
							</Button>
						))}
					</div>
				)}

				<VoiceBar
					idleHint={
						<>
							<span className="font-medium text-foreground">"GSTR-1 report nikalo"</span>
							{' · '}
							<span>"is mahine ka P&L dikhao"</span>
							{' · '}
							<span>"GST report bhejo"</span>
						</>
					}
				/>
			</header>

			<main className="mx-auto max-w-7xl p-4 md:p-6">
				{activeTab === 'Overview' && <OverviewTab period={activePeriod} />}
				{activeTab === 'GSTR-1' && <Gstr1Tab />}
				{activeTab === 'P&L' && <PnlTab />}
				{activeTab === 'Aging' && <AgingTab />}
			</main>
		</div>
	);
};

export default Reports;

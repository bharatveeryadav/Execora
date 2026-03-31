import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Truck,
  Plus,
  MoreHorizontal,
  Upload,
  GitMerge,
  FileSpreadsheet,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReportsEmbed } from "@/contexts/ReportsEmbedContext";
import { useCustomers, usePurchases } from "@/hooks/useQueries";
import { formatCurrency, type Customer } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Customers, { type CustomersRef } from "./Customers";

type Tab = "customers" | "suppliers";

function exportCustomersCsv(customers: Customer[]) {
  const header = [
    "Name",
    "Phone",
    "Email",
    "Address",
    "GSTIN",
    "Balance",
    "Credit Limit",
    "Tags",
  ];
  const rows = customers.map((c) => [
    c.name ?? "",
    c.phone ?? "",
    c.email ?? "",
    [c.addressLine1, c.addressLine2, c.city, c.state, c.pincode]
      .filter(Boolean)
      .join(", "),
    c.gstin ?? "",
    String(parseFloat(String(c.balance ?? 0))),
    String(c.creditLimit ?? ""),
    (c.tags ?? []).join("; "),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "customers.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function printCustomersPdf(customers: Customer[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Customers</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:8px;text-align:left}
      th{background:#f5f5f5}
    </style>
    </head>
    <body>
    <h1>Customers (${customers.length})</h1>
    <table>
    <tr><th>#</th><th>Name</th><th>Phone</th><th>Balance</th></tr>
    ${customers
      .map(
        (c, i) =>
          `<tr><td>${i + 1}</td><td>${escapeHtml(c.name ?? "")}</td><td>${escapeHtml(c.phone ?? "")}</td><td>₹${formatCurrency(parseFloat(String(c.balance ?? 0)))}</td></tr>`,
      )
      .join("")}
    </table>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
  win.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const Parties = () => {
  const navigate = useNavigate();
  const reportsEmbed = useReportsEmbed();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("customers");
  const customersRef = useRef<CustomersRef>(null);
  const { data: customers = [] } = useCustomers("", 1000);
  const { data: purchaseData } = usePurchases({});

  const purchases = purchaseData?.purchases ?? [];
  const toPay = purchases.reduce((s, p) => s + (p.amount ?? 0), 0);
  const toCollect = 0;

  const handleImport = () => navigate("/import?type=customers");
  const handleMerge = () => {
    toast({ title: "Merge customers", description: "Coming soon" });
  };
  const handleDownloadExcel = () => {
    exportCustomersCsv(customers);
    toast({ title: "Downloaded customers.csv" });
  };
  const handleDownloadPdf = () => {
    printCustomersPdf(customers);
    toast({ title: "Opened print dialog for PDF" });
  };

  const handleAddSupplier = () => {
    toast({ title: "Add Supplier", description: "Coming soon" });
  };
  const handleImportSuppliers = () => {
    toast({ title: "Import Suppliers", description: "Coming soon" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => reportsEmbed?.onBack?.() ?? navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="flex-1 text-base font-bold">👥 Parties</h1>
            {tab === "customers" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleImport} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import Customers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleMerge} className="gap-2">
                    <GitMerge className="h-4 w-4" />
                    Merge Customers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPdf} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {tab === "suppliers" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleImportSuppliers} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import Suppliers
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-3 flex rounded-xl border bg-muted/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("customers")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "customers"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Customers
            </button>
            <button
              type="button"
              onClick={() => setTab("suppliers")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "suppliers"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="h-4 w-4" />
              Suppliers
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-[50vh]">
        {tab === "customers" && (
          <Customers ref={customersRef} embedded />
        )}
        {tab === "suppliers" && (
          <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
            {/* Collect and Pay — compact */}
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-2 px-1 pb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Collect & Pay
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2">
                  <ArrowUpFromLine className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">To Pay</p>
                    <p className="text-sm font-bold tabular-nums text-destructive">
                      {formatCurrency(toPay)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-2.5 py-2">
                  <ArrowDownToLine className="h-4 w-4 shrink-0 text-success" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">To Collect</p>
                    <p className="text-sm font-bold tabular-nums text-success">
                      {formatCurrency(toCollect)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/purchases")}
              >
                <Truck className="h-4 w-4" />
                View Purchases
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/expenses")}
              >
                <Receipt className="h-4 w-4" />
                View Expenses
              </Button>
            </div>

            {/* Placeholder for supplier list */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/30 py-16 text-center">
              <Truck className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Supplier list coming soon
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Add suppliers to track purchases, payments, and credits.
              </p>
              <Button size="sm" onClick={handleAddSupplier} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </div>
        )}
      </div>

      {tab === "customers" && (
        <button
          onClick={() => customersRef.current?.openAdd()}
          className="fixed bottom-20 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
          aria-label="Add Customer"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {tab === "suppliers" && (
        <button
          onClick={handleAddSupplier}
          className="fixed bottom-20 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
          aria-label="Add Supplier"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

    </div>
  );
};

export default Parties;

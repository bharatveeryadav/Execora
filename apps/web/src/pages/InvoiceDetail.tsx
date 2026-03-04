/**
 * InvoiceDetail — Full invoice view: items table, tax breakdown, payment status,
 * WhatsApp share, print, cancel. Vyapar feature parity.
 */
import { useState } from "react";
import {
  ArrowLeft, Printer, MessageCircle, CheckCircle2, XCircle,
  Clock, Share2, Download, AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useInvoice, useCancelInvoice } from "@/hooks/useQueries";
import { formatCurrency, formatDate, getToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_CFG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  draft:     { label: "Draft",     icon: <Clock className="h-3 w-3" />,         cls: "bg-muted text-muted-foreground" },
  proforma:  { label: "Proforma",  icon: <Clock className="h-3 w-3" />,         cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  pending:   { label: "Pending",   icon: <Clock className="h-3 w-3" />,         cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  partial:   { label: "Partial",   icon: <AlertTriangle className="h-3 w-3" />, cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  paid:      { label: "Paid ✅",   icon: <CheckCircle2 className="h-3 w-3" />,  cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />,       cls: "bg-destructive/10 text-destructive" },
};

async function downloadWithAuth(url: string, filename: string) {
  const token = getToken();
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) { alert("Download failed: " + res.statusText); return; }
  const blob = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = blob; a.download = filename; a.click();
  URL.revokeObjectURL(blob);
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: invoice, isLoading } = useInvoice(id!);
  const cancelInvoice = useCancelInvoice();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => navigate("/invoices")}>← Back to Invoices</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[invoice.status] ?? STATUS_CFG.pending;
  const total       = parseFloat(String(invoice.total ?? 0));
  const paidAmount  = parseFloat(String(invoice.paidAmount ?? 0));
  const pending     = Math.max(0, total - paidAmount);
  const subtotal    = parseFloat(String(invoice.subtotal ?? 0));
  const discount    = parseFloat(String(invoice.discount ?? 0));
  const cgst        = parseFloat(String(invoice.cgst ?? 0));
  const sgst        = parseFloat(String(invoice.sgst ?? 0));
  const igst        = parseFloat(String(invoice.igst ?? 0));
  const hasTax      = cgst > 0 || sgst > 0 || igst > 0;
  const customerName = invoice.customer?.name ?? "Customer";
  const customerPhone = invoice.customer?.phone;

  const waText = encodeURIComponent(
    `Hi ${customerName},\n\nInvoice ${invoice.invoiceNo} for ${formatCurrency(total)} is ${invoice.status}.\n\nBalance due: ${formatCurrency(pending)}\n\nThank you!`
  );
  const waLink = customerPhone
    ? `https://wa.me/91${customerPhone.replace(/\D/g, "")}?text=${waText}`
    : null;

  function handleCancel() {
    cancelInvoice.mutate(invoice!.id, {
      onSuccess: () => {
        toast({ title: "Invoice cancelled" });
        navigate("/invoices");
      },
      onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
    });
  }

  const printUrl = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1/invoices/${invoice.id}/pdf`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold">{invoice.invoiceNo}</h1>
              <p className="text-xs text-muted-foreground">{customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={`flex items-center gap-1 ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Amount hero */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-extrabold tabular-nums">{formatCurrency(total)}</p>
                {invoice.dueDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due: {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                {paidAmount > 0 && (
                  <p className="text-green-700 dark:text-green-400">Paid: {formatCurrency(paidAmount)}</p>
                )}
                {pending > 0 && (
                  <p className="font-semibold text-destructive">Due: {formatCurrency(pending)}</p>
                )}
              </div>
            </div>

            {/* Progress bar for partial payments */}
            {total > 0 && paidAmount > 0 && paidAmount < total && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Collected</span>
                  <span>{Math.round((paidAmount / total) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (paidAmount / total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice info */}
        <Card className="border-none shadow-sm">
          <CardContent className="divide-y p-0">
            {[
              { label: "Invoice No.", value: invoice.invoiceNo },
              { label: "Customer", value: customerName },
              { label: "Date", value: formatDate(invoice.createdAt) },
              invoice.dueDate && { label: "Due Date", value: formatDate(invoice.dueDate) },
              invoice.buyerGstin && { label: "Buyer GSTIN", value: invoice.buyerGstin },
              invoice.placeOfSupply && { label: "Place of Supply", value: invoice.placeOfSupply },
            ].filter(Boolean).map((row) => (
              <div key={(row as { label: string }).label} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-xs text-muted-foreground">{(row as { label: string }).label}</p>
                <p className="text-sm font-medium">{(row as { value: string }).value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Items table */}
        {invoice.items && invoice.items.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Items ({invoice.items.length})
            </p>
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 bg-muted/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="col-span-5">Item</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-3 text-right">Amount</span>
                </div>
                {/* Rows */}
                <div className="divide-y">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3">
                      <div className="col-span-5">
                        <p className="text-sm font-medium line-clamp-2">
                          {item.product?.name ?? item.productName ?? "Product"}
                        </p>
                        {item.product?.unit && (
                          <p className="text-[11px] text-muted-foreground">{item.product.unit}</p>
                        )}
                      </div>
                      <p className="col-span-2 text-right text-sm tabular-nums">{item.quantity}</p>
                      <p className="col-span-2 text-right text-sm tabular-nums">{formatCurrency(item.unitPrice)}</p>
                      <p className="col-span-3 text-right text-sm font-semibold tabular-nums">{formatCurrency(item.itemTotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tax & total breakdown */}
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            {hasTax && (
              <>
                {cgst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span>{formatCurrency(cgst)}</span>
                  </div>
                )}
                {sgst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span>{formatCurrency(sgst)}</span>
                  </div>
                )}
                {igst > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST</span>
                    <span>{formatCurrency(igst)}</span>
                  </div>
                )}
              </>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                <span>Paid</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            )}
            {pending > 0 && (
              <div className="flex justify-between text-sm font-bold text-destructive">
                <span>Balance Due</span>
                <span>{formatCurrency(pending)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {waLink && (
            <Button asChild variant="outline" className="gap-2 border-green-500/30 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
              <a href={waLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => downloadWithAuth(printUrl, `${invoice.invoiceNo}.pdf`)}
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(printUrl, "_blank")}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigator.share?.({
                title: invoice.invoiceNo,
                text: `Invoice ${invoice.invoiceNo} — ${formatCurrency(total)}`,
                url: window.location.href,
              }).catch(() => {})
            }
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>

        {/* Cancel button — only if not already cancelled/paid */}
        {invoice.status !== "cancelled" && invoice.status !== "paid" && (
          <Button
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmCancel(true)}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancel Invoice
          </Button>
        )}
      </main>

      {/* Cancel confirmation */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {invoice.invoiceNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invoice for {formatCurrency(total)}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

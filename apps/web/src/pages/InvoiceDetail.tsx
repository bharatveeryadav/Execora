/**
 * InvoiceDetail — Full invoice view: items table, tax breakdown, payment status,
 * WhatsApp share, print, cancel. Vyapar feature parity.
 */
import { useState } from "react";
import {
  ArrowLeft,
  Printer,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  Link2,
  Download,
  AlertTriangle,
  Edit3,
  Plus,
  Minus,
  Mail,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useInvoice,
  useCancelInvoice,
  useUpdateInvoice,
  useConvertProforma,
  useMe,
} from "@/hooks/useQueries";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { formatCurrency, formatDate, getToken, invoiceApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STATUS_CFG: Record<
  string,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  draft: {
    label: "Draft",
    icon: <Clock className="h-3 w-3" />,
    cls: "bg-muted text-muted-foreground",
  },
  proforma: {
    label: "Proforma",
    icon: <Clock className="h-3 w-3" />,
    cls: "bg-info/10 text-info",
  },
  pending: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    cls: "bg-warning/10 text-warning",
  },
  partial: {
    label: "Partial",
    icon: <AlertTriangle className="h-3 w-3" />,
    cls: "bg-warning/10 text-warning",
  },
  paid: {
    label: "Paid ✅",
    icon: <CheckCircle2 className="h-3 w-3" />,
    cls: "bg-success/10 text-success",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="h-3 w-3" />,
    cls: "bg-destructive/10 text-destructive",
  },
};

async function downloadWithAuth(url: string, filename: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    alert("Download failed: " + res.statusText);
    return;
  }
  const blob = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = blob;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blob);
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editItems, setEditItems] = useState<
    Array<{
      id: string;
      name: string;
      qty: number;
      price: number;
      discount: number;
    }>
  >([]);
  const [editNotes, setEditNotes] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [convertMethod, setConvertMethod] = useState("cash");
  const [copyingLink, setCopyingLink] = useState(false);

  const { data: invoice, isLoading } = useInvoice(id!);
  const { data: meData } = useMe();
  const cancelInvoice = useCancelInvoice();
  const updateInvoice = useUpdateInvoice();
  const convertProforma = useConvertProforma();

  // Real-time cache invalidation via WebSocket
  useWsInvalidation(["invoices"]);

  async function copyPortalLink() {
    if (!id) return;
    setCopyingLink(true);
    try {
      const { token } = await invoiceApi.portalToken(id);
      const url = `${window.location.origin}/pub/${id}/${token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Portal link copied!", description: "Share this link with your customer." });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    } finally {
      setCopyingLink(false);
    }
  }

  function openEditModal() {
    if (!invoice) return;
    setEditItems(
      (invoice.items ?? []).map((it) => ({
        id: it.id,
        name: it.product?.name ?? it.productName ?? "Product",
        qty: it.quantity,
        price: it.unitPrice,
        discount: 0,
      })),
    );
    setEditNotes(invoice.notes ?? "");
    setEditOpen(true);
  }

  function editChangeQty(idx: number, delta: number) {
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it,
      ),
    );
  }

  function editChangeDiscount(idx: number, pct: number) {
    setEditItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, discount: Math.min(100, Math.max(0, pct || 0)) }
          : it,
      ),
    );
  }

  function editRemoveItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSaveEdit() {
    if (!invoice) return;
    updateInvoice.mutate(
      {
        id: invoice.id,
        data: {
          items: editItems.map((it) => ({
            productName: it.name,
            quantity: it.qty,
          })),
          notes: editNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Invoice updated ✅" });
          setEditOpen(false);
        },
        onError: () =>
          toast({ title: "Failed to update invoice", variant: "destructive" }),
      },
    );
  }

  async function handleSendEmail() {
    if (!invoice) return;
    if (!invoice.customer?.email) {
      toast({
        title: "No email on file",
        description: "Add an email address to this customer first.",
        variant: "destructive",
      });
      return;
    }
    setSendingEmail(true);
    try {
      await invoiceApi.sendEmail(invoice.id);
      toast({
        title: "✉️ Invoice sent",
        description: `Sent to ${invoice.customer.email}`,
      });
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  }

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
        <Button onClick={() => navigate("/invoices")}>
          ← Back to Invoices
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[invoice.status] ?? STATUS_CFG.pending;
  const total = parseFloat(String(invoice.total ?? 0));
  const paidAmount = parseFloat(String(invoice.paidAmount ?? 0));
  const pending = Math.max(0, total - paidAmount);
  const subtotal = parseFloat(String(invoice.subtotal ?? 0));
  const discount = parseFloat(String(invoice.discount ?? 0));
  const cgst = parseFloat(String(invoice.cgst ?? 0));
  const sgst = parseFloat(String(invoice.sgst ?? 0));
  const igst = parseFloat(String(invoice.igst ?? 0));
  const hasTax = cgst > 0 || sgst > 0 || igst > 0;
  const customerName = invoice.customer?.name ?? "Customer";
  const customerPhone = invoice.customer?.phone;

  const waText = encodeURIComponent(
    `Hi ${customerName},\n\nInvoice ${invoice.invoiceNo} for ${formatCurrency(total)} is ${invoice.status}.\n\nBalance due: ${formatCurrency(pending)}\n\nThank you!`,
  );
  const waLink = customerPhone
    ? `https://wa.me/91${customerPhone.replace(/\D/g, "")}?text=${waText}`
    : null;

  function handleConvert() {
    if (!invoice) return;
    const amt = parseFloat(convertAmount);
    convertProforma.mutate(
      {
        id: invoice.id,
        payment: amt > 0 ? { amount: amt, method: convertMethod } : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Proforma converted to Invoice ✅" });
          setConvertOpen(false);
          setConvertAmount("");
        },
        onError: () =>
          toast({ title: "Conversion failed", variant: "destructive" }),
      },
    );
  }

  function handleCancel() {
    cancelInvoice.mutate(invoice!.id, {
      onSuccess: () => {
        toast({ title: "Invoice cancelled" });
        navigate("/invoices");
      },
      onError: () =>
        toast({ title: "Failed to cancel", variant: "destructive" }),
    });
  }

  const printUrl = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1/invoices/${invoice.id}/pdf`;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="min-h-10 min-w-10 touch-manipulation"
              aria-label="Go back"
            >
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
            {(invoice.status === "pending" ||
              invoice.status === "partial" ||
              invoice.status === "draft") && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openEditModal}
                title="Edit invoice"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl space-y-4 p-4 ${pending > 0 ? "pb-28 md:pb-6" : ""}`}>
        {/* Amount hero */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-3xl font-extrabold tabular-nums">
                  {formatCurrency(total)}
                </p>
                {invoice.dueDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due: {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                {paidAmount > 0 && (
                  <p className="text-success">
                    Paid: {formatCurrency(paidAmount)}
                  </p>
                )}
                {pending > 0 && (
                  <p className="font-semibold text-destructive">
                    Due: {formatCurrency(pending)}
                  </p>
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
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (paidAmount / total) * 100)}%`,
                    }}
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
              invoice.dueDate && {
                label: "Due Date",
                value: formatDate(invoice.dueDate),
              },
              invoice.buyerGstin && {
                label: "Buyer GSTIN",
                value: invoice.buyerGstin,
              },
              invoice.placeOfSupply && {
                label: "Place of Supply",
                value: invoice.placeOfSupply,
              },
              invoice.reverseCharge && {
                label: "Reverse Charge",
                value: "Yes",
              },
            ]
              .filter(Boolean)
              .map((row) => (
                <div
                  key={(row as { label: string }).label}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-xs text-muted-foreground">
                    {(row as { label: string }).label}
                  </p>
                  <p className="text-sm font-medium">
                    {(row as { value: string }).value}
                  </p>
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
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 px-4 py-3"
                    >
                      <div className="col-span-5">
                        <p className="text-sm font-medium line-clamp-2">
                          {item.product?.name ?? item.productName ?? "Product"}
                        </p>
                        {item.product?.unit && (
                          <p className="text-[11px] text-muted-foreground">
                            {item.product.unit}
                          </p>
                        )}
                      </div>
                      <p className="col-span-2 text-right text-sm tabular-nums">
                        {item.quantity}
                      </p>
                      <p className="col-span-2 text-right text-sm tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </p>
                      <p className="col-span-3 text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(item.itemTotal)}
                      </p>
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
                <span className="text-success">
                  -{formatCurrency(discount)}
                </span>
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
              <div className="flex justify-between text-sm text-success">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Notes
              </p>
              <p className="text-sm">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* UPI QR — shown when there is a pending balance and a UPI VPA is configured */}
        {(() => {
          // UPI VPA lives in tenant.settings.upiVpa (stored as JSON blob)
          const tenantSettings = (meData as any)?.tenant?.settings ?? {};
          const upiVpa: string = tenantSettings.upiVpa ?? "";
          if (!upiVpa || pending <= 0) return null;
          const bizName: string =
            tenantSettings.shopName ??
            (meData as any)?.tenant?.legalName ??
            (meData as any)?.tenant?.name ??
            "Store";
          const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(bizName)}&am=${pending.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNo}`)}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(upiUri)}`;
          return (
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <p className="text-sm font-semibold">Pay via UPI</p>
                <img
                  src={qrUrl}
                  alt="UPI QR code"
                  className="h-40 w-40 rounded-lg border"
                  loading="lazy"
                />
                <div>
                  <p className="font-mono text-sm font-medium">{upiVpa}</p>
                  <p className="text-xs text-muted-foreground">
                    Scan with any UPI app · Amount: {formatCurrency(pending)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {waLink && (
            <Button
              asChild
              variant="outline"
              className="gap-2 border-success/30 text-success hover:bg-success/10"
            >
              <a href={waLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              downloadWithAuth(printUrl, `${invoice.invoiceNo}.pdf`)
            }
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
            className={`gap-2 ${invoice.customer?.email ? "border-info/30 text-info hover:bg-info/10" : "text-muted-foreground"}`}
            onClick={handleSendEmail}
            disabled={sendingEmail}
            title={
              invoice.customer?.email
                ? `Send to ${invoice.customer.email}`
                : "No email on customer"
            }
          >
            {sendingEmail ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Email Invoice
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              navigator
                .share?.({
                  title: invoice.invoiceNo,
                  text: `Invoice ${invoice.invoiceNo} — ${formatCurrency(total)}`,
                  url: window.location.href,
                })
                .catch(() => {})
            }
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={copyPortalLink}
            disabled={copyingLink}
            title="Copy shareable customer portal link"
          >
            {copyingLink ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Copy Portal Link
          </Button>
        </div>

        {/* Convert Proforma → Invoice */}
        {invoice.status === "proforma" && (
          <Button
            className="w-full gap-2 bg-info text-info-foreground hover:bg-info/90"
            onClick={() => {
              setConvertAmount(String(total));
              setConvertOpen(true);
            }}
          >
            <FileCheck className="h-4 w-4" /> Convert to Tax Invoice
          </Button>
        )}

        {/* Cancel button — only if not already cancelled/paid */}
        {invoice.status !== "cancelled" && invoice.status !== "paid" && (
          <Button
            variant="ghost"
            className="w-full min-h-11 text-destructive hover:bg-destructive/10 touch-manipulation"
            onClick={() => setConfirmCancel(true)}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancel Invoice
          </Button>
        )}
      </main>

      {/* Sticky Record Payment CTA — above BottomNav on mobile, at bottom on desktop */}
      {pending > 0 && (
        <div className="fixed left-0 right-0 z-20 p-3 bottom-[56px] md:bottom-0 bg-background/95 backdrop-blur border-t pb-safe">
          <Button
            className="w-full min-h-12 h-12 text-base font-bold gap-2 touch-manipulation"
            onClick={() =>
              navigate("/payment", {
                state: { invoiceId: invoice.id, customerId: invoice.customerId },
              })
            }
          >
            <Wallet className="h-5 w-5" /> Record Payment — {formatCurrency(pending)}
          </Button>
        </div>
      )}

      <BottomNav />

      {/* Cancel confirmation */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {invoice.invoiceNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invoice for {formatCurrency(total)}. This
              action cannot be undone.
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

      {/* Convert Proforma Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Convert {invoice.invoiceNo} to Tax Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will convert the proforma into a final tax invoice.
              Optionally record an initial payment.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Payment Amount (optional)
              </label>
              <Input
                type="number"
                min="0"
                placeholder={`Max ${formatCurrency(total)}`}
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={convertMethod} onValueChange={setConvertMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConvert}
              disabled={convertProforma.isPending}
            >
              {convertProforma.isPending ? "Converting…" : "Convert to Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {invoice?.invoiceNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="overflow-hidden rounded-lg border text-sm">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-2 py-2 text-center font-medium w-20">
                      Qty
                    </th>
                    <th className="px-1 py-2 text-center font-medium w-14">
                      Disc%
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="w-7" />
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => {
                    const lineTotal =
                      Math.round(
                        item.price *
                          item.qty *
                          (1 - (item.discount || 0) / 100) *
                          100,
                      ) / 100;
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2 text-sm">{item.name}</td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => editChangeQty(idx, -1)}
                              className="rounded p-0.5 hover:bg-muted"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center">{item.qty}</span>
                            <button
                              onClick={() => editChangeQty(idx, 1)}
                              className="rounded p-0.5 hover:bg-muted"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discount || ""}
                            onChange={(e) =>
                              editChangeDiscount(idx, Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-12 rounded border px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(lineTotal)}
                          {item.discount > 0 && (
                            <span className="block text-[10px] text-green-600">
                              -{item.discount}%
                            </span>
                          )}
                        </td>
                        <td className="pr-2 text-center">
                          <button
                            onClick={() => editRemoveItem(idx)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Textarea
              placeholder="Notes (optional)"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

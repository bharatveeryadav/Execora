/**
 * Public customer-facing invoice portal.
 * Accessible without login — URL: /pub/:id/:token
 * Shows invoice details, payment status, and PDF download.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Download, AlertCircle, Smartphone } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────

interface PortalInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  isProforma: boolean;
  createdAt: string;
  dueDate?: string;
  notes?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  upiVpa?: string;
  shopName?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  } | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineDiscountPercent?: number;
    lineTotal: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
  }>;
  hasPdf: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Paid
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
        <Clock className="h-4 w-4" /> Partially Paid
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
        <XCircle className="h-4 w-4" /> Cancelled
      </span>
    );
  }
  // pending / draft / proforma
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
      <Clock className="h-4 w-4" /> {status === "proforma" ? "Proforma" : "Unpaid"}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvoicePortal() {
  const { id, token } = useParams<{ id: string; token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal-invoice", id, token],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/pub/invoice/${id}/${token}`);
      if (!res.ok) throw new Error("not-found");
      const json = (await res.json()) as { invoice: PortalInvoice };
      return json.invoice;
    },
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <h1 className="text-xl font-bold text-slate-700">Invoice not found</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          This link may have expired or is invalid. Please contact the sender for a new link.
        </p>
      </div>
    );
  }

  const invoice = data;
  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const hasTax = invoice.taxAmount > 0;
  const hasDiscount = invoice.discountAmount > 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-lg">
        {/* Header card */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Invoice</p>
              <h1 className="text-2xl font-black text-slate-800">{invoice.invoiceNo}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <StatusBadge status={invoice.isProforma ? "proforma" : invoice.status} />
          </div>

          {invoice.customer && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Bill To</p>
              <p className="font-semibold text-slate-800">{invoice.customer.name}</p>
              {invoice.customer.phone && (
                <p className="text-sm text-slate-500">{invoice.customer.phone}</p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-slate-500">{invoice.customer.address}</p>
              )}
              {invoice.customer.gstin && (
                <p className="text-xs text-slate-400 mt-0.5">GSTIN: {invoice.customer.gstin}</p>
              )}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">Items</p>
          <div className="space-y-3">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × ₹{inr(item.unitPrice)}
                    {item.lineDiscountPercent ? (
                      <span className="ml-1 text-green-600">(-{item.lineDiscountPercent}%)</span>
                    ) : null}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800 shrink-0">₹{inr(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 mt-4 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{inr(invoice.subtotal)}</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-₹{inr(invoice.discountAmount)}</span>
              </div>
            )}
            {hasTax && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>GST</span>
                <span>₹{inr(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-800 pt-1 border-t border-slate-100">
              <span>Total</span>
              <span>₹{inr(invoice.totalAmount)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid</span>
                <span>₹{inr(invoice.paidAmount)}</span>
              </div>
            )}
          </div>

          {/* Amount due banner + Pay Now UPI (S12-04) */}
          {pending > 0 && invoice.status !== "cancelled" && (
            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-amber-700">Amount Due</span>
                <span className="text-lg font-black text-amber-700">₹{inr(pending)}</span>
              </div>
              {invoice.upiVpa && (
                <a
                  href={`upi://pay?pa=${encodeURIComponent(invoice.upiVpa)}&pn=${encodeURIComponent(invoice.shopName ?? "Execora")}&am=${pending.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoiceNo}`)}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 transition-colors"
                >
                  <Smartphone className="h-5 w-5" />
                  Pay Now (UPI)
                </a>
              )}
            </div>
          )}
          {pending === 0 && invoice.status === "paid" && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-semibold text-green-700">Fully Paid — Thank you!</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Notes</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* PDF Download */}
        {invoice.hasPdf && (
          <a
            href={`${API_BASE}/pub/invoice/${id}/${token}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 transition-colors"
          >
            <Download className="h-5 w-5" />
            Download PDF Invoice
          </a>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by Execora · Secure invoice portal
        </p>
      </div>
    </div>
  );
}

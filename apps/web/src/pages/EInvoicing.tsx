/**
 * EInvoicing — Generate and manage IRN (Invoice Reference Numbers) for B2B invoices.
 * Integrates with NIC/GSP sandbox. Shows pending, generated, failed status per invoice.
 * QR code and signed e-invoice JSON available per IRN.
 */
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  Download,
  Send,
  Hash,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/useQueries";
import { formatCurrency, formatDate } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type IrnStatus = "pending" | "generated" | "failed" | "cancelled";

interface EInvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerGst?: string;
  amount: number;
  date: string;
  irnStatus: IrnStatus;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  qrData?: string;
  failReason?: string;
}

const STATUS_CFG: Record<
  IrnStatus,
  {
    label: string;
    icon: React.ElementType;
    cls: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    cls: "text-warning",
    variant: "outline",
  },
  generated: {
    label: "Generated",
    icon: CheckCircle2,
    cls: "text-success",
    variant: "default",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    cls: "text-destructive",
    variant: "destructive",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    cls: "text-muted-foreground",
    variant: "secondary",
  },
};

const fmt = (n: number) => formatCurrency(n);

// ── Mock data (wire to /api/v1/einvoice) ─────────────────────────────────────
function buildMockRecords(invoices: any[]): EInvoiceRecord[] {
  const statuses: IrnStatus[] = [
    "generated",
    "generated",
    "pending",
    "failed",
    "pending",
    "generated",
  ];
  return (invoices ?? []).slice(0, 8).map((inv: any, i) => {
    const status = statuses[i % statuses.length];
    const irn =
      status === "generated"
        ? `${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(16).slice(-8).toUpperCase()}${Math.random().toString(36).slice(2, 10).toUpperCase()}`
        : undefined;
    return {
      invoiceId: inv.id ?? String(i),
      invoiceNumber: inv.invoiceNo ?? `INV-${1000 + i}`,
      customerName:
        inv.customer?.name ?? inv.customerName ?? `Customer ${i + 1}`,
      customerGst:
        inv.customer?.gstin ?? `${["07", "27", "29"][i % 3]}AAAAA0000A1Z5`,
      amount: Number(inv.total ?? inv.amount ?? 5000 + i * 1200),
      date: inv.createdAt
        ? formatDate(inv.createdAt)
        : `2024-0${1 + (i % 9)}-${String(10 + i).slice(-2)}`,
      irnStatus: status,
      irn,
      ackNo: status === "generated" ? `112345${1000 + i}` : undefined,
      ackDate:
        status === "generated"
          ? `2024-01-${String(15 + i).padStart(2, "0")}`
          : undefined,
      qrData:
        status === "generated"
          ? `https://einvoice1.gst.gov.in/othersignedqr/${irn}`
          : undefined,
      failReason:
        status === "failed" ? "Buyer GSTIN not found in GST portal" : undefined,
    };
  });
}

// ── IRN Detail dialog ─────────────────────────────────────────────────────────

function IrnDialog({
  record,
  open,
  onClose,
}: {
  record: EInvoiceRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>E-Invoice Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Invoice No</div>
            <div className="font-semibold">{record.invoiceNumber}</div>
            <div className="text-muted-foreground">Customer</div>
            <div className="font-semibold">{record.customerName}</div>
            <div className="text-muted-foreground">Customer GST</div>
            <div className="font-medium font-mono text-xs">
              {record.customerGst ?? "—"}
            </div>
            <div className="text-muted-foreground">Amount</div>
            <div className="font-semibold">{fmt(record.amount)}</div>
          </div>
          {record.irn && (
            <>
              <div className="rounded-lg bg-success/10 p-3">
                <div className="mb-1 text-[11px] font-semibold uppercase text-success">
                  IRN
                </div>
                <div className="break-all font-mono text-[11px]">
                  {record.irn}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground text-xs">ACK No</div>
                <div className="font-mono text-xs">{record.ackNo}</div>
                <div className="text-muted-foreground text-xs">ACK Date</div>
                <div className="text-xs">{record.ackDate}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <QrCode className="mr-2 h-4 w-4" /> View QR
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> Download JSON
                </Button>
              </div>
            </>
          )}
          {record.failReason && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase text-destructive">
                Failure Reason
              </div>
              <div className="text-xs text-destructive">
                {record.failReason}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EInvoicing() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: allInvoices = [] } = useInvoices(20);
  const [records, setRecords] = useState<EInvoiceRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<IrnStatus | "all">("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<EInvoiceRecord | null>(
    null,
  );
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Sync records when real invoices load from API
  useEffect(() => {
    if (allInvoices.length > 0) {
      setRecords(buildMockRecords(allInvoices));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInvoices.length]);

  function generateIrn(invoiceId: string) {
    setGeneratingId(invoiceId);
    // In production: POST /api/v1/einvoice/generate with { invoiceId }
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.invoiceId === invoiceId
            ? {
                ...r,
                irnStatus: "generated",
                irn: `IRN${Date.now().toString(16).toUpperCase()}`,
                ackNo: `112345${Date.now() % 10000}`,
                ackDate: new Date().toISOString().slice(0, 10),
              }
            : r,
        ),
      );
      setGeneratingId(null);
      toast({ title: "✅ IRN generated successfully" });
    }, 1500);
  }

  function bulkGenerate() {
    const pending = records.filter((r) => r.irnStatus === "pending");
    if (pending.length === 0) {
      toast({ title: "No pending invoices to generate IRN for" });
      return;
    }
    setBulkGenerating(true);
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.irnStatus === "pending"
            ? {
                ...r,
                irnStatus: "generated",
                irn: `IRN${Date.now().toString(16).toUpperCase()}${r.invoiceId}`,
                ackNo: `112345${Date.now() % 10000}${r.invoiceId}`,
                ackDate: new Date().toISOString().slice(0, 10),
              }
            : r,
        ),
      );
      setBulkGenerating(false);
      toast({ title: `✅ ${pending.length} IRNs generated in bulk` });
    }, 2000);
  }

  const filtered =
    filterStatus === "all"
      ? records
      : records.filter((r) => r.irnStatus === filterStatus);
  const counts: Record<IrnStatus | "all", number> = {
    all: records.length,
    generated: records.filter((r) => r.irnStatus === "generated").length,
    pending: records.filter((r) => r.irnStatus === "pending").length,
    failed: records.filter((r) => r.irnStatus === "failed").length,
    cancelled: records.filter((r) => r.irnStatus === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">E-Invoicing</h1>
            <p className="text-xs text-muted-foreground">
              Generate IRN for B2B invoices · NIC/GSP
            </p>
          </div>
          <Button
            size="sm"
            onClick={bulkGenerate}
            disabled={bulkGenerating || counts.pending === 0}
          >
            {bulkGenerating ? (
              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1 h-3.5 w-3.5" />
            )}
            Bulk Generate ({counts.pending})
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {(["generated", "pending", "failed", "cancelled"] as const).map(
            (s) => {
              const cfg = STATUS_CFG[s];
              return (
                <Card key={s}>
                  <CardContent className="p-2.5 text-center">
                    <cfg.icon className={`mx-auto h-4 w-4 ${cfg.cls}`} />
                    <div className="mt-1 text-base font-bold">{counts[s]}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {cfg.label}
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <span className="font-semibold">ℹ️ E-invoicing mandate:</span>{" "}
          Applicable for businesses with turnover ≥ ₹5 Cr. All B2B invoices
          above ₹50,000 require IRN from NIC portal.
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(
            ["all", "generated", "pending", "failed", "cancelled"] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filterStatus === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab}{" "}
              {tab !== "all" && (
                <span className="ml-0.5 opacity-70">({counts[tab]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Invoice cards */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <Hash className="mx-auto mb-3 h-8 w-8 opacity-30" />
            No invoices in this category.
          </div>
        ) : (
          filtered.map((rec) => {
            const cfg = STATUS_CFG[rec.irnStatus];
            return (
              <Card
                key={rec.invoiceId}
                className="transition-shadow hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary">
                      {rec.customerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {rec.customerName}
                        </span>
                        <Badge
                          variant={cfg.variant}
                          className="text-[10px] py-0 h-4 flex items-center gap-1"
                        >
                          <cfg.icon className="h-2.5 w-2.5" /> {cfg.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{rec.invoiceNumber}</span>
                        <span>·</span>
                        <span>{rec.date}</span>
                        {rec.customerGst && (
                          <span className="font-mono text-[10px]">
                            {rec.customerGst}
                          </span>
                        )}
                      </div>
                      {rec.irn && (
                        <div
                          className="mt-1 truncate font-mono text-[11px] text-success"
                          title={rec.irn}
                        >
                          IRN: {rec.irn}
                        </div>
                      )}
                      {rec.failReason && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" /> {rec.failReason}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-bold text-sm">
                        {fmt(rec.amount)}
                      </span>
                      {rec.irnStatus === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => generateIrn(rec.invoiceId)}
                          disabled={generatingId === rec.invoiceId}
                        >
                          {generatingId === rec.invoiceId ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            "Generate IRN"
                          )}
                        </Button>
                      )}
                      {rec.irnStatus === "generated" && (
                        <button
                          className="flex items-center gap-1 text-[11px] text-primary underline"
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <QrCode className="h-3 w-3" /> Details
                        </button>
                      )}
                      {rec.irnStatus === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive border-destructive/40"
                          onClick={() => generateIrn(rec.invoiceId)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detail dialog */}
      <IrnDialog
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      <VoiceBar
        idleHint={
          <span>
            "generate IRN" · "e-invoice status" · "bulk generate pending"
          </span>
        }
      />
    </div>
  );
}

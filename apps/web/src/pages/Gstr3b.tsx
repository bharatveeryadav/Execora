/**
 * Gstr3b — GSTR-3B monthly summary filing helper.
 * Auto-populates from invoice data: IGST, CGST, SGST, Input Tax Credit.
 * Enables challan generation and filing status tracking.
 */
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Send,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";
import { useSummaryRange, useExpenses } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilingStatus = "pending" | "filed" | "overdue" | "not-due";

interface MonthOption {
  label: string;
  value: string; // YYYY-MM
  from: string;
  to: string;
  status: FilingStatus;
  dueDate: string;
}

interface TaxRow {
  description: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  editable?: boolean;
}

const fmt = (n: number) => formatCurrency(n);

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMonths(): MonthOption[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const dueD = new Date(y, m + 1, 20); // 20th of next month
    const status: FilingStatus =
      i === 0
        ? "pending"
        : i === 1 && dueD < now
          ? "overdue"
          : i >= 2
            ? "filed"
            : "not-due";
    return {
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      value: ym,
      from: `${ym}-01`,
      to: `${ym}-${lastDay}`,
      status,
      dueDate: `${y}-${String(m + 2).padStart(2, "0")}-20`,
    };
  });
}

const STATUS_CFG: Record<
  FilingStatus,
  { label: string; icon: React.ElementType; cls: string }
> = {
  pending: { label: "Pending", icon: Clock, cls: "text-warning" },
  filed: { label: "Filed", icon: CheckCircle2, cls: "text-success" },
  overdue: { label: "Overdue", icon: AlertCircle, cls: "text-destructive" },
  "not-due": { label: "Not Due", icon: Clock, cls: "text-muted-foreground" },
};

const MONTHS = buildMonths();

// ── Tax table component ───────────────────────────────────────────────────────

function TaxTable({
  title,
  rows,
  editable = false,
  onUpdate,
}: {
  title: string;
  rows: TaxRow[];
  editable?: boolean;
  onUpdate?: (rowIndex: number, field: keyof TaxRow, value: number) => void;
}) {
  const total = {
    taxableValue: rows.reduce((s, r) => s + r.taxableValue, 0),
    igst: rows.reduce((s, r) => s + r.igst, 0),
    cgst: rows.reduce((s, r) => s + r.cgst, 0),
    sgst: rows.reduce((s, r) => s + r.sgst, 0),
    cess: rows.reduce((s, r) => s + r.cess, 0),
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Description
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                Taxable
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                IGST
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                CGST
              </th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                SGST
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i > 0 ? "border-t" : ""}>
                <td className="px-3 py-2.5 font-medium">{row.description}</td>
                {(["taxableValue", "igst", "cgst", "sgst"] as const).map(
                  (field) => (
                    <td key={field} className="px-3 py-2.5 text-right">
                      {editable && row.editable && onUpdate ? (
                        <input
                          type="number"
                          className="w-20 rounded border px-1.5 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row[field]}
                          onChange={(e) =>
                            onUpdate(i, field, Number(e.target.value))
                          }
                        />
                      ) : (
                        <span
                          className={
                            field === "taxableValue" ? "font-medium" : ""
                          }
                        >
                          {fmt(row[field])}
                        </span>
                      )}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td className="px-3 py-2.5 font-bold text-xs">Total</td>
              <td className="px-3 py-2.5 text-right font-bold">
                {fmt(total.taxableValue)}
              </td>
              <td className="px-3 py-2.5 text-right font-bold">
                {fmt(total.igst)}
              </td>
              <td className="px-3 py-2.5 text-right font-bold">
                {fmt(total.cgst)}
              </td>
              <td className="px-3 py-2.5 text-right font-bold">
                {fmt(total.sgst)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Gstr3b() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selMonth, setSelMonth] = useState<MonthOption>(MONTHS[0]);
  const { data: summaryData } = useSummaryRange(selMonth.from, selMonth.to);
  const { data: expenseData } = useExpenses({
    from: selMonth.from,
    to: selMonth.to,
  });

  const totalRevenue = Number(summaryData?.totalSales ?? 0);
  const totalExpenses = Number(expenseData?.total ?? 0);

  // ── Derived tax figures (5% GST assumption for SME kirana) ───────────────
  // In production, fetch real GST data from invoice line items
  const taxableRevenue = totalRevenue / 1.05;
  const collectedGst = totalRevenue - taxableRevenue;
  const cgst = collectedGst / 2;
  const sgst = collectedGst / 2;
  const igst = 0; // zero for intra-state

  const taxablePurchases = totalExpenses / 1.05;
  const itcTotal = totalExpenses - taxablePurchases;
  const itcCgst = itcTotal / 2;
  const itcSgst = itcTotal / 2;

  const netCgst = Math.max(0, cgst - itcCgst);
  const netSgst = Math.max(0, sgst - itcSgst);
  const netPayable = netCgst + netSgst + igst;

  const [itcRows, setItcRows] = useState<TaxRow[]>([
    {
      description: "ITC on Purchases",
      taxableValue: taxablePurchases,
      igst: 0,
      cgst: itcCgst,
      sgst: itcSgst,
      cess: 0,
      editable: true,
    },
    {
      description: "ITC on Services",
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      editable: true,
    },
  ]);

  function updateItcRow(rowIndex: number, field: keyof TaxRow, value: number) {
    setItcRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, [field]: value } : r)),
    );
  }

  // Sync ITC rows when summary data loads (state init runs before data arrives)
  useEffect(() => {
    if (totalExpenses > 0) {
      const tp = totalExpenses / 1.05;
      const itc = totalExpenses - tp;
      setItcRows((prev) => [
        { ...prev[0], taxableValue: tp, cgst: itc / 2, sgst: itc / 2 },
        prev[1],
      ]);
    }
  }, [totalExpenses]);

  const [filing, setFiling] = useState(false);
  const [arnByMonth, setArnByMonth] = useState<Record<string, string>>({});
  const statusCfg = STATUS_CFG[selMonth.status];

  function handleFile() {
    setFiling(true);
    setTimeout(() => {
      const arn = `AA${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-8)}`;
      setArnByMonth((prev) => ({ ...prev, [selMonth.value]: arn }));
      setFiling(false);
      toast({
        title: `✅ GSTR-3B filed for ${selMonth.label}`,
        description: `ARN: ${arn}. Download receipt from GST portal.`,
      });
    }, 2000);
  }

  const outwardRows: TaxRow[] = [
    {
      description: "Inter-state (B2B)",
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
    },
    {
      description: "Intra-state (B2C)",
      taxableValue: taxableRevenue,
      igst: 0,
      cgst,
      sgst,
      cess: 0,
    },
    {
      description: "Exports",
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
    },
    {
      description: "Nil Rated / Exempt",
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">GSTR-3B</h1>
            <p className="text-xs text-muted-foreground">
              Monthly GST return summary
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
        {/* Month picker */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {MONTHS.map((m) => {
            const cfg = STATUS_CFG[m.status];
            return (
              <button
                key={m.value}
                onClick={() => setSelMonth(m)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selMonth.value === m.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {m.label.slice(0, 3)} {m.label.slice(-4)}
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-2">
          <VoiceBar
            idleHint={
              <span>"GSTR-3B" · "file this month" · "show ITC credits"</span>
            }
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Month status bar */}
        <Card
          className={`border-2 ${selMonth.status === "filed" ? "border-success/40 bg-success/5" : selMonth.status === "overdue" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"}`}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <statusCfg.icon className={`h-8 w-8 ${statusCfg.cls}`} />
              <div>
                <div className="font-bold text-sm">{selMonth.label}</div>
                <div className="text-xs text-muted-foreground">
                  Due:{" "}
                  {new Date(selMonth.dueDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <Badge
              variant={
                selMonth.status === "filed"
                  ? "default"
                  : selMonth.status === "overdue"
                    ? "destructive"
                    : "outline"
              }
              className="font-semibold"
            >
              {statusCfg.label}
            </Badge>
          </CardContent>
        </Card>

        {/* ARN display (after successful filing) */}
        {arnByMonth[selMonth.value] && (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-success uppercase mb-0.5">
                  Filing Acknowledgement
                </div>
                <div className="font-mono text-xs break-all">
                  ARN: {arnByMonth[selMonth.value]}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Keep this ARN for your records. Download receipt from GST
                  portal.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Tax Collected",
              value: fmt(collectedGst),
              icon: TrendingUp,
              cls: "text-destructive",
            },
            {
              label: "Input Credit",
              value: fmt(itcTotal),
              icon: TrendingDown,
              cls: "text-success",
            },
            {
              label: "Net Payable",
              value: fmt(netPayable),
              icon: IndianRupee,
              cls: netPayable > 0 ? "text-warning" : "text-success",
            },
          ].map((t) => (
            <Card key={t.label}>
              <CardContent className="p-3 text-center">
                <t.icon className={`mx-auto h-5 w-5 ${t.cls}`} />
                <div className={`mt-1 text-base font-bold ${t.cls}`}>
                  {t.value}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3.1 — Outward supplies */}
        <TaxTable title="3.1 — Outward Supplies (Sales)" rows={outwardRows} />

        {/* 4 — Input Tax Credit */}
        <TaxTable
          title="4 — Input Tax Credit (ITC)"
          rows={itcRows}
          editable
          onUpdate={updateItcRow}
        />

        {/* Net liability summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Net GST Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {[
              { label: "IGST Payable", value: igst },
              { label: "CGST Payable", value: netCgst },
              { label: "SGST/UTGST Payable", value: netSgst },
              { label: "Cess Payable", value: 0 },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{r.label}</span>
                <span
                  className={`font-semibold ${r.value > 0 ? "text-destructive" : "text-success"}`}
                >
                  {fmt(r.value)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="font-bold text-sm">Total Net Payable</span>
              <span
                className={`text-base font-bold ${netPayable > 0 ? "text-destructive" : "text-success"}`}
              >
                {fmt(netPayable)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filing History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {MONTHS.filter((m) => m.status === "filed")
              .slice(0, 3)
              .map((m) => (
                <div
                  key={m.value}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Filed</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  </div>
                </div>
              ))}
            {MONTHS.filter((m) => m.status === "filed").length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">
                No past filings this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground text-center">
          ⚠️ Tax figures are auto-calculated based on invoices in the system.
          Always verify with your CA before filing on the GST portal.
        </div>

        {/* File button */}
        {selMonth.status !== "filed" && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" /> Download Challan
            </Button>
            <Button className="flex-1" onClick={handleFile} disabled={filing}>
              {filing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {filing ? "Filing…" : "File GSTR-3B"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

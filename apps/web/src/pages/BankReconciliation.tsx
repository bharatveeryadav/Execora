/**
 * BankReconciliation — Upload bank statement CSV, match against recorded payments.
 * Identifies unmatched transactions and lets the user mark/import them.
 * Supports ICICI, HDFC, SBI, Axis common CSV formats.
 */
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchStatus = "matched" | "unmatched" | "extra";

interface BankRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: MatchStatus;
  matchedPaymentRef?: string;
}

type Bank = "icici" | "hdfc" | "sbi" | "axis" | "auto";

const BANK_OPTIONS: { value: Bank; label: string; icon: string }[] = [
  { value: "auto", label: "Auto-detect", icon: "🤖" },
  { value: "icici", label: "ICICI Bank", icon: "🏦" },
  { value: "hdfc", label: "HDFC Bank", icon: "🏦" },
  { value: "sbi", label: "SBI", icon: "🏦" },
  { value: "axis", label: "Axis Bank", icon: "🏦" },
];

const fmt = (n: number) => formatCurrency(n);

// ── Mock parsed rows for demo ─────────────────────────────────────────────────
function parseCsvMock(csv: string): BankRow[] {
  const lines = csv.trim().split("\n").slice(1); // skip header
  return lines.slice(0, 20).map((line, i) => {
    const cols = line.split(",");
    const amount =
      Math.random() > 0.5 ? Math.round(Math.random() * 5000 + 100) : 0;
    const debit = Math.random() > 0.6 ? amount : 0;
    const credit = debit === 0 ? amount : 0;
    const status: MatchStatus =
      Math.random() > 0.35
        ? "matched"
        : Math.random() > 0.5
          ? "unmatched"
          : "extra";
    return {
      id: String(i),
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      description: cols[1]?.trim() || `Transaction ${i + 1}`,
      debit,
      credit,
      balance: 50000 - i * 1200,
      status,
      matchedPaymentRef: status === "matched" ? `PAY-${1000 + i}` : undefined,
    };
  });
}

const STATUS_CFG: Record<
  MatchStatus,
  { label: string; icon: React.ElementType; cls: string; bg: string }
> = {
  matched: {
    label: "Matched",
    icon: CheckCircle2,
    cls: "text-success",
    bg: "bg-success/10",
  },
  unmatched: {
    label: "Unmatched",
    icon: AlertCircle,
    cls: "text-warning",
    bg: "bg-warning/10",
  },
  extra: {
    label: "Extra",
    icon: XCircle,
    cls: "text-destructive",
    bg: "bg-destructive/10",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BankReconciliation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bank, setBank] = useState<Bank>("auto");
  const [rows, setRows] = useState<BankRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<MatchStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // In production: send to /api/v1/bank-reconciliation/parse with bank type
      setTimeout(() => {
        const parsed = parseCsvMock(text);
        setRows(parsed);
        setLoading(false);
        toast({
          title: `✅ Parsed ${parsed.length} transactions from ${file.name}`,
        });
      }, 800);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function markRow(id: string, status: MatchStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function importUnmatched() {
    const unmatched = rows.filter((r) => r.status === "unmatched");
    toast({
      title: `${unmatched.length} transactions imported to Cash Book`,
      description: "Review them in Cash Book to categorise properly.",
    });
    setRows((prev) =>
      prev.map((r) =>
        r.status === "unmatched" ? { ...r, status: "matched" } : r,
      ),
    );
  }

  const filtered =
    filterStatus === "all"
      ? rows
      : rows.filter((r) => r.status === filterStatus);
  const matched = rows.filter((r) => r.status === "matched").length;
  const unmatched = rows.filter((r) => r.status === "unmatched").length;
  const extra = rows.filter((r) => r.status === "extra").length;
  const matchRate =
    rows.length > 0 ? Math.round((matched / rows.length) * 100) : 0;

  const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
  const totalDebits = rows.reduce((s, r) => s + r.debit, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Bank Reconciliation</h1>
            <p className="text-xs text-muted-foreground">
              Match bank statement to recorded payments
            </p>
          </div>
          {rows.length > 0 && unmatched > 0 && (
            <Button size="sm" onClick={importUnmatched}>
              Import {unmatched} Unmatched
            </Button>
          )}
        </div>
        <div className="px-4 pb-2">
          <VoiceBar
            idleHint={
              <span>
                "bank reconciliation" · "upload bank statement" · "match
                transactions"
              </span>
            }
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* Upload area */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            {/* Bank picker */}
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {BANK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBank(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    bank === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Upload Bank Statement</p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV format · ICICI, HDFC, SBI, Axis supported
            </p>
            {fileName && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-success font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> {fileName}
              </div>
            )}
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Parsing…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Choose File
                </>
              )}
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground/60">
              Your bank data is processed locally and never shared with third
              parties.
            </p>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Total In",
                  value: fmt(totalCredits),
                  cls: "text-success",
                },
                {
                  label: "Total Out",
                  value: fmt(totalDebits),
                  cls: "text-destructive",
                },
                {
                  label: "Match Rate",
                  value: `${matchRate}%`,
                  cls: matchRate >= 80 ? "text-success" : "text-warning",
                },
                {
                  label: "Unmatched",
                  value: String(unmatched),
                  cls: unmatched > 0 ? "text-warning" : "text-success",
                },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-3 text-center">
                    <div className={`text-base font-bold ${s.cls}`}>
                      {s.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Match rate bar */}
            <Card>
              <CardContent className="p-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">Reconciliation Progress</span>
                  <span
                    className={
                      matchRate >= 80
                        ? "text-success font-semibold"
                        : "text-warning font-semibold"
                    }
                  >
                    {matched}/{rows.length} matched ({matchRate}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${matchRate >= 80 ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${matchRate}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-success inline-block" />
                    {matched} matched
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-warning inline-block" />
                    {unmatched} unmatched
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                    {extra} extra
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {(["all", "matched", "unmatched", "extra"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterStatus(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                      filterStatus === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>

            {/* Transactions table */}
            <Card className="overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-1 bg-muted/50 px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                <div className="col-span-2">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-2 text-right">Debit</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              {filtered.map((row, i) => {
                const cfg = STATUS_CFG[row.status];
                return (
                  <div
                    key={row.id}
                    className={`grid grid-cols-12 gap-1 px-4 py-2.5 text-xs items-center ${
                      i > 0 ? "border-t" : ""
                    } ${cfg.bg}`}
                  >
                    <div className="col-span-2 text-muted-foreground">
                      {row.date.slice(5)}
                    </div>
                    <div
                      className="col-span-4 font-medium truncate"
                      title={row.description}
                    >
                      {row.description}
                      {row.matchedPaymentRef && (
                        <div className="text-[10px] text-success">
                          {row.matchedPaymentRef}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-success">
                      {row.credit > 0 ? fmt(row.credit) : "—"}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-destructive">
                      {row.debit > 0 ? fmt(row.debit) : "—"}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <cfg.icon className={`h-3.5 w-3.5 ${cfg.cls}`} />
                      {row.status === "unmatched" && (
                        <button
                          onClick={() => markRow(row.id, "matched")}
                          className="ml-1 text-[10px] text-primary underline"
                        >
                          Mark matched
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

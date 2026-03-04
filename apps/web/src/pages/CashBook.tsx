/**
 * CashBook — Real-time cash register.
 * Read-only view combining:
 *   • Cash IN  → customer payment records
 *   • Cash OUT → expense records
 * Data is server-persisted; no localStorage.
 */
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Banknote, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import VoiceBar from "@/components/VoiceBar";
import { useCashbook } from "@/hooks/useQueries";
import type { CashEntry } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CashBook() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today());

  const { data, isLoading, refetch } = useCashbook({ from, to });

  const entries: CashEntry[] = data?.entries ?? [];
  const totalIn   = data?.totalIn ?? 0;
  const totalOut  = data?.totalOut ?? 0;
  const balance   = data?.balance ?? 0;

  const todayStr = today();
  const todayEntries = entries.filter((e) => e.date?.slice(0, 10) === todayStr);
  const todayIn  = todayEntries.filter((e) => e.type === "in").reduce((s, e)  => s + e.amount, 0);
  const todayOut = todayEntries.filter((e) => e.type === "out").reduce((s, e) => s + e.amount, 0);

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
              <h1 className="text-lg font-bold">Cash Book</h1>
              <p className="text-xs text-muted-foreground">Live view · payments + expenses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/expenses")}>
              <Plus className="mr-1 h-4 w-4" /> Expense
            </Button>
          </div>
        </div>
        <VoiceBar idleHint={
          <><span className="font-medium">"Aaj ka cash dikhao"</span> · <span>"Is mahine ka balance?"</span></>
        } />
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Balance card */}
        <Card className={`border-none shadow-md ${balance >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Net Cash Flow</p>
            </div>
            <p className={`text-4xl font-extrabold tabular-nums ${balance >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
              {balance >= 0 ? "+" : "-"}{fmt(balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {from} → {to} · {entries.length} transactions
            </p>
          </CardContent>
        </Card>

        {/* Today summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <ArrowUpRight className="h-8 w-8 rounded-full bg-green-100 p-1.5 text-green-600 dark:bg-green-900/30" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Today In</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(todayIn)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <ArrowDownLeft className="h-8 w-8 rounded-full bg-red-100 p-1.5 text-red-500 dark:bg-red-900/30" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Today Out</p>
                <p className="text-xl font-bold text-destructive">{fmt(todayOut)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period totals */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-none shadow-sm bg-green-50/50 dark:bg-green-950/10">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total In (period)</p>
              <p className="text-lg font-bold text-green-700">{fmt(totalIn)}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-red-50/50 dark:bg-red-950/10">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Out (period)</p>
              <p className="text-lg font-bold text-destructive">{fmt(totalOut)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 items-center">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-card text-sm" />
          <span className="text-muted-foreground text-sm shrink-0">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-card text-sm" />
        </div>

        {/* Transaction list */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions</p>
          <span className="text-xs text-muted-foreground">{entries.length} entries</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No transactions</p>
            <p className="text-xs text-muted-foreground">Collect payments or add expenses to see entries here</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/customers")}>Record Payment</Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/expenses")}>Add Expense</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  txn.type === "in" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                }`}>
                  {txn.type === "in"
                    ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                    : <ArrowDownLeft className="h-4 w-4 text-destructive" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{txn.category}</p>
                  {txn.note && <p className="truncate text-xs text-muted-foreground">{txn.note}</p>}
                  <p className="text-[10px] text-muted-foreground">{txn.date?.slice(0, 10)}</p>
                </div>
                <p className={`shrink-0 font-bold tabular-nums ${txn.type === "in" ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                  {txn.type === "in" ? "+" : "-"}{fmt(txn.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

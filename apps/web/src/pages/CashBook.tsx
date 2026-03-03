/**
 * CashBook — Simple cash & bank register.
 * Vyapar feature parity: track cash in hand, cash out, running balance.
 * Data stored in localStorage. Voice commands supported.
 */
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
type TxnType = "in" | "out";

interface CashTxn {
  id: string;
  type: TxnType;
  amount: number;
  category: string;
  note: string;
  date: string;
  createdAt: number;
}

const IN_CATEGORIES = ["Sales Collection", "Cash Deposit", "Loan Received", "Capital Intro", "Other Income"];
const OUT_CATEGORIES = ["Cash Payment", "Bank Deposit", "Expense", "Supplier Payment", "Owner Withdraw", "Other"];

const LS_KEY = "execora:cashbook";

function load(): CashTxn[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); }
  catch { return []; }
}
function save(list: CashTxn[]) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
const today = () => new Date().toISOString().slice(0, 10);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CashBook() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [txns, setTxns] = useState<CashTxn[]>(load);
  const [open, setOpen] = useState(false);
  const [txnType, setTxnType] = useState<TxnType>("in");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Sales Collection");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());

  function openForm(type: TxnType) {
    setTxnType(type);
    setCategory(type === "in" ? "Sales Collection" : "Cash Payment");
    setAmount(""); setNote(""); setDate(today());
    setOpen(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const txn: CashTxn = {
      id: `ct-${Date.now()}`,
      type: txnType,
      amount: amt,
      category,
      note: note.trim(),
      date,
      createdAt: Date.now(),
    };
    const updated = [txn, ...txns];
    setTxns(updated);
    save(updated);
    toast({ title: txnType === "in" ? "Cash In added ✅" : "Cash Out added", description: `${category} · ${fmt(amt)}` });
    setOpen(false);
  }

  const balance = useMemo(() =>
    txns.reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0), [txns]);

  const todayTxns = useMemo(() => {
    const t = today();
    return txns.filter((tx) => tx.date === t);
  }, [txns]);

  const todayIn = todayTxns.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const todayOut = todayTxns.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);

  const cats = txnType === "in" ? IN_CATEGORIES : OUT_CATEGORIES;

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
              <p className="text-xs text-muted-foreground">Real-time cash register</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => openForm("out")}>
              <ArrowDownLeft className="mr-1 h-4 w-4" /> Out
            </Button>
            <Button size="sm" onClick={() => openForm("in")}>
              <ArrowUpRight className="mr-1 h-4 w-4" /> In
            </Button>
          </div>
        </div>
        <VoiceBar idleHint={
          <><span className="font-medium">"Cash mein 2000 aaya"</span> · <span>"1500 supplier ko diya"</span></>
        } />
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {/* Balance card */}
        <Card className={`border-none shadow-md ${balance >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cash in Hand</p>
            </div>
            <p className={`text-4xl font-extrabold tabular-nums ${balance >= 0 ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
              {balance >= 0 ? "+" : "-"}{fmt(balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              All time · {txns.length} transactions
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

        {/* Transaction list */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Transactions</p>
          <span className="text-xs text-muted-foreground">{txns.length} entries</span>
        </div>

        {txns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="text-xs text-muted-foreground">Tap Cash In / Out or say "2000 cash aaya"</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openForm("in")}>+ Cash In</Button>
              <Button size="sm" variant="outline" onClick={() => openForm("out")}>+ Cash Out</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((txn) => (
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
                  <p className="text-[10px] text-muted-foreground">{txn.date}</p>
                </div>
                <p className={`shrink-0 font-bold tabular-nums ${txn.type === "in" ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                  {txn.type === "in" ? "+" : "-"}{fmt(txn.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Transaction Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{txnType === "in" ? "💚 Cash In" : "🔴 Cash Out"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 pt-2">
            {/* Type toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              {(["in", "out"] as TxnType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTxnType(t); setCategory(t === "in" ? "Sales Collection" : "Cash Payment"); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    t === txnType
                      ? t === "in" ? "bg-green-500 text-white" : "bg-destructive text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t === "in" ? "↑ Cash In" : "↓ Cash Out"}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2000" required min={1} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!amount}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

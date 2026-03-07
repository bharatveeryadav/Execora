/**
 * Pure billing business logic — zero side effects, no DOM, no RN.
 * Used identically in web and mobile.
 */

import type { BillingItem, Product } from "./types";

// ── Indian numbering system ──────────────────────────────────────────────────

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function words(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n]!;
  if (n < 100)
    return TENS[Math.floor(n / 10)]! + (n % 10 ? " " + ONES[n % 10]! : "");
  return (
    ONES[Math.floor(n / 100)]! +
    " Hundred" +
    (n % 100 ? " " + words(n % 100) : "")
  );
}

export function amountInWords(amount: number): string {
  const int = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - int) * 100);
  if (int === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(int / 10_000_000);
  const lakh = Math.floor((int % 10_000_000) / 100_000);
  const thousand = Math.floor((int % 100_000) / 1_000);
  const remainder = int % 1_000;

  if (crore) parts.push(words(crore) + " Crore");
  if (lakh) parts.push(words(lakh) + " Lakh");
  if (thousand) parts.push(words(thousand) + " Thousand");
  if (remainder) parts.push(words(remainder));

  let result = parts.join(" ") + " Rupees";
  if (paise) result += " and " + words(paise) + " Paise";
  return result + " Only";
}

// ── Amount formatting ────────────────────────────────────────────────────────

export function inr(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Item amount computation ──────────────────────────────────────────────────

export function computeAmount(
  rate: string,
  qty: string,
  discount: string,
): number {
  const r = parseFloat(rate) || 0;
  const q = parseFloat(qty) || 1;
  const d = parseFloat(discount) || 0;
  return Math.round(r * q * (1 - d / 100) * 100) / 100;
}

// ── GST computation ──────────────────────────────────────────────────────────

export const DEFAULT_GST_RATE = 18; // %

export function computeTotals(
  items: BillingItem[],
  discountPct: string,
  discountFlat: string,
  withGst: boolean,
  roundOffEnabled: boolean,
) {
  const subtotal = items.reduce((s, it) => s + it.amount, 0);

  let discountAmt = 0;
  if (discountPct && parseFloat(discountPct) > 0) {
    discountAmt =
      Math.round(subtotal * (parseFloat(discountPct) / 100) * 100) / 100;
  } else if (discountFlat && parseFloat(discountFlat) > 0) {
    discountAmt = parseFloat(discountFlat);
  }

  const taxableAmt = Math.round((subtotal - discountAmt) * 100) / 100;
  const gstAmt = withGst
    ? Math.round(taxableAmt * (DEFAULT_GST_RATE / 100) * 100) / 100
    : 0;
  const cgst = withGst ? Math.round((gstAmt / 2) * 100) / 100 : 0;
  const sgst = cgst;
  const grandTotal = Math.round((taxableAmt + gstAmt) * 100) / 100;
  const roundOff = roundOffEnabled ? Math.round(grandTotal) - grandTotal : 0;
  const finalTotal = Math.round((grandTotal + roundOff) * 100) / 100;

  return {
    subtotal,
    discountAmt,
    taxableAmt,
    gstAmt,
    cgst,
    sgst,
    grandTotal,
    roundOff,
    finalTotal,
  };
}

// ── Fuzzy product search ─────────────────────────────────────────────────────

export function fuzzyScore(text: string, q: string): number {
  if (!q) return 0;
  const t = text.toLowerCase();
  const s = q.toLowerCase();
  if (t.startsWith(s)) return 100;
  if (t.includes(s)) return 50;
  // character-subsequence check
  let i = 0;
  for (const ch of t) {
    if (ch === s[i]) i++;
    if (i === s.length) return 20;
  }
  return 0;
}

export function fuzzyFilter(products: Product[], query: string): Product[] {
  if (!query.trim()) return [];
  return products
    .map((p) => ({ p, score: fuzzyScore(p.name, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ p }) => p);
}

// ── Draft helpers ────────────────────────────────────────────────────────────

export const DRAFT_MAX_AGE_MINUTES = 480; // 8 hours

export function isDraftExpired(savedAt: number): boolean {
  return (Date.now() - savedAt) / 60_000 > DRAFT_MAX_AGE_MINUTES;
}

// ── Payment split ────────────────────────────────────────────────────────────

export const PAY_MODES = [
  { id: "cash" as const, label: "Cash", icon: "💵" },
  { id: "upi" as const, label: "UPI", icon: "📱" },
  { id: "card" as const, label: "Card", icon: "💳" },
  { id: "credit" as const, label: "Credit", icon: "📒" },
];

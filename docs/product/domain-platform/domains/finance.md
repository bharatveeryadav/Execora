# Domain: Finance

> Odoo equivalent: `addons/account` (payment + bookkeeping side)
>
> Owner squad: Finance + Compliance Squad
>
> Status: Ledger and payments active — full accounting engine pending

---

## Mission

Own the authoritative ledger, payment lifecycle, bookkeeping, and tax records. Finance is the one path for all money movements — payments in, payments out, expense postings, bank reconciliation, and financial reports. No other domain may post ledger entries directly.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                                                       |
| ------------------- | -------------------------------------------------------------------------------------- |
| Accounting Software | `finance.accounting`, `finance.payments`, `finance.reconciliation`, `finance.expenses` |
| Billing Software    | `finance.payments` (collect payment)                                                   |
| Invoicing Software  | `finance.payments`, `finance.tax-ledger`                                               |
| POS Software        | `finance.payments` (settlement)                                                        |

---

## Sub-modules

```
finance/
  accounting/
    ledger/              ← customer and supplier ledger (party-wise)
    journal/             ← journal entries (debit/credit postings)
    chart-of-accounts/   ← CoA: assets, liabilities, income, expenses
    trial-balance/       ← aggregated debit/credit balance snapshot
    balance-sheet/       ← assets vs liabilities report
    profit-loss/         ← revenue vs expense P&L
    cashbook/            ← cash inflow/outflow by date
    daybook/             ← all transactions for a given date

  payments/
    payment-in/          ← receive money from customer
    payment-out/         ← pay money to supplier/vendor
    settlement/          ← allocate payment against specific invoices
    payment-allocation/  ← partial and advance allocation logic

  reconciliation/
    bank-reconciliation/ ← match bank statement to ledger entries

  expenses/              ← employee/business expense capture and posting

  tax-ledger/            ← GST tax account postings (output/input tax)
```

---

## Capabilities

### Ledger and journal

- customer and supplier party ledger
- debit/credit journal entries auto-posted from domain events
- chart of accounts (CoA) with standard Indian account groups
- trial balance, balance sheet, P&L

### Payments

- collect payment: cash, card, UPI, bank transfer, credit
- multi-payment per invoice (split payment)
- advance payment and carry-forward to future invoices
- payment-out: record vendor payment against purchase bills
- partial payment tracking (invoice stays open until fully settled)

### Bookkeeping reports

- cashbook and daybook
- party-wise outstanding receivables and payables
- ageing report (0-30, 31-60, 61-90, 90+ days)

### Reconciliation

- import bank statement (CSV/PDF)
- auto-match transactions against posted payments
- flag unmatched entries for manual review

### Expenses

- capture expense with attachment
- categorise against CoA account
- post to expense report for approval

---

## Events Produced

| Event                     | Trigger                 | Consumers                                       |
| ------------------------- | ----------------------- | ----------------------------------------------- |
| `PaymentRecorded`         | payment confirmed       | sales (update invoice payment state), reporting |
| `LedgerPosted`            | journal entry confirmed | reporting                                       |
| `ExpensePosted`           | expense approved        | reporting, purchases                            |
| `ReconciliationCompleted` | bank recon done         | reporting                                       |

## Events Consumed

| Event                 | From            | Action                                |
| --------------------- | --------------- | ------------------------------------- |
| `InvoiceCreated`      | sales.invoicing | post receivable journal entry         |
| `InvoiceCancelled`    | sales.invoicing | reverse journal entry                 |
| `PurchaseBillPosted`  | purchases       | post payable journal entry            |
| `PosSessionClosed`    | sales.pos       | aggregate and post session settlement |
| `SubscriptionChanged` | platform        | post subscription billing entry       |

---

## API Contracts

```
POST   /api/v1/payments                          recordPayment
GET    /api/v1/payments                          listPayments (party, date, type)
POST   /api/v1/payments/:id/allocate             allocatePayment
POST   /api/v1/payments/:id/reverse              reversePayment
POST   /api/v1/payments/mixed                    recordMixedPayment (multi-tender)
GET    /api/v1/ledger/customer/:partyId          getCustomerLedger
GET    /api/v1/ledger/summary/:partyId           getLedgerSummary
GET    /api/v1/accounting/trial-balance          getTrialBalance
GET    /api/v1/accounting/profit-loss            getProfitLoss (dateFrom, dateTo)
GET    /api/v1/accounting/balance-sheet          getBalanceSheet (asOf)
GET    /api/v1/accounting/cashbook               getCashbook (date)
POST   /api/v1/expenses                          createExpense
GET    /api/v1/expenses                          listExpenses
POST   /api/v1/reconciliation/import             importBankStatement
GET    /api/v1/reconciliation/unmatched          getUnmatchedTransactions
```

---

## Backend Package (current + target)

```
packages/finance/src/          (or packages/modules/src/finance/)
├── ledger.ts       ← ✅ DONE: recordPayment, reversePayment, recordMixedPayment,
│                              addCredit, getCustomerLedger, getLedgerSummary,
│                              getRecentTransactions
├── expense.ts      ← createExpense, approveExpense, listExpenses, postExpense
├── journal.ts      ← postJournalEntry, reverseJournalEntry, listJournalEntries
├── gst.ts          ← computeGST, validateGSTIN, resolveGSTRate, getHSNRate
├── gstr1.ts        ← generateGSTR1, computeGSTR1Summary, exportGSTR1
└── types.ts
```

---

## State Machine: Payment

```
pending → confirmed → allocated
                   ↓
                reversed
```

---

## Guardrails

- **one payment path**: all money movements go through `finance.payments` — no direct ledger writes from sales or purchases routes
- journal entries are auto-generated from domain events — never manually crafted in routes
- GST tax postings use `finance.tax-ledger` — separate from party ledger
- bank reconciliation operates on imported statements — never on live transaction data directly
- `gst.ts` and `gstr1.ts` are owned by Finance, not Compliance (compliance owns IRP integration)

---

## Current Status

| Sub-module                 | Status                         |
| -------------------------- | ------------------------------ |
| ledger (7 flat fns)        | ✅ active                      |
| payment recording          | ✅ active                      |
| payment reversal           | ✅ active                      |
| mixed payment              | ✅ active                      |
| GST computation            | ✅ active (in invoice service) |
| GSTR-1 generation          | ✅ active                      |
| expense capture            | ⏳ partial                     |
| journal / CoA              | ⏳ pending                     |
| trial balance              | ⏳ pending                     |
| P&L / balance sheet        | ⏳ pending                     |
| cashbook / daybook         | ⏳ pending                     |
| bank reconciliation        | ⏳ pending                     |
| advance payment allocation | ⏳ pending                     |

# Module: Accounting

> Codebase package: `@execora/modules` → `accounting/`
>
> PRD source: `domains/finance.md`
>
> Owner squad: Finance + Compliance Squad
>
> Status: Ledger and payments active — full accounting engine (CoA, journal, reconciliation) pending

---

## Mission

Own the authoritative ledger, payment lifecycle, bookkeeping, and tax records. Accounting is the one path for all money movements — payments in, payments out, expense postings, bank reconciliation, and financial reports. No other module may post ledger entries directly.

---

## Products Enabled

| Product             | Features used                                      |
| ------------------- | -------------------------------------------------- |
| Accounting Software | all features                                       |
| Billing Software    | `payments/payment-in` (collect payment at counter) |
| Invoicing Software  | `payments/payment-in`, `tax-ledger/gst-ledger`     |
| POS Software        | `payments/settlement` (session close)              |

---

## Feature Modules

```
accounting/
  ledger/
    ledger-posting/          ← create debit/credit journal entries from events
    party-ledger/            ← customer and supplier balance views
    journal/                 ← full journal with debit/credit audit trail
    chart-of-accounts/       ← CoA: assets, liabilities, income, expenses (Indian groups)
    trial-balance/           ← aggregated balance snapshot by account
    balance-sheet/           ← assets vs liabilities report
    profit-loss/             ← revenue vs cost P&L by period
    cashbook/                ← net cash inflow/outflow by date
    daybook/                 ← all transaction lines for a given date

  payments/
    payment-in/              ← receive money: cash, card, UPI, NEFT, RTGS, credit
    payment-out/             ← pay vendor: bank transfer, cheque, UPI
    settlement/              ← allocate payment to one or more invoices
    payment-allocation/      ← partial and advance allocation logic
    ageing/                  ← receivable/payable ageing (0-30, 31-60, 61-90, 90+)

  reconciliation/
    bank-reconciliation/     ← match bank statement to ledger payments
    unmatched-review/        ← flag and resolve unmatched entries

  expenses/
    expense-entry/           ← capture expense with category + attachment
    expense-approval/        ← approve or reject expense before posting

  tax-ledger/
    gst-ledger/              ← output and input tax account postings
    itc-tracking/            ← input tax credit eligible vs ineligible
```

---

## Feature Module Contracts

Each feature module exposes:

```
accounting/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. payment must reference open invoice)
  __tests__/        ← unit tests per command/query
```

---

## Capabilities

### Ledger and journal

- customer and supplier party ledger (running balance per party)
- debit/credit journal entries auto-posted from domain events (`InvoiceCreated`, `PaymentRecorded`, `PurchaseBillPosted`)
- chart of accounts (CoA) with standard Indian account groups (capital, fixed assets, current assets, liabilities, income, direct/indirect expenses)
- trial balance: aggregated debit vs credit per account
- balance sheet: assets vs liabilities snapshot
- profit and loss: revenue vs expenditure by date range

### Daily reports

- cashbook: net cash flow by date (opening + receipts - payments = closing)
- daybook: all ledger lines for a given date in sequence

### Payments

- payment-in: collect from customer — cash, card, UPI, bank; link to invoice(s)
- payment-out: pay to vendor — bank transfer, cheque, UPI; link to purchase bill
- multi-payment per transaction (split payment modes)
- advance payment posted to party ledger; auto-allocated to future invoices
- partial payment tracking: invoice stays `partial` until fully settled

### Bank reconciliation

- upload bank statement (CSV / PDF)
- auto-match transactions against posted payments by amount + date
- flag unmatched entries for manual review
- mark reconciled and update ledger status

### Expenses

- capture expense line: category, amount, GST, attachment
- categorise against CoA account
- approval step before ledger posting
- post approved expense to expense report and ledger

### GST tax ledger

- output tax (CGST/SGST/IGST collected on sales)
- input tax credit (ITC from purchase bills)
- net tax position = output − eligible ITC
- per-period GST liability summary

---

## Events Produced

| Event                     | Trigger                       | Consumers                                           |
| ------------------------- | ----------------------------- | --------------------------------------------------- |
| `PaymentRecorded`         | payment confirmed             | invoicing (update invoice payment state), reporting |
| `LedgerPosted`            | journal entry created         | reporting                                           |
| `ExpensePosted`           | expense approved and posted   | reporting, purchases                                |
| `ReconciliationCompleted` | bank reconciliation finalised | reporting                                           |

## Events Consumed

| Event                 | From            | Action                                    |
| --------------------- | --------------- | ----------------------------------------- |
| `InvoiceCreated`      | invoicing       | post receivable journal entry             |
| `InvoiceCancelled`    | invoicing       | reverse journal entry                     |
| `PurchaseBillPosted`  | ocr (purchases) | post payable journal entry                |
| `PosSessionClosed`    | pos             | aggregate and post POS session settlement |
| `SubscriptionChanged` | platform        | post subscription billing entry           |

---

## API Contracts

```
POST   /api/v1/payments                          recordPayment
GET    /api/v1/payments                          listPayments (party, date, type, status)
GET    /api/v1/payments/:id                      getPayment
DELETE /api/v1/payments/:id                      cancelPayment

GET    /api/v1/ledger/party/:partyId             getPartyLedger (date range)
GET    /api/v1/ledger/journal                    getJournal (date range, account)
GET    /api/v1/ledger/trial-balance              getTrialBalance (period)
GET    /api/v1/ledger/balance-sheet              getBalanceSheet (date)
GET    /api/v1/ledger/profit-loss                getProfitLoss (from, to)
GET    /api/v1/ledger/cashbook                   getCashbook (date)
GET    /api/v1/ledger/daybook                    getDaybook (date)
GET    /api/v1/ledger/ageing                     getAgeing (type: receivable|payable)

POST   /api/v1/expenses                          createExpense
GET    /api/v1/expenses                          listExpenses (period, category, status)
PATCH  /api/v1/expenses/:id/approve              approveExpense
PATCH  /api/v1/expenses/:id/reject               rejectExpense

POST   /api/v1/bank-reconciliation/upload        uploadBankStatement
GET    /api/v1/bank-reconciliation/unmatched     getUnmatchedEntries
POST   /api/v1/bank-reconciliation/match         matchEntry

GET    /api/v1/tax-ledger/summary                getGSTLedgerSummary (period)
GET    /api/v1/tax-ledger/itc                    getITCSummary (period)
```

---

## Backend Package (current)

```
packages/modules/src/accounting/
  index.ts                     ← barrel export
  ledger.ts                    ← recordPayment, getLedger, getPartyBalance (active)
  expense.ts                   ← createExpense, listExpenses (active)
  ledger.service.ts             ← LedgerService: P&L, aging, payment velocity (active)
```

## Backend Package (target — feature split)

```
packages/modules/src/accounting/
  index.ts
  ledger/
    ledger-posting/
    party-ledger/
    journal/
    chart-of-accounts/
    trial-balance/
    balance-sheet/
    profit-loss/
    cashbook/
    daybook/
  payments/
    payment-in/
    payment-out/
    settlement/
    payment-allocation/
    ageing/
  reconciliation/
    bank-reconciliation/
    unmatched-review/
  expenses/
    expense-entry/
    expense-approval/
  tax-ledger/
    gst-ledger/
    itc-tracking/
```

---

## Current Implementation Status

| Feature               | Status     | Notes                                   |
| --------------------- | ---------- | --------------------------------------- |
| `ledger-posting`      | ✅ Active  | `recordPayment`, `getLedger`            |
| `party-ledger`        | ✅ Active  | party balance queries                   |
| `profit-loss`         | ✅ Active  | `LedgerService.getProfitAndLoss()`      |
| `ageing`              | ✅ Active  | `LedgerService.getAgingReport()`        |
| `expense-entry`       | ✅ Active  | create/list expenses                    |
| `payment-in`          | ✅ Active  | multi-mode payment recording            |
| `journal`             | 🔲 Pending | full journal (debit/credit lines)       |
| `chart-of-accounts`   | 🔲 Pending | CoA management                          |
| `trial-balance`       | 🔲 Pending | aggregated balance snapshot             |
| `balance-sheet`       | 🔲 Pending | assets vs liabilities                   |
| `cashbook`            | 🔲 Pending | date-wise cash flow                     |
| `bank-reconciliation` | 🔲 Pending | statement import + auto-match           |
| `expense-approval`    | 🔲 Pending | approval workflow                       |
| `itc-tracking`        | 🔲 Pending | input tax credit eligible vs ineligible |

---

## Engineering Rules

- `accounting` is the ONLY module that posts ledger entries — no direct DB writes from `invoicing`, `ocr`, or `pos`
- all money movements flow through `accounting/payments`
- events (`InvoiceCreated`, `PurchaseBillPosted`) drive journal posting — do not inline ledger writes in other modules
- payment idempotency: each `recordPayment` call must carry a unique `paymentRef` or `idempotencyKey`
- tax-ledger always derives from posted transactions — never calculated on the fly for statutory use

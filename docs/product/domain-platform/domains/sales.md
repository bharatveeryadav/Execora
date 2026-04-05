# Domain: Sales

> Odoo equivalent: `addons/sale` + `addons/account` (invoice side) + `addons/point_of_sale`
>
> Owner squad: Sales Domain Squad
>
> Status: Core invoice/billing active — POS and pos-offline pending

---

## Mission

Own all revenue-generating interactions: billing, invoicing, POS checkout, quotations, proforma, delivery challans, credit notes, and recurring billing. Sales domain produces the invoice as the source of truth for finance and inventory.

---

## Products Enabled By This Domain

| Product            | Domains consumed                                                    |
| ------------------ | ------------------------------------------------------------------- |
| Billing Software   | `sales.billing`, `sales.pos` (basic)                                |
| Invoicing Software | `sales.invoicing`, `sales.billing`                                  |
| POS Software       | `sales.pos`, `sales.billing`, `inventory.stock`, `finance.payments` |

---

## Sub-modules

```
sales/
  invoicing/
    invoice/             ← full invoice lifecycle (create, confirm, cancel, return)
    quotation/           ← quote to order conversion
    proforma/            ← proforma invoice generation
    delivery-challan/    ← DC with goods dispatch workflows
    recurring/           ← scheduled auto-billing
    returns/             ← invoice return and settlement
    template-engine/     ← custom invoice PDF templates
    print-engine/        ← thermal / A4 print and share
    numbering/           ← invoice series, financial year reset
    payment-state/       ← unpaid / partial / paid FSM

  pos/
    billing/             ← quick counter billing
    cart/                ← line item management, discounts
    checkout/            ← single-screen multi-payment
    session/             ← counter session open/close/reconcile
    receipt/             ← thermal receipt rendering + share
    offline-sync/        ← local store + background sync
    multi-counter/       ← parallel counter support per location

  billing/
    pricing/             ← product price resolution
    party-pricing/       ← customer-specific prices and discounts
    channel-pricing/     ← retail vs wholesale rate handling
    promotions/          ← discount rules and offer codes
    item-calculation/    ← line total, discount, tax calc
    weight-pricing/      ← weighing-scale integration pricing
    tax-calculation/     ← GST rate selection per item/party
    totals/              ← invoice-level tax and round-off totals

  returns/               ← sales returns and credit note triggers
```

---

## Capabilities

### Billing and invoicing

- professional templates and custom branding
- print variants: A4, A5, thermal receipt
- quotation → proforma → invoice → challan workflow
- GST-compliant invoice (CGST/SGST/IGST/CESS)
- QR-based payment collection (UPI)
- multi-payment method per invoice (cash, card, UPI, credit)
- payment reminder triggers (→ CRM domain event)
- party-wise item pricing and retail-vs-wholesale rate handling
- separate commercial invoice and statutory e-invoice workflows

### POS

- fast cart checkout (barcode-first flow)
- single-screen multi-payment experience
- counter session open/close/reconcile
- hardware: barcode scanner, weighing scale, thermal printer, cash drawer, EDC
- offline-first: local SQLite store, background sync when online
- synchronized sales and stock deduction (via event to inventory)

### Returns and credit notes

- full and partial returns
- credit note linking to original invoice
- restocking trigger to inventory domain

---

## Events Produced

| Event                       | Trigger                 | Consumers                                                                                    |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `InvoiceCreated`            | invoice confirmed       | finance (ledger posting), inventory (stock deduct), compliance (e-invoice eligibility check) |
| `InvoiceCancelled`          | invoice voided          | finance (reverse ledger), inventory (restock)                                                |
| `CreditNoteCreated`         | return/credit applied   | finance (credit ledger entry)                                                                |
| `QuotationConverted`        | quote → invoice         | sales.invoicing                                                                              |
| `PosSessionClosed`          | counter session end     | finance (settlement posting), reporting                                                      |
| `RecurringInvoiceScheduled` | auto-billing configured | sales.invoicing (fire at schedule time)                                                      |

## Events Consumed

| Event               | From                  | Action                                          |
| ------------------- | --------------------- | ----------------------------------------------- |
| `PaymentRecorded`   | finance.payments      | update invoice payment state                    |
| `EInvoiceIssued`    | compliance.einvoicing | attach IRN + signed QR to invoice PDF           |
| `StockInsufficient` | inventory.stock       | warn at checkout / block confirm if strict mode |

---

## API Contracts

```
POST   /api/v1/invoices                   createInvoice
GET    /api/v1/invoices/:id               getInvoice
PATCH  /api/v1/invoices/:id/confirm       confirmInvoice
PATCH  /api/v1/invoices/:id/cancel        cancelInvoice
POST   /api/v1/invoices/:id/credit-note   createCreditNote
GET    /api/v1/invoices                   listInvoices (filters: status, party, date)
POST   /api/v1/quotations                 createQuotation
POST   /api/v1/pos/sessions               openPosSession
POST   /api/v1/pos/sessions/:id/close     closePosSession
POST   /api/v1/pos/checkout               posCheckout
```

---

## Backend Package

```
packages/sales/src/
├── invoice.ts         ← createInvoice, confirmInvoice, cancelInvoice, listInvoices
├── credit-note.ts     ← createCreditNote, applyCreditNote
├── draft.ts           ← saveDraft, loadDraft, deleteDraft
├── quotation.ts       ← createQuotation, convertToInvoice
├── pos-session.ts     ← openSession, closeSession, syncOfflineBatch
└── types.ts
```

---

## State Machine: Invoice Status

```
draft → pending → partial → paid
         ↓
      cancelled
```

Valid statuses: `draft | pending | partial | paid | cancelled`
Never use `issued` (legacy — removed).

---

## Guardrails

- one invoice numbering path — `sales.invoicing.numbering` owns all series
- stock deduction is triggered by event, never by direct service call from sales
- payment state is computed from finance domain events, not stored redundantly
- POS offline data must replay through same invoice creation contract as online flow
- templates and PDF generation are isolated to `sales.invoicing.template-engine`

---

## Current Status

| Sub-module               | Status     |
| ------------------------ | ---------- |
| invoice CRUD             | ✅ active  |
| invoice confirm / cancel | ✅ active  |
| credit note              | ✅ active  |
| draft save/load          | ✅ active  |
| GST calculation          | ✅ active  |
| PDF + print              | ✅ active  |
| quotation                | ⏳ pending |
| proforma / challan       | ⏳ pending |
| recurring billing        | ⏳ pending |
| POS checkout             | ⏳ pending |
| POS offline sync         | ⏳ pending |
| party-wise pricing       | ⏳ pending |
| template engine (custom) | ⏳ pending |

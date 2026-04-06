# Module: Invoicing

> Codebase package: `@execora/modules` → `invoicing/`
>
> PRD source: `domains/sales.md` (invoicing section) + `domains/crm.md`
>
> Owner squad: Sales Domain Squad
>
> Status: Invoice create/list/cancel + customer CRUD + reminders active — quotation, proforma, delivery challan, recurring, templates pending

---

## Mission

Own the full invoice lifecycle (draft → pending → partial → paid → cancelled), document variants (quotation, proforma, delivery challan, credit note, recurring), party management (customers and suppliers), and payment reminder orchestration. Invoicing produces the invoice as the source of truth that downstream modules (accounting, inventory, e-invoicing, compliance) react to.

---

## Products Enabled

| Product             | Features used                                                         |
| ------------------- | --------------------------------------------------------------------- |
| Invoicing Software  | all features                                                          |
| Billing Software    | `invoice/create`, `invoice/payment-state`, `parties/customer-profile` |
| Accounting Software | `parties/party-ledger` (reads finance), `reminders/payment-reminders` |
| POS Software        | `invoice/create` (POS draft → confirm), `parties/customer-profile`    |

---

## Feature Modules

```
invoicing/
  invoice/
    create-invoice/          ← create with items, customer, GST; assign series number
    update-invoice/          ← update draft fields before confirmation
    confirm-invoice/         ← lock invoice, post event, trigger PDF
    cancel-invoice/          ← void with reason, post reverse event
    payment-state/           ← FSM: draft → pending → partial → paid → cancelled
    numbering/               ← invoice series, financial year reset, prefix config
    returns/                 ← partial/full return → credit note trigger

  documents/
    quotation/               ← quote: products, prices, validity; convert to invoice
    proforma/                ← proforma invoice for advance or shipping docs
    delivery-challan/        ← goods dispatch note, link to invoice on confirmation
    recurring/               ← scheduled auto-billing (weekly/monthly/quarterly)
    credit-note/             ← issue against original invoice, reverse entries

  output/
    template-engine/         ← custom branded invoice PDF templates
    print-engine/            ← A4, A5, thermal receipt, WhatsApp PDF share
    preview/                 ← real-time totals preview before confirm
    dispatch/                ← send via email / WhatsApp / SMS / download

  parties/
    customer-profile/        ← create, update, search, archive customers
    supplier-profile/        ← create, update, search suppliers
    party-ledger/            ← outstanding balance view per party (reads accounting)
    credit-limit/            ← set limit, enforce at invoice confirm
    fuzzy-search/            ← Indian name search (Hindi/English/Devanagari + phone)

  reminders/
    payment-reminders/       ← schedule, send, track overdue invoice reminders
    reminder-templates/      ← message templates per language/tone
    reminder-history/        ← log of sent reminders + delivery status
```

---

## Feature Module Contracts

Each feature module exposes:

```
invoicing/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. only draft invoices can be confirmed)
  __tests__/        ← unit tests per command/query
```

---

## Invoice Status FSM

```
draft → pending → partial → paid
  ↓         ↓        ↓
cancelled cancelled cancelled
```

Valid transitions:

| From      | To          | Trigger                               |
| --------- | ----------- | ------------------------------------- |
| `draft`   | `pending`   | `confirmInvoice`                      |
| `pending` | `partial`   | `recordPayment` (amount < total)      |
| `partial` | `paid`      | `recordPayment` (amount = remaining)  |
| `pending` | `paid`      | `recordPayment` (amount = total)      |
| `draft`   | `cancelled` | `cancelInvoice`                       |
| `pending` | `cancelled` | `cancelInvoice` with reason           |
| `partial` | `cancelled` | `cancelInvoice` (accounting reversal) |

> ⚠️ Never use `issued` — legacy only. Valid statuses: `draft | pending | partial | paid | cancelled`

---

## Capabilities

### Invoice lifecycle

- create invoice: line items, customer, GST, discounts, shipping, notes
- real-time preview: running totals, per-line CGST/SGST/IGST, round-off
- confirm invoice: lock fields, assign invoice number, post `InvoiceCreated` event
- cancel invoice: void with reason, post `InvoiceCancelled` event
- payment tracking: invoice stays `partial` until fully settled by accounting
- returns: full/partial return → credit note auto-generated

### Document variants

- **Quotation**: product + price proposal with validity period; one-click convert to invoice
- **Proforma**: pre-payment or shipping document; not a tax invoice
- **Delivery challan**: goods outward note; linked to invoice on delivery confirmation
- **Credit note**: linked return against original invoice with reverse journal entry
- **Recurring billing**: scheduled auto-create at daily/weekly/monthly/quarterly intervals

### Invoice output

- print formats: A4, A5, thermal receipt (80mm)
- branded PDF templates: logo, header, footer, color scheme
- dispatch channels: email attachment, WhatsApp PDF, SMS link, download
- QR code for UPI payment collection embedded in PDF

### Invoice numbering

- configurable prefix per series (e.g. `INV-`, `TAX-`, `QUO-`)
- financial year auto-reset (April 1 reset by default)
- manual override for starting sequence
- separate series per location or counter (optional)

### Customer and supplier management

- customer profile: name, phone, email, GSTIN, billing/shipping address, pricing tier
- supplier profile: GSTIN, PAN, bank details, payment terms, credit limit
- fuzzy name search: Levenshtein + metaphone for Indian names (Hindi, Gujarati, transliteration)
- customer credit limit: set limit → enforce at invoice confirm (warn or block)
- GSTIN validation: format + checksum validation on create/update

### Party ledger

- outstanding receivable per customer (total invoiced − total paid)
- outstanding payable per supplier
- ageing: current, 30d, 60d, 90d+ buckets
- reads from `accounting/ledger` — invoicing does not store ledger state

### Payment reminders

- schedule reminder after N days overdue
- send via WhatsApp, SMS, email, or in-app notification
- configurable message templates per tone (polite, firm, final notice)
- delivery status tracking (sent, delivered, read, failed)
- reminder history per invoice and per customer

---

## Events Produced

| Event                       | Trigger                     | Consumers                                                                                 |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `InvoiceCreated`            | invoice confirmed           | accounting (ledger posting), inventory (stock deduction), e-invoicing (eligibility check) |
| `InvoiceCancelled`          | invoice voided              | accounting (reverse ledger), inventory (restock), e-invoicing (auto-cancel IRN)           |
| `CreditNoteCreated`         | return/credit applied       | accounting (credit ledger entry)                                                          |
| `QuotationConverted`        | quote → invoice             | invoicing/create-invoice                                                                  |
| `RecurringInvoiceScheduled` | auto-billing configured     | invoicing (fire at scheduled time)                                                        |
| `ReminderScheduled`         | overdue reminder configured | integrations (WhatsApp/SMS/email dispatch)                                                |

## Events Consumed

| Event               | From        | Action                                                  |
| ------------------- | ----------- | ------------------------------------------------------- |
| `PaymentRecorded`   | accounting  | update invoice payment state (pending → partial → paid) |
| `EInvoiceIssued`    | e-invoicing | attach IRN + signed QR to invoice PDF                   |
| `StockInsufficient` | inventory   | warn at confirm / block if strict stock mode enabled    |

---

## API Contracts

```
POST   /api/v1/invoices                          createInvoice
GET    /api/v1/invoices                          listInvoices (customer, status, date, type)
GET    /api/v1/invoices/:id                      getInvoice
PATCH  /api/v1/invoices/:id                      updateInvoice (draft only)
POST   /api/v1/invoices/:id/confirm              confirmInvoice
POST   /api/v1/invoices/:id/cancel               cancelInvoice
GET    /api/v1/invoices/:id/pdf                  downloadInvoicePDF
POST   /api/v1/invoices/:id/send                 sendInvoice (email/WhatsApp/SMS)
POST   /api/v1/invoices/:id/preview              previewInvoiceTotals

POST   /api/v1/invoices/quotations               createQuotation
POST   /api/v1/invoices/quotations/:id/convert   convertToInvoice
POST   /api/v1/invoices/proforma                 createProforma
POST   /api/v1/invoices/credit-notes             createCreditNote
GET    /api/v1/invoices/credit-notes             listCreditNotes

GET    /api/v1/customers                         listCustomers (search, tag, gstin)
POST   /api/v1/customers                         createCustomer
GET    /api/v1/customers/:id                     getCustomer
PATCH  /api/v1/customers/:id                     updateCustomer
GET    /api/v1/customers/:id/ledger              getCustomerLedger (date range)
GET    /api/v1/customers/:id/outstanding         getCustomerOutstanding

GET    /api/v1/suppliers                         listSuppliers
POST   /api/v1/suppliers                         createSupplier
GET    /api/v1/suppliers/:id                     getSupplier
PATCH  /api/v1/suppliers/:id                     updateSupplier

POST   /api/v1/reminders                         scheduleReminder
GET    /api/v1/reminders                         listReminders (invoice, customer, status)
DELETE /api/v1/reminders/:id                     cancelReminder
```

---

## Backend Package (current)

```
packages/modules/src/invoicing/
  index.ts                        ← barrel export (re-exports below)
  (re-exports from sales/, crm/, purchases/vendors/, modules/invoice-customer-reminder/)

packages/modules/src/sales/invoicing/
  create-invoice.ts               ← createInvoice (active)
  types.ts

packages/modules/src/sales/credit-notes/
  credit-note.ts                  ← createCreditNote (active)

packages/modules/src/crm/parties/
  customer-profile.ts             ← createCustomer, searchCustomers, updateCustomer (active)
  types.ts

packages/modules/src/purchases/vendors/
  supplier-profile.ts             ← supplier CRUD (active)

packages/modules/src/modules/invoice/
  invoice.service.ts              ← InvoiceService: PDF, dispatch, numbering (active)

packages/modules/src/modules/customer/
  customer.service.ts             ← CustomerService: search, balance, favorites (active)

packages/modules/src/modules/reminder/
  reminder.service.ts             ← ReminderService: templates, send logic (active)
```

## Backend Package (target — feature split)

```
packages/modules/src/invoicing/
  index.ts
  invoice/
    create-invoice/
    confirm-invoice/
    cancel-invoice/
    payment-state/
    numbering/
    returns/
  documents/
    quotation/
    proforma/
    delivery-challan/
    recurring/
    credit-note/
  output/
    template-engine/
    print-engine/
    dispatch/
  parties/
    customer-profile/
    supplier-profile/
    party-ledger/
    credit-limit/
    fuzzy-search/
  reminders/
    payment-reminders/
    reminder-templates/
```

---

## Current Implementation Status

| Feature                       | Status     | Notes                                        |
| ----------------------------- | ---------- | -------------------------------------------- |
| `invoice/create-invoice`      | ✅ Active  | full item, tax, discount support             |
| `invoice/payment-state`       | ✅ Active  | draft → pending → partial → paid → cancelled |
| `invoice/numbering`           | ✅ Active  | series, FY reset                             |
| `invoice/returns`             | ✅ Active  | credit note trigger                          |
| `documents/credit-note`       | ✅ Active  | create and issue                             |
| `parties/customer-profile`    | ✅ Active  | create, update, search, GSTIN validation     |
| `parties/supplier-profile`    | ✅ Active  | create, update, list                         |
| `parties/fuzzy-search`        | ✅ Active  | Indian name + Devanagari fuzzy matching      |
| `reminders/payment-reminders` | ✅ Active  | schedule, send, WhatsApp/SMS                 |
| `output/pdf-dispatch`         | ✅ Active  | PDF generation, email/WhatsApp send          |
| `documents/quotation`         | 🔲 Pending | quote → invoice conversion                   |
| `documents/proforma`          | 🔲 Pending | proforma generation                          |
| `documents/delivery-challan`  | 🔲 Pending | goods outward note                           |
| `documents/recurring`         | 🔲 Pending | scheduled auto-billing                       |
| `output/template-engine`      | 🔲 Pending | custom branded templates                     |
| `parties/credit-limit`        | 🔲 Pending | credit limit enforcement                     |

---

## Engineering Rules

- invoice status transitions must go through `payment-state` FSM — no direct DB field updates
- `InvoiceCreated` event is the trigger for accounting ledger posting, inventory stock deduction, and e-invoicing eligibility — do not inline these in invoice creation logic
- customer GSTIN must be validated (format + checksum) on every `createCustomer` and `updateCustomer` call
- invoice numbering must use a DB sequence (`$queryRaw`) for race-condition-safe sequential numbers
- `draft` invoices are mutable; `pending` / `partial` / `paid` invoices are immutable except via explicit state commands

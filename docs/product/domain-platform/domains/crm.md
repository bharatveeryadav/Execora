# Domain: CRM

> Odoo equivalent: `addons/crm` + `addons/contacts` + `addons/mail` (reminders)
>
> Owner squad: Sales Domain Squad
>
> Status: Customer profile + reminders active — credit controls and communication history pending

---

## Mission

Own all party relationships (customers and suppliers as contacts), communication history, credit controls, reminders, and party-wise financial positions. CRM is the source of truth for party identity — all other domains reference party IDs from CRM.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                           |
| ------------------- | ---------------------------------------------------------- |
| All products        | `crm.parties` (every invoice, bill, PO references a party) |
| Billing Software    | `crm.communication.reminders`                              |
| Invoicing Software  | `crm.parties`, `crm.communication`                         |
| Accounting Software | `crm.parties.party-ledger`, `crm.parties.credit-limit`     |

---

## Sub-modules

```
crm/
  parties/
    customers/           ← customer profile: name, GSTIN, address, pricing tier
    suppliers/           ← supplier profile: GSTIN, bank, payment terms
    party-ledger/        ← outstanding balance view per party (reads finance)
    credit-limit/        ← set and enforce credit limit per party
    relationship/        ← group companies, parent-child accounts

  communication/
    history/             ← log of invoices, payments, calls, notes per party
    preferences/         ← language, WhatsApp opt-in, notification preferences
    reminders/           ← overdue payment reminders (schedule + send)
```

---

## Capabilities

### Party management

- customer profile: name, phone, GSTIN, billing/shipping address, pricing tier
- supplier profile: GSTIN, bank account, payment terms, credit limit
- fuzzy name search (Hindi/English/Devanagari support)
- customer segments (retail, wholesale, B2B)
- party-wise credit limit and overdue blocking

### Communication and reminders

- payment reminder scheduling: WhatsApp, SMS, in-app
- communication history: all invoices, payments, messages per party
- party preferences: preferred contact method, language

### Party ledger

- outstanding receivables per customer (reads from finance domain)
- outstanding payables per supplier
- ageing view: current, 30d, 60d, 90d+

---

## Events Produced

| Event                 | Trigger                                 | Consumers                                |
| --------------------- | --------------------------------------- | ---------------------------------------- |
| `ReminderScheduled`   | reminder configured for overdue invoice | integrations.whatsapp / integrations.sms |
| `CustomerCreated`     | new customer profile saved              | (internal: voice context cache)          |
| `CreditLimitBreached` | invoice would exceed credit limit       | sales.invoicing (block confirm)          |

## Events Consumed

| Event                | From             | Action                                |
| -------------------- | ---------------- | ------------------------------------- |
| `InvoiceCreated`     | sales.invoicing  | add to customer communication history |
| `PaymentRecorded`    | finance.payments | update party outstanding balance view |
| `PurchaseBillPosted` | purchases        | add to supplier communication history |

---

## API Contracts

```
POST   /api/v1/customers                         createCustomer
GET    /api/v1/customers                         listCustomers (search, fuzzy)
GET    /api/v1/customers/:id                     getCustomer
PATCH  /api/v1/customers/:id                     updateCustomer
GET    /api/v1/customers/:id/ledger              getCustomerLedger (reads finance)
GET    /api/v1/customers/:id/timeline            getCustomerTimeline
POST   /api/v1/reminders                         scheduleReminder
GET    /api/v1/reminders                         listReminders
DELETE /api/v1/reminders/:id                     cancelReminder
POST   /api/v1/suppliers                         createSupplier (→ purchases domain)
```

---

## Backend Package (target)

```
packages/crm/src/
├── customer.ts         ← createCustomer, updateCustomer, getCustomer, listCustomers,
│                          searchCustomerFuzzy, getCustomerOutstanding
├── supplier.ts         ← createSupplier, updateSupplier, listSuppliers (shares with purchases)
├── reminder.ts         ← scheduleReminder, cancelReminder, listReminders, processReminders
└── types.ts
```

---

## Fuzzy Search Notes

The `searchCustomerFuzzy` function handles:

- Devanagari (Hindi) name matching
- phonetic similarity (transliteration)
- partial name / phone number match

This is the most complex function in the CRM domain — used by voice engine for real-time party lookup during voice billing.

---

## Guardrails

- party identity (customer/supplier IDs) is the primary foreign key used across all domains — never duplicate party records
- party ledger view in CRM reads from `finance.accounting.ledger` — CRM does not own the ledger
- credit limit enforcement: CRM broadcasts `CreditLimitBreached`; sales domain decides to block or warn
- reminder delivery goes through `integrations.whatsapp` or `integrations.sms` — CRM only schedules, does not deliver
- fuzzy search must not expose cross-tenant party data

---

## Current Status

| Sub-module                | Status                   |
| ------------------------- | ------------------------ |
| customer CRUD             | ✅ active                |
| supplier CRUD             | ✅ active                |
| fuzzy name search         | ✅ active                |
| Devanagari matching       | ✅ active                |
| payment reminders         | ✅ active (BullMQ)       |
| customer outstanding view | ✅ active (reads ledger) |
| credit limit enforcement  | ⏳ pending               |
| communication history     | ⏳ pending               |
| customer segments         | ⏳ pending               |
| parent-child accounts     | ⏳ pending               |
| party-wise pricing tier   | ⏳ pending               |

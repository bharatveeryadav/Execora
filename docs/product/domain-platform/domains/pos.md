# Module: POS (Point of Sale)

> Codebase package: `@execora/modules` → `pos/`
>
> PRD source: `domains/sales.md` (pos + billing sections)
>
> Owner squad: Sales Domain Squad
>
> Status: Voice billing + draft bills active — counter sessions, offline-sync, hardware pending

---

## Mission

Own all counter-facing sale interactions: quick billing, cart management, multi-payment checkout, counter session lifecycle, hardware integrations, and offline continuity. POS also owns the voice-driven billing engine (STT → intent → handler → TTS) enabling hands-free billing for kirana and retail operators.

---

## Products Enabled

| Product          | Features used                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| POS Software     | all features                                                                                    |
| Billing Software | `billing/cart`, `billing/pricing`, `billing/tax-calculation`, `checkout/payment`, `pos/receipt` |
| Invoicing        | `session/draft` (draft before converting to invoice)                                            |

---

## Feature Modules

```
pos/
  billing/
    cart/                    ← line item add/remove/update with running totals
    pricing/                 ← product price resolution (catalog, party-tier, weight)
    party-pricing/           ← customer-specific overrides and discount tiers
    channel-pricing/         ← retail vs wholesale rate switching
    promotions/              ← discount rules, offer codes, combo deals
    item-calculation/        ← line total = qty × price − discount + GST
    weight-pricing/          ← weighing-scale integration (price per kg/g)
    tax-calculation/         ← select CGST/SGST/IGST by HSN and party GSTIN
    totals/                  ← invoice-level subtotal, tax total, round-off, grand total

  checkout/
    payment/                 ← single-screen multi-payment flow (cash+UPI+card split)
    receipt/                 ← thermal and digital receipt rendering + share

  session/
    draft/                   ← in-progress bill staging before confirm
    open-close/              ← counter session open / reconcile / close
    multi-counter/           ← parallel sessions per location/counter

  offline/
    local-store/             ← SQLite local bill queue for offline operation
    sync-replay/             ← background sync when connectivity restored
    conflict-resolution/     ← merge offline bills with server state

  voice/
    engine/                  ← STT → LLM intent extraction → handler dispatch → TTS
    conversation/            ← per-session context memory (active cart, customer, items)
    handlers/
      invoice-handler/       ← INVOICE_* intents: create, add item, confirm, cancel
      customer-handler/      ← CUSTOMER_* intents: lookup, select, create
      payment-handler/       ← PAYMENT_* intents: record payment, check balance
      product-handler/       ← PRODUCT_* intents: stock check, price query
      reminder-handler/      ← REMINDER_* intents: set reminder for overdue
      report-handler/        ← REPORT_* intents: P&L, outstanding, collection
    session/                 ← WebSocket voice session lifecycle (start → stream → close)
    task-queue/              ← queue chained intents (e.g. create bill + record payment)
    response-template/       ← locale-aware TTS responses (Hindi, Gujarati, English)

  hardware/
    barcode-scanner/         ← USB/Bluetooth/camera scan → SKU lookup
    weighing-scale/          ← serial/USB scale → weight capture
    thermal-printer/         ← receipt and bill print queue
    cash-drawer/             ← open drawer on payment confirmation
    edc-terminal/            ← card payment terminal integration
```

---

## Feature Module Contracts

Each feature module exposes:

```
pos/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. session must be open to add items)
  __tests__/        ← unit tests per command/query
```

---

## Capabilities

### Quick billing

- product search: barcode, name, or voice
- add item to cart: qty, unit, price, line discount
- party selection: retail (walk-in) or named customer
- party-wise price auto-applied when customer selected
- real-time CGST/SGST/IGST calculation per line (HSN-based)
- invoice-level round-off and totals
- discounts: line-level %, amount; invoice-level % cap

### Checkout and payment

- single-screen multi-payment: cash + UPI + card + credit in one transaction
- partial credit collection (balance carried forward)
- QR code for UPI payment collection
- receipt: thermal print or share via WhatsApp/SMS/email

### Counter session

- open session: declare opening cash balance
- add bills throughout the day
- close session: count cash, reconcile with expected, post session summary
- multi-counter: separate sessions per physical counter or device

### Offline operation

- bill creation works with no internet
- bills queued in local SQLite store
- automatic background sync on reconnection
- conflict resolution for concurrent edits

### Voice billing (Mode 1)

- push-to-talk or always-on STT
- Deepgram / Whisper transcription → LLM intent extraction
- deterministic `switch(intent)` handler dispatch (no hallucination risk)
- 30+ supported intents: `CREATE_INVOICE`, `ADD_ITEM`, `RECORD_PAYMENT`, `CHECK_BALANCE`, etc.
- per-session conversation memory: retains active cart, customer, last items
- locale-aware TTS response (Hindi, Gujarati, English)
- chained task queue: "create bill for Ramesh, add 5kg atta, record payment cash"
- WebSocket session with real-time streaming

### Hardware integrations (pending)

- barcode scanner: scan SKU → auto-add to cart
- weighing scale: capture weight → apply per-unit price
- thermal printer: print receipt on bill confirmation
- cash drawer: open on cash payment
- EDC terminal: card payment trigger

---

## Events Produced

| Event              | Trigger                     | Consumers                                                |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| `InvoiceCreated`   | bill confirmed from POS     | accounting (ledger posting), inventory (stock deduction) |
| `PosSessionClosed` | counter session closed      | accounting (session settlement), reporting               |
| `CartAbandoned`    | session timeout or explicit | (internal cleanup)                                       |

## Events Consumed

| Event               | From       | Action                                                  |
| ------------------- | ---------- | ------------------------------------------------------- |
| `PaymentRecorded`   | accounting | update draft bill payment state                         |
| `StockInsufficient` | inventory  | warn at checkout / block confirm if strict mode enabled |

---

## API Contracts

```
POST   /api/v1/pos/bills                          createDraftBill
GET    /api/v1/pos/bills/:id                      getDraftBill
PATCH  /api/v1/pos/bills/:id/items                updateBillItems
POST   /api/v1/pos/bills/:id/confirm              confirmBill (→ invoice)
DELETE /api/v1/pos/bills/:id                      abandonDraft

POST   /api/v1/pos/sessions                       openSession
GET    /api/v1/pos/sessions/:id                   getSession
PATCH  /api/v1/pos/sessions/:id/close             closeSession
GET    /api/v1/pos/sessions/:id/summary           getSessionSummary

POST   /api/v1/voice/session                      startVoiceSession (WebSocket)
POST   /api/v1/voice/process                      processVoiceText (non-WS fallback)
```

---

## Backend Package (current)

```
packages/modules/src/pos/
  index.ts                        ← barrel export
  (re-exports from operations/ and modules/voice/)

packages/modules/src/operations/drafts/
  draft.ts                        ← createDraft, updateDraft, confirmInvoice (active)

packages/modules/src/modules/voice/
  engine.ts                       ← intent router (active)
  conversation.ts                 ← context memory (active)
  session.service.ts              ← WebSocket session manager (active)
  task-queue.ts                   ← chained task queue (active)
  response-template.ts            ← locale-aware TTS replies (active)
  engine/
    customer.handler.ts           ← CUSTOMER_* intents (active)
    invoice.handler.ts            ← INVOICE_* intents (active)
    payment.handler.ts            ← PAYMENT_* intents (active)
    product.handler.ts            ← PRODUCT_* intents (active)
    reminder.handler.ts           ← REMINDER_* intents (active)
    report.handler.ts             ← REPORT_* intents (active)
    shared.ts                     ← shared handler utilities
```

## Backend Package (target — feature split)

```
packages/modules/src/pos/
  index.ts
  billing/
    cart/
    pricing/
    party-pricing/
    tax-calculation/
    totals/
  checkout/
    payment/
    receipt/
  session/
    draft/
    open-close/
    multi-counter/
  offline/
    local-store/
    sync-replay/
  voice/
    engine/
    conversation/
    handlers/
      invoice-handler/
      customer-handler/
      payment-handler/
      product-handler/
      reminder-handler/
      report-handler/
    session/
    task-queue/
    response-template/
```

---

## Current Implementation Status

| Feature                   | Status     | Notes                                          |
| ------------------------- | ---------- | ---------------------------------------------- |
| `session/draft`           | ✅ Active  | `createDraft`, `updateDraft`, `confirmInvoice` |
| `voice/engine`            | ✅ Active  | 30+ intents, deterministic handler dispatch    |
| `voice/conversation`      | ✅ Active  | per-session context memory                     |
| `voice/session`           | ✅ Active  | WebSocket lifecycle                            |
| `voice/task-queue`        | ✅ Active  | chained multi-intent queue                     |
| `voice/response-template` | ✅ Active  | Hindi/Gujarati/English responses               |
| `voice/handlers/*`        | ✅ Active  | all 6 domain handlers                          |
| `billing/cart`            | 🔲 Pending | REST cart API (voice does this today)          |
| `billing/pricing`         | 🔲 Pending | party-pricing and channel-pricing APIs         |
| `billing/promotions`      | 🔲 Pending | discount rules, offer codes                    |
| `checkout/payment`        | 🔲 Pending | multi-payment single-screen UI flow            |
| `session/open-close`      | 🔲 Pending | formal session open/close/reconcile            |
| `session/multi-counter`   | 🔲 Pending | parallel counter sessions                      |
| `offline/local-store`     | 🔲 Pending | SQLite offline queue                           |
| `offline/sync-replay`     | 🔲 Pending | background reconnect sync                      |
| `hardware/*`              | 🔲 Pending | all hardware integrations                      |

---

## Engineering Rules

- voice handlers are deterministic (`switch(intent)`) — no LLM calls inside handler dispatch
- conversation memory is per-session only — never persists sensitive financial data
- offline bills must be idempotent: carry client-generated `billRef` to prevent duplicate submission on sync replay
- stock deduction happens via `inventory` domain event from `InvoiceCreated` — POS does not write stock directly
- hardware adapters live in `integrations/` package — POS handlers call adapter contracts, not SDKs

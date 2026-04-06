# Module: OCR (Document Intelligence + Procurement)

> Codebase package: `@execora/modules` → `ocr/`
>
> PRD source: `domains/purchases.md` (ocr + purchase sections)
>
> Owner squad: Inventory + Purchases Squad
>
> Status: OCR job lifecycle active — AI extraction, purchase order pipeline, vendor management pending

---

## Mission

Own OCR-assisted document ingestion (purchase bills, expense receipts, vendor invoices), the purchase order lifecycle, vendor management, and AI analytics (replenishment suggestions, invoice anomaly detection, predictive reminders). OCR feeds inventory (inward stock on goods received) and accounting (payable posting on purchase bill confirmation) via events — it never posts to those domains directly.

---

## Products Enabled

| Product             | Features used                                                       |
| ------------------- | ------------------------------------------------------------------- |
| Accounting Software | `purchases/*`, `vendors/*`, `ocr/*` (full feature set)              |
| Inventory Software  | `purchases/purchase-order` (inward stock trigger on goods received) |
| Invoicing Software  | `vendors/supplier-management` (vendor bill management)              |
| All plans (Pro+)    | `ocr/*` (entitlement-gated), `ai-analytics/*` (entitlement-gated)   |

---

## Feature Modules

```
ocr/
  purchases/
    purchase-order/          ← create PO → send to vendor → receive goods → match PO
    purchase-bill/           ← record vendor invoice, validate GSTIN + amounts, post to payables
    purchase-return/         ← return goods to vendor, create debit note, trigger restock event
    bill-matching/           ← match purchase bill to one or more POs (3-way match)
    payment-terms/           ← net-30, net-60, COD, advance; auto-calculate due date

  vendors/
    supplier-management/     ← vendor profile: GSTIN, PAN, bank details, payment terms, credit limit
    vendor-ledger/           ← outstanding payables view per vendor (reads accounting)
    vendor-ageing/           ← 0-30, 31-60, 61-90, 90+ days payable ageing
    preferred-vendors/       ← mark preferred vendors per category/item for auto-suggest on PO

  document-ocr/
    upload/                  ← accept purchase bill or expense image/PDF (BullMQ job creation)
    extraction/              ← AI field extraction: supplier name, GSTIN, invoice number, date, items, HSN, tax, totals
    normalization/           ← map raw extracted fields to domain schema entity types
    gst-extractor/           ← parse GSTIN, CGST/SGST/IGST breakdowns, HSN/SAC codes from document
    review-correction/       ← human review-and-edit step before any posting is triggered
    transaction-linking/     ← attach original scanned document to resulting posted transaction
    retry/                   ← retry failed OCR jobs with error reason tracking

  ai-analytics/
    replenishment/           ← AI-suggested reorder quantities based on sales velocity + lead time
    anomaly-detection/       ← flag unusual invoice amounts, duplicate bills, suspicious vendors
    predictive-reminders/    ← predict overdue risk per customer for proactive reminder scheduling
    demand-forecasting/      ← projected demand per SKU for purchase planning
```

---

## Feature Module Contracts

Each feature module exposes:

```
ocr/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. OCR review must complete before posting)
  __tests__/        ← unit tests per command/query
```

---

## OCR Pipeline States

```
uploaded → queued → extracting → extracted → review → confirmed → posted
                                     ↓
                                  failed → retryable
```

| State        | Description                                          |
| ------------ | ---------------------------------------------------- |
| `uploaded`   | file received, BullMQ job created                    |
| `queued`     | job waiting in BullMQ queue                          |
| `extracting` | AI extraction in progress (Deepgram / OpenAI Vision) |
| `extracted`  | fields parsed, awaiting human review                 |
| `review`     | human is reviewing/correcting extracted fields       |
| `confirmed`  | human approved extracted data                        |
| `posted`     | transaction created in accounting/inventory          |
| `failed`     | extraction failed (bad image, unsupported format)    |
| `retryable`  | failed but eligible for retry                        |

---

## Capabilities

### Purchase orders

- create purchase order with line items, expected delivery date, vendor
- email/WhatsApp PO to vendor
- receive goods against PO: partial or full receipt
- 3-way PO match: PO → goods received note → purchase bill
- partial receipt and bill matching (multi-shipment POs)

### Purchase bills and returns

- record vendor invoice standalone or linked to PO
- validate vendor GSTIN and invoice date
- post to payable ledger via `PurchaseBillPosted` event to accounting
- purchase return: debit note, return goods (restock via inventory event)
- payment terms: net-30/60, COD, advance; auto-calculate due date and overdue status

### Vendor management

- supplier profile: full name, GSTIN, PAN, bank account (IFSC + account number), payment terms, credit limit
- vendor GSTIN validation on create/update
- vendor ledger: outstanding payables (reads from accounting — OCR does not store ledger)
- ageing: 0-30, 31-60, 61-90, 90+ days outstanding
- preferred vendor tagging per category or SKU for smart PO suggestions

### OCR document ingestion

- supported inputs: JPEG, PNG, PDF (scanned or digital), WhatsApp photo
- AI extraction fields:
  - supplier name, GSTIN, invoice number, invoice date, due date
  - line items: name, quantity, unit, rate, discount, HSN code
  - tax breakdowns: CGST, SGST, IGST per line and total
  - grand total, round-off, subtotal
- normalization: map free-form extracted text to schema-typed entities
- GST extractor: parse GSTIN format, validate checksum, extract per-slab tax amounts
- human review step: required before any bill or expense posting
- document storage: original file attached to posted transaction in MinIO
- auto-feeds GSTR-2A matching for input tax credit verification

### AI analytics (entitlement-gated)

- **Replenishment suggestions**: AI-calculated reorder quantities based on average daily sales velocity + vendor lead time + safety stock targets
- **Invoice anomaly detection**: flag duplicate invoice numbers, unusual amounts vs vendor average, suspicious new vendors
- **Predictive reminders**: score customers by overdue risk (days overdue, payment history, invoice amount) → proactive reminder suggestions
- **Demand forecasting**: projected SKU demand for next 30/60/90 days for purchase planning

---

## Events Produced

| Event                    | Trigger                       | Consumers                                                    |
| ------------------------ | ----------------------------- | ------------------------------------------------------------ |
| `PurchaseBillPosted`     | bill confirmed and posted     | accounting (payable journal entry), inventory (inward stock) |
| `PurchaseOrderCreated`   | PO created and sent to vendor | integrations (WhatsApp/email notification to vendor)         |
| `GoodsReceived`          | PO goods receipt confirmed    | inventory (`StockAdjusted` — inward stock)                   |
| `OcrDocumentUploaded`    | file uploaded and job created | ocr/extraction pipeline (BullMQ job)                         |
| `OcrExtractionCompleted` | AI extraction finished        | ocr/review-correction (notify user for review)               |
| `PurchaseReturnPosted`   | return confirmed              | inventory (restock to vendor), accounting (debit note)       |

## Events Consumed

| Event                           | From       | Action                                       |
| ------------------------------- | ---------- | -------------------------------------------- |
| `PaymentRecorded` (payment-out) | accounting | update vendor bill payment state (mark paid) |
| `StockAdjusted`                 | inventory  | confirm inward goods receipt against PO      |

---

## API Contracts

```
POST   /api/v1/purchases/orders                   createPurchaseOrder
GET    /api/v1/purchases/orders                   listPurchaseOrders (vendor, status, date)
GET    /api/v1/purchases/orders/:id               getPurchaseOrder
PATCH  /api/v1/purchases/orders/:id/receive       receiveGoods (partial or full)

POST   /api/v1/purchases/bills                    createPurchaseBill
GET    /api/v1/purchases/bills                    listPurchaseBills (vendor, status, date)
GET    /api/v1/purchases/bills/:id                getPurchaseBill
PATCH  /api/v1/purchases/bills/:id/post           postPurchaseBill

POST   /api/v1/purchases/returns                  createPurchaseReturn
GET    /api/v1/purchases/returns                  listPurchaseReturns

GET    /api/v1/suppliers                          listSuppliers
POST   /api/v1/suppliers                          createSupplier
GET    /api/v1/suppliers/:id                      getSupplier
PATCH  /api/v1/suppliers/:id                      updateSupplier
GET    /api/v1/suppliers/:id/ledger               getVendorLedger
GET    /api/v1/suppliers/:id/ageing               getVendorAgeing

POST   /api/v1/ocr/upload                         uploadDocument (multipart)
GET    /api/v1/ocr/:jobId/status                  getOcrJobStatus
GET    /api/v1/ocr/:jobId/result                  getExtractionResult
POST   /api/v1/ocr/:jobId/confirm                 confirmAndPost (after human review)
POST   /api/v1/ocr/:jobId/retry                   retryOcrJob
GET    /api/v1/ocr                                listOcrJobs (status, date, type)

GET    /api/v1/ai/replenishment                   getReplenishmentSuggestions
GET    /api/v1/ai/anomalies                        getAnomalyFlags
GET    /api/v1/ai/reminders/predictions            getPredictiveReminders
GET    /api/v1/ai/demand-forecast                 getDemandForecast (sku, days)
```

---

## Backend Package (current)

```
packages/modules/src/ocr/
  index.ts                        ← barrel export
  ocr.service.ts                  ← createOcrJob, getOcrJob, listOcrJobs, retryOcrJob (active)

packages/modules/src/modules/ai/
  ai.service.ts                   ← ReplenishmentSuggestion, AnomalyResult, PredictiveReminder (active)

packages/modules/src/purchases/purchase/
  purchase-order.ts               ← createPO, receivePO (active)

packages/modules/src/purchases/vendors/
  supplier-profile.ts             ← supplier CRUD (active)
```

## Backend Package (target — feature split)

```
packages/modules/src/ocr/
  index.ts
  purchases/
    purchase-order/
    purchase-bill/
    purchase-return/
    bill-matching/
    payment-terms/
  vendors/
    supplier-management/
    vendor-ledger/
    vendor-ageing/
  document-ocr/
    upload/
    extraction/
    normalization/
    gst-extractor/
    review-correction/
    transaction-linking/
    retry/
  ai-analytics/
    replenishment/
    anomaly-detection/
    predictive-reminders/
    demand-forecasting/
```

---

## Current Implementation Status

| Feature                             | Status     | Notes                                          |
| ----------------------------------- | ---------- | ---------------------------------------------- |
| `document-ocr/upload`               | ✅ Active  | BullMQ job creation, file upload               |
| `document-ocr/retry`                | ✅ Active  | `retryOcrJob` with error tracking              |
| `document-ocr` job CRUD             | ✅ Active  | `createOcrJob`, `getOcrJob`, `listOcrJobs`     |
| `ai-analytics/replenishment`        | ✅ Active  | AI replenishment suggestions                   |
| `ai-analytics/anomaly-detection`    | ✅ Active  | invoice anomaly detection                      |
| `ai-analytics/predictive-reminders` | ✅ Active  | overdue risk scoring                           |
| `purchases/purchase-order`          | ✅ Active  | createPO, receivePO                            |
| `vendors/supplier-management`       | ✅ Active  | supplier CRUD                                  |
| `document-ocr/extraction`           | 🔲 Pending | AI field extraction (OpenAI Vision / Deepgram) |
| `document-ocr/normalization`        | 🔲 Pending | field → schema entity mapping                  |
| `document-ocr/gst-extractor`        | 🔲 Pending | GSTIN + tax breakdown parsing                  |
| `document-ocr/review-correction`    | 🔲 Pending | human review UI + API                          |
| `document-ocr/transaction-linking`  | 🔲 Pending | attach scanned doc to posted transaction       |
| `purchases/purchase-bill`           | 🔲 Pending | vendor bill CRUD + posting                     |
| `purchases/purchase-return`         | 🔲 Pending | debit note + restock trigger                   |
| `purchases/bill-matching`           | 🔲 Pending | 3-way PO match                                 |
| `vendors/vendor-ledger`             | 🔲 Pending | outstanding payables view                      |
| `vendors/vendor-ageing`             | 🔲 Pending | ageing report                                  |
| `ai-analytics/demand-forecasting`   | 🔲 Pending | 30/60/90 day demand projection                 |

---

## Engineering Rules

- OCR is a staged pipeline — `review-correction` step MUST complete before any `PurchaseBillPosted` event fires; never auto-post without human confirmation
- AI analytics features are entitlement-gated (`aiDocumentExtraction` toggle) — check at API boundary before executing extraction
- OCR jobs are idempotent — use `jobId` as unique key; re-uploading same document should not create duplicate jobs
- `PurchaseBillPosted` event drives accounting (payable) and inventory (inward stock) — do not write to either directly from purchases code
- vendor GSTIN must be validated (format + checksum) on create/update — same validation as `invoicing/parties`
- AI suggestions (replenishment, anomaly flags, predictive reminders) are advisory only — they never trigger transactions automatically
- OCR extracted data is a proposal until human-confirmed — domain validation in `confirm-and-post` is the authoritative write path

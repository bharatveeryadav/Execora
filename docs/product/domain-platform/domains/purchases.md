# Domain: Purchases

> Odoo equivalent: `addons/purchase` + `addons/account` (vendor bills)
>
> Owner squad: Inventory + Purchases Squad
>
> Status: Basic purchase orders active — OCR pipeline pending

---

## Mission

Own all vendor-side operations: purchase orders, purchase bills, vendor payments, returns, and OCR-assisted document ingestion. Purchases domain feeds inventory (inward stock) and finance (payable and expense postings).

---

## Products Enabled By This Domain

| Product             | Domains consumed                                           |
| ------------------- | ---------------------------------------------------------- |
| Accounting Software | `purchases.purchase`, `purchases.vendors`, `purchases.ocr` |
| Inventory Software  | `purchases.purchase` (inward stock trigger)                |
| Invoicing Software  | `purchases.purchase` (vendor bill management)              |

---

## Sub-modules

```
purchases/
  purchase/
    purchase-bill/       ← record vendor invoice, validate, post to payables
    purchase-order/      ← create PO, send to vendor, receive goods
    purchase-return/     ← return goods to vendor, debit note

  vendors/
    supplier-management/ ← vendor GSTIN, bank details, payment terms, credit

  ocr/
    upload/              ← accept bill/expense image or PDF
    extraction/          ← AI field extraction (supplier, items, GST, HSN, totals)
    normalization/       ← map extracted fields to domain schema
    gst-extractor/       ← parse GSTIN, tax breakdowns, HSN/SAC codes
    review-correction/   ← human review step before posting
    transaction-linking/ ← attach original document to posted transaction
```

---

## Capabilities

### Purchase orders and bills

- create purchase order and send to vendor
- receive goods against PO → triggers `StockAdjusted` in inventory
- record purchase bill against PO or standalone
- partial receipt and bill matching
- purchase return with debit note

### Vendor management

- supplier profile: GSTIN, bank, payment terms, credit limit
- vendor-wise outstanding payables
- vendor ledger and ageing

### OCR-assisted procurement

- upload purchase bill or expense document (image/PDF)
- AI extracts: supplier name, GSTIN, invoice number, date, line items, HSN codes, tax breakdowns, totals
- human review-and-correct step before any posting
- document attached to resulting transaction in finance
- auto-feeds GSTR-2A matching for input tax credit

---

## Events Produced

| Event                    | Trigger                   | Consumers                                                 |
| ------------------------ | ------------------------- | --------------------------------------------------------- |
| `PurchaseBillPosted`     | bill confirmed and posted | finance (payable journal entry), inventory (inward stock) |
| `PurchaseOrderCreated`   | PO sent to vendor         | (notifications to vendor if WhatsApp enabled)             |
| `GoodsReceived`          | PO receipt confirmed      | inventory (StockAdjusted)                                 |
| `OcrDocumentUploaded`    | file uploaded             | ocr.extraction pipeline                                   |
| `OcrExtractionCompleted` | extraction done           | ocr.review-correction UI                                  |
| `PurchaseReturnPosted`   | return confirmed          | inventory (restock to vendor), finance (debit note)       |

## Events Consumed

| Event                           | From             | Action                            |
| ------------------------------- | ---------------- | --------------------------------- |
| `PaymentRecorded` (payment-out) | finance.payments | update vendor bill payment state  |
| `StockAdjusted`                 | inventory        | confirm inward receipt against PO |

---

## API Contracts

```
POST   /api/v1/purchases/orders                  createPurchaseOrder
GET    /api/v1/purchases/orders                  listPurchaseOrders
PATCH  /api/v1/purchases/orders/:id/receive      receiveGoods
POST   /api/v1/purchases/bills                   createPurchaseBill
GET    /api/v1/purchases/bills                   listPurchaseBills
PATCH  /api/v1/purchases/bills/:id/post          postPurchaseBill
POST   /api/v1/purchases/returns                 createPurchaseReturn
GET    /api/v1/suppliers                         listSuppliers
POST   /api/v1/suppliers                         createSupplier
GET    /api/v1/suppliers/:id                     getSupplier
PATCH  /api/v1/suppliers/:id                     updateSupplier
POST   /api/v1/ocr/upload                        uploadDocument
GET    /api/v1/ocr/:jobId/status                 getExtractionStatus
GET    /api/v1/ocr/:jobId/result                 getExtractionResult
POST   /api/v1/ocr/:jobId/confirm                confirmAndPost
```

---

## Backend Package (target)

```
packages/purchases/src/
├── purchase-order.ts   ← createPO, receivePO, listPOs, cancelPO
├── purchase-bill.ts    ← createBill, postBill, listBills, matchBillToPO
├── purchase-return.ts  ← createReturn, postReturn
├── supplier.ts         ← createSupplier, updateSupplier, listSuppliers, getSupplier
├── ocr.ts              ← uploadDocument, getExtractionResult, confirmAndPost
└── types.ts
```

---

## OCR Pipeline State Machine

```
uploaded → extracting → extracted → reviewing → posted → attached
                                       ↓
                                    rejected (back to reviewing)
```

---

## Guardrails

- OCR extraction must go through human review before any posting — no auto-post without review step
- `GoodsReceived` is the only trigger for inward stock — never direct stock write from purchases routes
- purchase bills posted to finance via `PurchaseBillPosted` event — no direct ledger call
- GSTIN on purchase bill must be validated against supplier record before posting
- uploaded OCR documents are stored in MinIO with tenant-scoped paths (security: no cross-tenant access)

---

## Current Status

| Sub-module                   | Status                                   |
| ---------------------------- | ---------------------------------------- |
| supplier profile             | ✅ active (supplier-profile.ts flat fns) |
| purchase order basic         | ✅ partial                               |
| purchase bill                | ⏳ pending                               |
| goods receipt                | ⏳ pending                               |
| purchase return / debit note | ⏳ pending                               |
| OCR upload                   | ⏳ pending                               |
| OCR extraction (AI)          | ⏳ pending                               |
| OCR review step              | ⏳ pending                               |
| GSTR-2A matching             | ⏳ pending                               |

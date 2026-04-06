# Module: Inventory

> Codebase package: `@execora/modules` → `inventory/`
>
> PRD source: `domains/inventory.md` (original)
>
> Owner squad: Inventory + Purchases Squad
>
> Status: Basic stock tracking + product catalog active — multi-location, batch, barcode, alerts pending

---

## Mission

Own all stock and product catalog state. Inventory is the single authoritative path for stock quantity mutations. No other module may write stock levels directly — all stock changes go through inventory APIs or respond to inventory domain events.

---

## Products Enabled

| Product             | Features used                                       |
| ------------------- | --------------------------------------------------- |
| Inventory Software  | all features                                        |
| Billing Software    | `stock/stock-level` (availability check at billing) |
| POS Software        | `stock/stock-level` (checkout deduction via event)  |
| Accounting Software | `stock/valuation` (stock value for balance sheet)   |

---

## Feature Modules

```
inventory/
  stock/
    item-catalog/        ← product CRUD: name, SKU, HSN, GST rate, MRP, cost, unit
    bulk-update/         ← mass price/stock/HSN edits via import or bulk API
    stock-level/         ← on-hand, reserved, available, incoming per SKU per location
    reservations/        ← hold stock against pending orders (PO or invoice)
    adjustments/         ← manual write-up and write-off with reason code
    valuation/           ← stock value at cost (FIFO / weighted average)

  warehouse/
    locations/           ← create and manage godowns, stores, counters as named locations
    transfer-request/    ← request stock move between locations
    location-policy/     ← valve rules: FIFO, FEFO, LIFO per location

  movement/
    inward/              ← goods received: from purchase, vendor return pickup, manual adjustment
    outward/             ← goods dispatched: from invoice, transfer, write-off, samples
    transfer-ledger/     ← complete movement audit trail per SKU per location per day

  batch/
    batch-tracking/      ← lot/batch number assignment on inward, track across outward
    expiry/              ← expiry date per batch, advance expiry alerts (configurable N days)
    serial-number/       ← serial-level tracing: assign on receive, deassign on dispatch

  barcode/
    generator/           ← generate EAN-13, CODE-128, QR codes per SKU
    scanner/             ← normalise USB/Bluetooth/camera scan input → SKU lookup
    label-printing/      ← label template design + thermal print queue

  alerts/
    low-stock/           ← threshold breach on configurable minimum qty per SKU per location
    overstock/           ← excess stock alert when qty exceeds maximum threshold
    expiry-alerts/       ← batch expiry within configurable N days lead time
    reorder-suggestions/ ← smart reorder point based on average daily sales velocity
```

---

## Feature Module Contracts

Each feature module exposes:

```
inventory/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. cannot transfer more than available stock)
  __tests__/        ← unit tests per command/query
```

---

## Capabilities

### Product catalog

- create/update/archive products: name, SKU, HSN code, GST rate, MRP, cost price, unit of measure
- Prisma fields: `cost` (not `costPrice`), `gstRate`, `hsnCode`, `mrp`
- bulk import/update via CSV: price, stock, HSN, GST rate simultaneously
- product categories and tagging for filtering and report grouping
- product search: name, SKU, barcode, HSN (supports partial match)

### Stock levels

- on-hand: physical stock currently in location
- reserved: soft-hold against confirmed pending orders
- available: on-hand − reserved (what can be promised)
- incoming: expected from confirmed purchase orders
- visibility: per-SKU, per-location, or aggregated across all locations

### Warehouse and locations

- named locations: godowns, retail floors, counter stock
- stock transfer between locations with transfer ledger entry
- FIFO, FEFO (expiry-first), or LIFO policy per location
- location-wise stock position snapshot for warehouse audits

### Stock movement

- **inward**: goods received from purchase, vendor return, manual write-up
- **outward**: goods dispatched on invoice confirm, transfer, write-off, sample
- **transfer**: internal move between locations — creates paired inward+outward records
- movement audit trail: complete history per SKU per location per date

### Batch, serial, and expiry tracking

- batch/lot number assignment on every inward movement
- expiry date per batch — configurable advance alert (e.g. 30 days before)
- FEFO: first-expiry-first-out auto-selection on outward
- serial number: assign on receive, deassign on dispatch (for electronics, pharma)
- batch-wise stock position query

### Barcode

- generate EAN-13, CODE-128, QR codes per product
- scanner input normalisation: strips extra chars from USB/Bluetooth/camera scan
- label template design (product name, MRP, HSN, barcode, batch, expiry)
- thermal label print queue (ZPL/ESC-POS)

### Alerts and reorder intelligence

- low-stock threshold alert: per SKU + per location, configurable minimum
- overstock alert: configurable maximum threshold
- expiry alert: configurable days-before-expiry lead time per category
- reorder suggestion: `reorder_qty = (avg_daily_sales × lead_time_days) + safety_stock`
- fast-moving and slow-moving item analysis by period

### Stock valuation

- stock value at cost: FIFO or weighted average (configured per business)
- ageing report: stock sitting > 30 / 60 / 90+ days (slow-moving risk)
- location-wise valuation for godown-level balance sheet

---

## Events Produced

| Event               | Trigger                           | Consumers                                      |
| ------------------- | --------------------------------- | ---------------------------------------------- |
| `StockAdjusted`     | manual adjustment confirmed       | accounting (valuation update), reporting       |
| `StockTransferred`  | location transfer confirmed       | accounting (location valuation), reporting     |
| `StockReserved`     | order confirmed or POS checkout   | (internal reservation state update)            |
| `StockReleased`     | order cancellation or return      | (internal reservation release)                 |
| `LowStockAlert`     | SKU qty falls below min threshold | notifications (push/WhatsApp/in-app)           |
| `ExpiryAlert`       | batch within N days of expiry     | notifications, reporting                       |
| `StockInsufficient` | checkout qty exceeds available    | pos (warn or block), invoicing (warn or block) |

## Events Consumed

| Event                | From      | Action                                                    |
| -------------------- | --------- | --------------------------------------------------------- |
| `InvoiceCreated`     | invoicing | deduct outward stock for each confirmed invoice line item |
| `InvoiceCancelled`   | invoicing | restock all invoice line items                            |
| `PosSessionClosed`   | pos       | batch-deduct all session sales items                      |
| `PurchaseBillPosted` | ocr       | record inward stock for received PO line items            |
| `CreditNoteCreated`  | invoicing | trigger restock for returned line items                   |

---

## API Contracts

```
GET    /api/v1/products                          listProducts (search, category, lowStock, sort)
POST   /api/v1/products                          createProduct
GET    /api/v1/products/:id                      getProduct
PATCH  /api/v1/products/:id                      updateProduct
DELETE /api/v1/products/:id                      archiveProduct
POST   /api/v1/products/bulk-update              bulkUpdateProducts (CSV or JSON array)
POST   /api/v1/products/:id/adjust-stock         adjustStock (delta, reason, location)
POST   /api/v1/products/:id/barcode              generateBarcode (format: EAN13|CODE128|QR)

GET    /api/v1/stock/levels                      getStockLevels (location, category, skus)
GET    /api/v1/stock/movements                   listMovements (sku, location, date, type)
POST   /api/v1/stock/transfers                   createTransfer (from, to, items)
GET    /api/v1/stock/alerts                      getLowStockAlerts
GET    /api/v1/stock/valuation                   getStockValuation (location, date)

GET    /api/v1/batches                           listBatches (sku, expiryBefore, status)
POST   /api/v1/batches                           createBatch (sku, lot, expiry, qty)
GET    /api/v1/batches/expiring                  getExpiringBatches (withinDays)

GET    /api/v1/stock/reorder-suggestions         getReorderSuggestions (location)
GET    /api/v1/stock/fast-slow-analysis          getFastSlowAnalysis (period)
```

---

## Backend Package (current)

```
packages/modules/src/inventory/
  index.ts                        ← barrel export
  catalog.ts                      ← product CRUD (active — was stock/item-catalog.ts)
  product.service.ts              ← ProductService: pagination, low-stock, expiry (active)
```

## Backend Package (target — feature split)

```
packages/modules/src/inventory/
  index.ts
  stock/
    item-catalog/
    bulk-update/
    stock-level/
    reservations/
    adjustments/
    valuation/
  warehouse/
    locations/
    transfer-request/
    location-policy/
  movement/
    inward/
    outward/
    transfer-ledger/
  batch/
    batch-tracking/
    expiry/
    serial-number/
  barcode/
    generator/
    scanner/
    label-printing/
  alerts/
    low-stock/
    overstock/
    expiry-alerts/
    reorder-suggestions/
```

---

## Current Implementation Status

| Feature                      | Status     | Notes                                      |
| ---------------------------- | ---------- | ------------------------------------------ |
| `stock/item-catalog`         | ✅ Active  | createProduct, updateProduct, listProducts |
| `stock/stock-level`          | ✅ Active  | basic on-hand tracking                     |
| `stock/adjustments`          | ✅ Active  | manual stock write-up/write-off            |
| `alerts/low-stock`           | ✅ Active  | threshold-based alerts                     |
| `batch/expiry`               | ✅ Active  | expiry date tracking + alerts              |
| `stock/bulk-update`          | 🔲 Pending | CSV/JSON mass update                       |
| `stock/reservations`         | 🔲 Pending | soft-hold for pending orders               |
| `stock/valuation`            | 🔲 Pending | FIFO/weighted-avg valuation report         |
| `warehouse/locations`        | 🔲 Pending | named godowns / stores / counters          |
| `warehouse/transfer-request` | 🔲 Pending | inter-location stock moves                 |
| `warehouse/location-policy`  | 🔲 Pending | FIFO/FEFO/LIFO per location                |
| `movement/inward`            | 🔲 Pending | formal inward movement records             |
| `movement/outward`           | 🔲 Pending | formal outward movement records            |
| `movement/transfer-ledger`   | 🔲 Pending | complete audit trail                       |
| `batch/batch-tracking`       | 🔲 Pending | lot number assignment + tracking           |
| `batch/serial-number`        | 🔲 Pending | serial-level tracing                       |
| `barcode/generator`          | 🔲 Pending | EAN-13, CODE-128, QR generation            |
| `barcode/scanner`            | 🔲 Pending | scan input normalisation                   |
| `barcode/label-printing`     | 🔲 Pending | thermal label print queue                  |
| `alerts/overstock`           | 🔲 Pending | maximum threshold alerts                   |
| `alerts/reorder-suggestions` | 🔲 Pending | velocity-based reorder point               |

---

## Engineering Rules

- inventory is the ONLY module that writes stock quantity — no direct stock DB updates from `invoicing`, `ocr`, or `pos`
- all stock mutations come from explicit commands or from consuming `InvoiceCreated` / `PurchaseBillPosted` / `CreditNoteCreated` events
- reservations are soft holds — always reconciled by the actual `StockAdjusted` event at fulfillment
- Prisma field names: use `cost` (not `costPrice`), `gstRate`, `hsnCode`, `mrp` — these are the schema field names
- valuation method (FIFO / weighted-average) is a per-business configuration — never hardcode per product

# Domain: Inventory

> Odoo equivalent: `addons/stock` + `addons/product`
>
> Owner squad: Inventory + Purchases Squad
>
> Status: Basic stock tracking active — multi-location, batch, barcode pending

---

## Mission

Own all stock and product catalog state. Inventory is the single authoritative path for stock quantity mutations. No other domain may write stock levels directly — all changes go through inventory domain events or APIs.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inventory Software  | `inventory.stock`, `inventory.warehouse`, `inventory.movement`, `inventory.batch`, `inventory.barcode`, `inventory.alerts`, `purchases.purchase` |
| Billing Software    | `inventory.stock` (availability check)                                                                                                           |
| POS Software        | `inventory.stock` (checkout deduction)                                                                                                           |
| Accounting Software | `inventory.stock` (valuation)                                                                                                                    |

---

## Sub-modules

```
inventory/
  stock/
    items/               ← product catalog: create, update, archive
    bulk-update/         ← mass price/stock/HSN edits
    stock-level/         ← on-hand, reserved, available, incoming
    reservations/        ← hold stock against pending orders
    adjustments/         ← manual stock write-ups and write-offs

  warehouse/
    godown/              ← primary storage location management
    store/               ← retail floor/counter location
    transfer/            ← stock move between locations
    location-policy/     ← rules: FIFO, FEFO, LIFO per location

  movement/
    inward/              ← goods received (from purchase, return, adjustment)
    outward/             ← goods dispatched (from invoice, transfer, write-off)
    transfer-ledger/     ← movement audit trail per SKU per location

  batch/
    batch-tracking/      ← lot/batch number assignment and tracking
    expiry/              ← expiry date management and alerts
    serial-number/       ← serial-level tracing for electronics/pharma

  barcode/
    generator/           ← generate EAN-13, CODE-128, QR barcodes
    scanner/             ← scan input normalisation
    label-printing/      ← label template and print queue

  alerts/
    low-stock/           ← threshold breach notification
    overstock/           ← excess stock alert
    expiry-alerts/       ← batch expiry within N days
    reorder-suggestions/ ← smart reorder point based on velocity
```

---

## Capabilities

### Core stock management

- multi-location stock (godowns and store counters)
- stock transfer between locations with transfer ledger
- manual stock adjustments (write-up / write-off with reason)
- reserved vs available vs incoming stock visibility
- bulk item and catalog management (import/export)

### Batch and serial tracking

- lot/batch number assignment on inward
- expiry date tracking with advance alerts
- serial number tracing per unit

### Barcode

- barcode generation: EAN-13, CODE-128, QR
- scanner input normalization (USB, Bluetooth, camera)
- label design and thermal printing queue

### Alerts and intelligence

- low-stock threshold alerts (per SKU, per location)
- expiry approaching alerts (configurable lead days)
- reorder suggestions based on average daily consumption
- fast-moving and slow-moving item analysis

### Valuation and reporting

- stock valuation at cost (FIFO / weighted average)
- ageing report for slow-moving inventory
- location-wise stock position snapshot

---

## Events Produced

| Event              | Trigger                     | Consumers                               |
| ------------------ | --------------------------- | --------------------------------------- |
| `StockAdjusted`    | manual adjustment confirmed | finance (valuation update), reporting   |
| `StockTransferred` | location transfer confirmed | finance (location valuation), reporting |
| `StockReserved`    | order confirmed / checkout  | (internal)                              |
| `StockReleased`    | cancellation or return      | (internal)                              |
| `LowStockAlert`    | threshold breached          | notifications (push/WhatsApp)           |
| `ExpiryAlert`      | batch within threshold      | notifications, reporting                |

## Events Consumed

| Event                | From               | Action                                 |
| -------------------- | ------------------ | -------------------------------------- |
| `InvoiceCreated`     | sales.invoicing    | deduct outward stock for invoice items |
| `InvoiceCancelled`   | sales.invoicing    | restock invoice items                  |
| `PosSessionClosed`   | sales.pos          | batch-deduct all session sales         |
| `PurchaseBillPosted` | purchases.purchase | record inward stock for PO items       |
| `CreditNoteCreated`  | sales              | trigger restock for returned items     |

---

## API Contracts

```
GET    /api/v1/products                          listProducts (search, category, low-stock flag)
POST   /api/v1/products                          createProduct
GET    /api/v1/products/:id                      getProduct
PATCH  /api/v1/products/:id                      updateProduct
POST   /api/v1/products/:id/adjust-stock         adjustStock (reason, qty delta)
POST   /api/v1/products/bulk-update              bulkUpdateProducts
GET    /api/v1/stock/levels                      getStockLevels (location, category)
POST   /api/v1/stock/transfers                   createTransfer
GET    /api/v1/stock/movements                   listMovements (sku, location, date)
GET    /api/v1/stock/alerts                      getLowStockAlerts
GET    /api/v1/batches                           listBatches (expiry range, sku)
```

---

## Backend Package (target)

```
packages/inventory/src/
├── product.ts          ← createProduct, updateProduct, listProducts, getProduct, archiveProduct
├── stock.ts            ← adjustStock, reserveStock, releaseStock, getStockLevel
├── transfer.ts         ← createTransfer, confirmTransfer, listTransfers
├── batch.ts            ← createBatch, trackExpiry, listExpiringBatches
├── barcode.ts          ← generateBarcode, normalizeScanInput
└── types.ts
```

---

## Guardrails

- **one stock mutation path**: all stock writes go through `inventory.stock.adjustments` or domain events — never direct DB writes from other domains
- `sales` and `purchases` trigger stock changes via events — never call inventory service directly
- reservations are soft holds — always confirmed by `StockAdjusted` event on final fulfillment
- valuation method (FIFO/weighted-avg) is configured per business, not per product

---

## Current Status

| Sub-module               | Status     |
| ------------------------ | ---------- |
| product CRUD             | ✅ active  |
| basic stock tracking     | ✅ active  |
| stock adjustment         | ✅ active  |
| low-stock alerts         | ✅ active  |
| multi-location (godowns) | ⏳ pending |
| stock transfer           | ⏳ pending |
| batch/lot tracking       | ⏳ pending |
| expiry management        | ⏳ pending |
| serial number tracking   | ⏳ pending |
| barcode generation       | ⏳ pending |
| label printing           | ⏳ pending |
| reorder suggestions      | ⏳ pending |
| stock valuation report   | ⏳ pending |

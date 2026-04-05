# Domain: Reporting

> Odoo equivalent: `addons/account_reports` + dashboard widgets across addons
>
> Owner squad: Sales Domain Squad (reads) / Platform Squad (delivery)
>
> Status: Basic sales reports active — inventory, finance, GST reports pending

---

## Mission

Own all read-model projections and business intelligence reports. Reporting never mutates data — it reads from domain-owned projections and aggregates results for dashboards, exports, and scheduled delivery. Every report is a query — it owns no business logic.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                                     |
| ------------------- | -------------------------------------------------------------------- |
| All products        | `reporting.dashboard` (at minimum)                                   |
| Accounting Software | `reporting.finance-reports`, `reporting.gst-reports`                 |
| Inventory Software  | `reporting.inventory-reports`                                        |
| Pro+ plans          | `reporting.party-reports`, scheduled delivery, custom report builder |

---

## Sub-modules

```
reporting/
  sales-reports/         ← sales summary, item-wise, party-wise, day/week/month
  inventory-reports/     ← stock position, movement, valuation, ageing, fast/slow
  finance-reports/       ← P&L, balance sheet, cashbook, daybook, outstanding
  gst-reports/           ← GSTR-1 summary, HSN summary, tax collected, input credit
  party-reports/         ← party-wise sales, payments, outstanding, DSO
  dashboard/             ← KPI widgets: today's sales, pending invoices, low stock
```

---

## Capabilities

### Sales reports

- sales summary by day / week / month / year
- item-wise sales (qty, value, top SKUs)
- party-wise sales (top customers, new vs repeat)
- sales rep performance (multi-user)
- cancelled and return rate

### Inventory reports

- stock position by location (godown/store)
- stock movement ledger (inward/outward by SKU, date)
- low-stock and overstock position
- batch expiry report
- fast-moving and slow-moving item analysis (velocity)
- stock valuation (cost vs market)
- stock ageing (days since last movement)

### Finance reports

- P&L (profit & loss) for date range
- balance sheet (as of date)
- cashbook (inflow/outflow by date)
- daybook (all transactions for a day)
- outstanding receivables (customer-wise)
- outstanding payables (supplier-wise)
- ageing report (0-30, 31-60, 61-90, 90+)

### GST reports

- GSTR-1 data preview (B2B, B2C, HSN summary)
- tax collected (output GST by period)
- input tax credit summary
- HSN/SAC summary report

### Party reports

- party-wise sales, purchases, payments, balance
- DSO (Days Sales Outstanding) per customer
- top customers and suppliers by value

### Dashboard

- today's billing total, invoice count
- pending / overdue invoice count + value
- low-stock SKU count
- recent transactions feed

---

## Events Consumed

| Event                | From             | Action                                      |
| -------------------- | ---------------- | ------------------------------------------- |
| `InvoiceCreated`     | sales.invoicing  | update sales report projections             |
| `PaymentRecorded`    | finance.payments | update outstanding and cashbook projections |
| `StockAdjusted`      | inventory        | update stock position projection            |
| `PurchaseBillPosted` | purchases        | update payables projection                  |
| `GstReturnGenerated` | compliance       | attach export file to return record         |
| `PosSessionClosed`   | sales.pos        | update day-level aggregates                 |

---

## API Contracts

```
GET   /api/v1/reports/sales/summary          getSalesSummary (period, groupBy)
GET   /api/v1/reports/sales/items            getItemSalesReport (period, sku)
GET   /api/v1/reports/sales/parties          getPartySalesReport (period, partyId)
GET   /api/v1/reports/inventory/stock        getStockReport (location, category)
GET   /api/v1/reports/inventory/movement     getMovementReport (sku, dateFrom, dateTo)
GET   /api/v1/reports/inventory/ageing       getStockAgeing
GET   /api/v1/reports/finance/pl             getProfitLoss (dateFrom, dateTo)
GET   /api/v1/reports/finance/cashbook       getCashbook (date)
GET   /api/v1/reports/finance/outstanding    getOutstandingReport (type: receivable|payable)
GET   /api/v1/reports/gst/summary            getGSTSummary (period)
GET   /api/v1/reports/gst/hsn                getHSNReport (period)
GET   /api/v1/reports/dashboard              getDashboardKPIs
```

---

## Guardrails

- reporting functions are **read-only** — no business logic, no mutations
- reports never call other domains' service methods — only read from DB projections or aggregated views
- scheduled report delivery (Pro+) uses BullMQ jobs — never blocks HTTP request cycle
- custom report builder (Scale+) is constrained to predefined dimension/metric taxonomy — no raw SQL exposure
- report projections may be cached (Redis) with explicit TTLs — invalidated by domain events

---

## Current Status

| Report                    | Status     |
| ------------------------- | ---------- |
| Sales summary (basic)     | ✅ active  |
| Item-wise sales           | ✅ active  |
| Outstanding receivables   | ✅ active  |
| GSTR-1 preview            | ✅ active  |
| Inventory stock position  | ⏳ pending |
| Stock movement ledger     | ⏳ pending |
| P&L / balance sheet       | ⏳ pending |
| Cashbook / daybook        | ⏳ pending |
| Party-wise DSO            | ⏳ pending |
| Fast/slow moving items    | ⏳ pending |
| Dashboard KPIs            | ⏳ partial |
| Scheduled report delivery | ⏳ pending |
| Custom report builder     | ⏳ pending |

# Module: E-Invoicing

> Codebase package: `@execora/modules` → `e-invoice/`
>
> PRD source: `domains/compliance.md`
>
> Owner squad: Finance + Compliance Squad
>
> Status: GSTR-1 + GST calculation active — IRP submission, IRN lifecycle, e-Way Bill pending

---

## Mission

Own all statutory compliance workflows for Indian regulators: GST rate lookup and calculation, e-invoicing (IRP/IRN lifecycle), e-way bill generation, GST return export (GSTR-1 and GSTR-3B), and audit record retention. This module is strictly downstream of invoicing — it enriches invoices with IRN and signed QR after IRP submission but never creates or modifies invoice core data.

---

## Products Enabled

| Product             | Features used                                                   |
| ------------------- | --------------------------------------------------------------- |
| Invoicing Software  | `einvoicing/*` (IRN + signed QR on eligible B2B invoices, Pro+) |
| Accounting Software | `gst/gstr1`, `gst/gstr3b`, `gst/gst-ledger` (GST reporting)     |
| All plans (Pro+)    | `einvoicing/*`, `ewaybill/*` (entitlement-gated)                |
| All plans (base)    | `gst/gst-calculation`, `gst/state-codes` (always available)     |

---

## Feature Modules

```
e-invoice/
  gst/
    gst-calculation/         ← CGST/SGST/IGST/CESS computation by HSN + supply type + party state
    gst-slabs/               ← GST rate tables (0%, 5%, 12%, 18%, 28%) per HSN mapped to categories
    kirana-rates/            ← kirana/FMCG category-specific GST rate defaults (grocery, pharma, etc.)
    state-codes/             ← Indian state GSTIN prefix map (01–38) for IGST vs SGST routing
    itc-classification/      ← eligible vs blocked ITC per expense/purchase category
    indian-fy/               ← financial year helpers: getIndianFY(), indianFYRange()

  gstr-returns/
    gstr1/                   ← aggregate B2B, B2CL, B2CS, CDNR, HSN summary for GSTR-1
    gstr3b/                  ← compute net tax liability summary for GSTR-3B (output − ITC)
    return-export/           ← export GSTR-1 / GSTR-3B as NIC JSON format or Excel
    schema-updates/          ← handle GST schema version changes without breaking existing logic
    audit-trail/             ← full GST audit trail per invoice including all tax postings

  einvoicing/
    eligibility/             ← check B2B + turnover ≥ ₹5 Cr + document type qualifiers
    schema-builder/          ← build IRP-compliant JSON schema v1.1 payload from invoice data
    irp-submission/          ← submit to IRP (direct) or via GSP/TaxOne adapter
    irn-lifecycle/           ← store IRN, ACK number, signed QR per invoice
    signed-qr/               ← embed signed QR into invoice PDF (via invoicing/output)
    cancellation/            ← cancel IRN within 24-hour window with reason code
    audit-records/           ← retain all IRP request/response pairs for 7 years

  ewaybill/
    eligibility/             ← check consignment value > ₹50,000 and category exemptions
    payload-builder/         ← build NIC-compliant e-way bill JSON payload
    generation/              ← call NIC portal API to generate EWB number
    status-sync/             ← poll and sync EWB status (active, cancelled, expired, extended)
```

---

## Feature Module Contracts

Each feature module exposes:

```
e-invoice/<feature>/
  contracts/
    commands.ts     ← write operation inputs + return types
    queries.ts      ← read operation inputs + return types
    events.ts       ← domain events emitted
    errors.ts       ← typed error codes
  commands/         ← command handler implementations
  queries/          ← query handler implementations
  policies/         ← guards (e.g. only eligible invoices proceed to IRP)
  __tests__/        ← unit tests per command/query
```

---

## Capabilities

### GST calculation

- input: HSN code, supply type (B2B/B2C), seller state, buyer state/GSTIN, amount
- output: CGST rate + amount, SGST rate + amount (intra-state) OR IGST rate + amount (inter-state)
- CESS calculation for applicable HSN (tobacco, vehicles, aerated drinks)
- GST slab tables: 0%, 5%, 12%, 18%, 28% with HSN to category mapping
- kirana/FMCG defaults: automatic GST rate suggestion for grocery, pharma, dairy, etc.
- Indian financial year: April 1 – March 31 helpers for period-based reports

### GST returns

- **GSTR-1**:
  - B2B section (invoices with GSTIN buyer)
  - B2CL section (B2C large: inter-state invoices > ₹2.5L)
  - B2CS section (B2C small: all other B2C)
  - CDNR section (credit/debit notes — registered parties)
  - HSN summary (turnover + tax by HSN)
  - nil-rated and exempt supply
- **GSTR-3B**: net tax liability = total output tax − eligible ITC
- Export: NIC JSON format (direct filing) or Excel (audit/review)
- Quarterly vs monthly filing period support
- GST audit trail: every tax posting with invoice reference

### E-Invoicing (IRP)

- eligibility check: turnover ≥ ₹5 Cr AND B2B invoice (buyer has GSTIN) AND document type
- build IRP schema v1.1 JSON payload with all mandatory fields
- submit to IRP via direct API or via GSP/TaxOne adapter (configurable)
- receive and store: IRN, ACK number, signed QR, acknowledgement datetime
- embed signed QR in invoice PDF (triggers `EInvoiceIssued` event → invoicing module attaches)
- cancel IRN within 24-hour window with cancellation reason code
- retain all IRP request/response payloads for 7-year statutory retention

### E-Way Bill

- eligibility: consignment value > ₹50,000, certain categories exempt (hand-carried < 50km, etc.)
- build NIC-compliant e-way bill JSON payload (Part A and Part B)
- generate EWB number via NIC portal API
- sync EWB status: active, cancelled, expired, extension requested
- link EWB number to invoice and delivery challan

---

## Events Produced

| Event                | Trigger                    | Consumers                                              |
| -------------------- | -------------------------- | ------------------------------------------------------ |
| `EInvoiceRequested`  | eligible invoice confirmed | e-invoicing/irp-submission (start submission pipeline) |
| `EInvoiceIssued`     | IRN received from IRP      | invoicing (attach IRN + signed QR to invoice PDF)      |
| `EInvoiceCancelled`  | cancellation confirmed     | invoicing (mark e-invoice cancelled on invoice)        |
| `EWayBillGenerated`  | EWB number received        | invoicing (attach to delivery challan)                 |
| `GstReturnGenerated` | return export completed    | reporting                                              |

## Events Consumed

| Event              | From      | Action                                                       |
| ------------------ | --------- | ------------------------------------------------------------ |
| `InvoiceCreated`   | invoicing | run eligibility check → fire `EInvoiceRequested` if eligible |
| `InvoiceCancelled` | invoicing | auto-cancel IRN if within 24-hour window                     |

---

## API Contracts

```
GET    /api/v1/compliance/einvoice/eligibility/:invoiceId    checkEInvoiceEligibility
POST   /api/v1/compliance/einvoice/submit/:invoiceId         submitToIRP
POST   /api/v1/compliance/einvoice/cancel/:invoiceId         cancelIRN
GET    /api/v1/compliance/einvoice/:invoiceId                getEInvoiceRecord

POST   /api/v1/compliance/ewaybill/generate/:invoiceId       generateEWayBill
GET    /api/v1/compliance/ewaybill/:invoiceId                getEWayBillStatus
PATCH  /api/v1/compliance/ewaybill/:id/extend                extendEWayBill

GET    /api/v1/compliance/gst/gstr1                          generateGSTR1 (period)
GET    /api/v1/compliance/gst/gstr3b                         generateGSTR3B (period)
GET    /api/v1/compliance/gst/export/:type                   exportGSTReturn (json|excel)
GET    /api/v1/compliance/gst/summary                        getGSTSummary (period)

GET    /api/v1/gst/rates                                     getGSTRates (hsn)
GET    /api/v1/gst/state-codes                               getStateCodes
POST   /api/v1/gst/calculate                                 calculateGST (hsn, amount, states)
```

---

## Backend Package (current)

```
packages/modules/src/e-invoice/
  index.ts                        ← barrel export

packages/modules/src/modules/gst/
  gst.service.ts                  ← gstService: GST_SLABS, KIRANA_GST_RATES, calculate (active)
  gstr1.service.ts                ← Gstr1Service: GSTR-1 report generation (active)
```

## Backend Package (target — feature split)

```
packages/modules/src/e-invoice/
  index.ts
  gst/
    gst-calculation/
    gst-slabs/
    kirana-rates/
    state-codes/
    itc-classification/
    indian-fy/
  gstr-returns/
    gstr1/
    gstr3b/
    return-export/
    schema-updates/
    audit-trail/
  einvoicing/
    eligibility/
    schema-builder/
    irp-submission/
    irn-lifecycle/
    signed-qr/
    cancellation/
    audit-records/
  ewaybill/
    eligibility/
    payload-builder/
    generation/
    status-sync/
```

---

## Current Implementation Status

| Feature                      | Status     | Notes                                  |
| ---------------------------- | ---------- | -------------------------------------- |
| `gst/gst-calculation`        | ✅ Active  | CGST/SGST/IGST by HSN + state          |
| `gst/gst-slabs`              | ✅ Active  | rate tables (0–28%)                    |
| `gst/kirana-rates`           | ✅ Active  | FMCG/grocery category defaults         |
| `gst/state-codes`            | ✅ Active  | Indian state GSTIN prefix map          |
| `gst/indian-fy`              | ✅ Active  | `getIndianFY()`, `indianFYRange()`     |
| `gstr-returns/gstr1`         | ✅ Active  | B2B, B2CL, B2CS, CDNR, HSN summary     |
| `gstr-returns/return-export` | 🔲 Pending | NIC JSON + Excel export                |
| `gstr-returns/gstr3b`        | 🔲 Pending | net tax liability                      |
| `einvoicing/eligibility`     | 🔲 Pending | turnover + B2B check                   |
| `einvoicing/schema-builder`  | 🔲 Pending | IRP v1.1 JSON payload                  |
| `einvoicing/irp-submission`  | 🔲 Pending | IRP API call (direct + TaxOne adapter) |
| `einvoicing/irn-lifecycle`   | 🔲 Pending | IRN + ACK + signed QR storage          |
| `einvoicing/cancellation`    | 🔲 Pending | 24-hour cancel window                  |
| `einvoicing/audit-records`   | 🔲 Pending | 7-year retention                       |
| `ewaybill/*`                 | 🔲 Pending | all e-way bill features                |

---

## Engineering Rules

- e-invoicing and e-way bill features are entitlement-gated — check `compliance.einvoicing` feature flag at API boundary before any IRP call
- this module is strictly downstream of `invoicing` — it never mutates invoice core data; only attaches IRN/QR via event
- `InvoiceCreated` event drives eligibility check — do not inline e-invoice logic inside invoice creation
- all IRP request/response payloads must be stored verbatim for 7-year audit retention — never discard
- IRN cancellation is only valid within 24 hours of generation — enforce this with a time-check policy
- GST rate tables (`gst-slabs`, `kirana-rates`) are static config — load once on startup, do not query DB per calculation
- GSTR-1 and GSTR-3B are read models derived from posted transactions — never generate from app-level state alone

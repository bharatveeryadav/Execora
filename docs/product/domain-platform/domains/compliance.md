# Domain: Compliance

> Odoo equivalent: `addons/l10n_in` + `addons/l10n_in_edi` + `addons/l10n_in_edi_ewaybill`
>
> Owner squad: Finance + Compliance Squad
>
> Status: GSTR-1 active — e-Invoice (IRN), e-Way Bill pending

---

## Mission

Own all statutory compliance workflows for Indian regulators: e-invoicing (IRP/IRN), e-way bill, GST return generation, and audit record retention. Compliance domain enriches invoices with IRN and signed QR after submission — it is strictly downstream of sales.

---

## Products Enabled By This Domain

| Product             | Domains consumed                                                   |
| ------------------- | ------------------------------------------------------------------ |
| Invoicing Software  | `compliance.einvoicing` (IRN + signed QR on eligible B2B invoices) |
| Accounting Software | `compliance.gst` (GSTR-1, GSTR-3B exports)                         |
| All plans (Pro+)    | `compliance.einvoicing`, `compliance.ewaybill`                     |

---

## Sub-modules

```
compliance/
  einvoicing/
    eligibility/         ← check if invoice qualifies for e-invoice (turnover, B2B)
    schema/              ← build IRP-compliant JSON payload from invoice data
    irp-submission/      ← call IRP API (direct or via GSP/TaxOne)
    irn/                 ← store and retrieve IRN per invoice
    signed-qr/           ← embed signed QR in invoice PDF
    cancellation/        ← cancel IRN within 24-hour window, store record
    audit-records/       ← retain all IRP responses for 7 years

  ewaybill/
    eligibility/         ← check if consignment needs e-way bill (value > ₹50,000)
    payload-builder/     ← build NIC-compliant e-way bill JSON
    generation/          ← generate EWB number via NIC API
    status-sync/         ← sync EWB status (active, cancelled, expired)

  gst/
    gstr1/               ← aggregate B2B, B2C, CDNR, HSN summary for GSTR-1
    gstr3b/              ← compute net tax liability summary for GSTR-3B
    return-export/       ← export GSTR-1 / GSTR-3B as JSON (NIC format) or Excel
    schema-updates/      ← handle GST schema version changes
    audit/               ← GST audit trail for all tax postings
```

---

## Capabilities

### E-Invoice (IRP)

- eligibility check: turnover ≥ ₹5 Cr, B2B invoice (customer has GSTIN)
- build IRP schema v1.1 JSON payload
- submit to IRP (direct) or via GSP/TaxOne adapter
- receive IRN + signed QR + acknowledgement number
- embed signed QR in invoice PDF via sales.invoicing.print-engine
- cancel IRN within 24-hour window with cancellation reason
- retain all IRP request/response payloads for audit

### E-Way Bill

- eligibility check: consignment value > ₹50,000, certain categories exempt
- build NIC-compliant EWB payload
- generate EWB number via NIC portal API
- sync status (active, cancelled, expired)
- link EWB to invoice and delivery challan

### GST Returns

- GSTR-1: B2B, B2C large, B2C small, CDNR, HSN summary, nil-rated
- GSTR-3B: net tax liability (output - ITC)
- export in NIC JSON format and Excel
- handle quarterly vs monthly filing period
- maintain GST audit trail per invoice

---

## Events Produced

| Event                | Trigger                        | Consumers                                    |
| -------------------- | ------------------------------ | -------------------------------------------- |
| `EInvoiceRequested`  | eligible invoice confirmed     | compliance.einvoicing.irp-submission         |
| `EInvoiceIssued`     | IRN received from IRP          | sales.invoicing (attach IRN + QR to invoice) |
| `EInvoiceCancelled`  | cancellation request confirmed | sales.invoicing (mark cancelled in PDF)      |
| `EWayBillGenerated`  | EWB number received            | sales.invoicing (attach to delivery challan) |
| `GstReturnGenerated` | return export completed        | reporting                                    |

## Events Consumed

| Event              | From            | Action                                                       |
| ------------------ | --------------- | ------------------------------------------------------------ |
| `InvoiceCreated`   | sales.invoicing | run eligibility check → fire `EInvoiceRequested` if eligible |
| `InvoiceCancelled` | sales.invoicing | auto-cancel IRN if within 24 hours                           |

---

## API Contracts

```
GET    /api/v1/compliance/einvoice/eligibility/:invoiceId   checkEInvoiceEligibility
POST   /api/v1/compliance/einvoice/submit/:invoiceId        submitToIRP
POST   /api/v1/compliance/einvoice/cancel/:invoiceId        cancelIRN
GET    /api/v1/compliance/einvoice/:invoiceId               getEInvoiceRecord
POST   /api/v1/compliance/ewaybill/generate/:invoiceId      generateEWayBill
GET    /api/v1/compliance/gst/gstr1                         generateGSTR1 (period)
GET    /api/v1/compliance/gst/gstr3b                        generateGSTR3B (period)
GET    /api/v1/compliance/gst/export/:type                  exportGSTReturn (json|excel)
```

---

## Backend Package (target)

```
packages/compliance/src/                   (or packages/modules/src/compliance/)
├── einvoice.ts         ← checkEligibility, buildIRPPayload, submitToIRP,
│                          storeIRN, cancelIRN, getAuditRecord
├── ewaybill.ts         ← checkEWBEligibility, buildEWBPayload, generateEWB, syncStatus
├── gstr1.ts            ← aggregateGSTR1, exportGSTR1JSON, exportGSTR1Excel
├── gstr3b.ts           ← computeGSTR3B, exportGSTR3B
└── types.ts
```

Currently `gstr1.ts` logic lives in `packages/modules/src/modules/gst/gstr1.service.ts`.

---

## IRP Integration Adapters

```
packages/modules/src/integrations/
├── irp-direct.ts     ← direct NIC IRP API
└── taxone.ts         ← TaxOne GSP adapter (fallback / enterprise)
```

Adapter is selected by business config — same compliance domain, different transport.

---

## Guardrails

- e-invoice eligibility check is mandatory before every IRP submission — no bypass
- IRN, signed QR, and all IRP API responses must be stored in `compliance.einvoicing.audit-records` — never discard
- cancellation window is 24 hours from IRN issuance — system must enforce this cutoff
- e-invoicing and e-way bill logic is behind manifest entitlement gate (`features.eInvoice`, `features.eWayBill`)
- GST schema changes are version-controlled in `compliance.gst.schema-updates` — never hotfix in place
- cross-tenant data isolation: all IRP payloads include supplier GSTIN — validated against tenant business profile before submission

---

## Current Status

| Sub-module                    | Status     |
| ----------------------------- | ---------- |
| GSTR-1 generation             | ✅ active  |
| GST computation (rate lookup) | ✅ active  |
| e-Invoice eligibility check   | ⏳ pending |
| IRP submission (direct)       | ⏳ pending |
| IRN storage + signed QR embed | ⏳ pending |
| IRN cancellation              | ⏳ pending |
| e-Way Bill generation         | ⏳ pending |
| GSTR-3B computation           | ⏳ pending |
| GST return export (NIC JSON)  | ⏳ pending |
| TaxOne GSP adapter            | ⏳ pending |

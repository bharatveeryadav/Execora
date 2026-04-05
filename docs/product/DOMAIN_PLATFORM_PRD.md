# Execora Complete Product PRD

> Purpose: Canonical product and architecture PRD for a Vyapar-inspired, domain-first business platform.
>
> Status: Approved architecture direction
>
> Version: 2.0
>
> Date: 2026-04-05
>
> Owners: Product + Architecture + Platform

---

## 1. Executive Summary

Execora will be built as a domain-driven business operating platform, not as a single billing app with feature sprawl.

Target architecture:

Core -> Domains -> Platform -> Products -> Apps

This means:

- Core: system engine (DB, transactions, events, tenancy, observability)
- Domains: business logic ownership (sales, inventory, finance, purchases, crm, compliance, reporting)
- Platform: SaaS controls (plans, subscription, feature gates, usage, product configuration)
- Products: configuration overlays (Billing, Invoicing, POS, Accounting)
- Apps: web and mobile delivery surfaces

Primary outcomes:

- full SMB feature breadth comparable to leading market products
- clean boundaries and lower coupling
- easier upgrades and maintainability
- faster team scaling by domain ownership
- production-grade reliability for mobile and web

---

## 2. Vision and Objectives

### 2.1 Vision

Build the most practical operating system for Indian SMEs to run billing, invoicing, inventory, accounting, and compliance from one platform.

### 2.2 Product objectives

- bill creation and checkout speed
- accurate GST and compliance outputs
- inventory correctness with location and batch awareness
- strong receivables and payment collection workflows
- offline continuity for field and store environments
- clear SaaS packaging by plan and product

### 2.3 Engineering objectives

- strict domain boundaries
- product composition by config only
- one authoritative path for stock and payments
- event-ready integration model
- testable and observable workflows

---

## 3. Market and Competitor Research Summary

Public competitor positioning (homepage, accounting, inventory, invoicing, POS, e-invoicing, and OCR pages) shows consistent demand for:

- GST billing and compliance
- accounting for non-accountants
- inventory and stock operations
- fast POS checkout
- multi-payment collection and reminders
- templates, print, and sharing workflows
- multi-user and multi-device operations
- offline usage and backup confidence
- hardware compatibility (barcode, printers, scale, drawer)
- role-based operations and reporting
- statutory e-invoicing with IRN and QR-code compliance
- OCR-assisted purchase and expense data capture
- party-wise pricing and retail-vs-wholesale pricing control
- real-time multi-device sync and mobile-first operator access
- bulk item maintenance, credit controls, and retail online-store extension

Implication for Execora:

- do not build isolated product silos
- build shared domains and compose products from them
- keep operations and accounting tightly integrated by contracts
- treat compliance artifacts and OCR ingestion as first-class workflows, not helper features

---

## 4. Product Line Strategy

Execora ships four primary products on the same backend:

1. Billing Product
2. Invoicing Product
3. POS Product
4. Accounting Product

Products are not modules. Products are manifests that enable domain capabilities.

Advanced cross-cutting capabilities such as e-invoicing and OCR-assisted procurement must be attached through manifest entitlements or add-ons, not hardcoded route branching.

### 4.1 Billing Product

Core capabilities:

- quick sale billing
- walk-in and party billing
- discounts, taxes, totals
- party-wise and retail-vs-wholesale pricing
- payment capture and reminders
- document share/print
- multiple invoice templates

### 4.2 Invoicing Product

Core capabilities:

- invoice lifecycle and numbering
- quotations, proforma, delivery challans
- template and print engine
- GST-compliant invoice outputs
- invoice status and receivables tracking

### 4.3 POS Product

Core capabilities:

- cart/session checkout flow
- multi-counter support model
- single-screen multi-payment experience
- receipt/thermal workflows
- offline-safe counter operations

### 4.4 Accounting Product

Core capabilities:

- bookkeeping automation from transactions
- ledger, journal, CoA, trial balance
- P&L, balance sheet, cashbook, daybook
- GST reporting and finance reporting
- reconciliation and expense tracking

---

## 5. Final Domain Model

Top-level domains remain fixed:

```text
domains/
  sales/
  inventory/
  finance/
  purchases/
  crm/
  compliance/
  reporting/
  platform/
  admin/
  integrations/
  system/
```

No additional top-level domains without architecture review.

---

## 6. Domain Breakdown (Final)

### 6.1 Sales

```text
sales/
  invoicing/
    invoice/
    quotation/
    proforma/
    delivery-challan/
    recurring/
    returns/
    template-engine/
    print-engine/
    numbering/
    payment-state/
  pos/
    billing/
    cart/
    checkout/
    session/
    receipt/
    offline-sync/
    multi-counter/
  billing/
    pricing/
    party-pricing/
    channel-pricing/
    item-calculation/
    tax-calculation/
    totals/
  returns/
```

### 6.2 Inventory

```text
inventory/
  stock/
    items/
    bulk-update/
    stock-level/
    reservations/
    adjustments/
  warehouse/
    godown/
    store/
    transfer/
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

### 6.3 Finance

```text
finance/
  accounting/
    ledger/
    journal/
    chart-of-accounts/
    trial-balance/
    balance-sheet/
    profit-loss/
    cashbook/
    daybook/
  payments/
    payment-in/
    payment-out/
    settlement/
    payment-allocation/
  reconciliation/
    bank-reconciliation/
  expenses/
  tax-ledger/
```

### 6.4 Purchases

```text
purchases/
  purchase/
    purchase-bill/
    purchase-order/
    purchase-return/
  vendors/
    supplier-management/
  ocr/
    upload/
    extraction/
    normalization/
    gst-extractor/
    review-correction/
    transaction-linking/
```

### 6.5 CRM

```text
crm/
  parties/
    customers/
    suppliers/
    party-ledger/
    credit-limit/
    relationship/
  communication/
    history/
    preferences/
    reminders/
```

### 6.6 Compliance

```text
compliance/
  einvoicing/
    eligibility/
    schema/
    irp-submission/
    irn/
    signed-qr/
    cancellation/
    audit-records/
  ewaybill/
    eligibility/
    payload-builder/
    generation/
    status-sync/
  gst/
    gstr1/
    gstr3b/
    return-export/
    schema-updates/
    audit/
```

### 6.7 Reporting

```text
reporting/
  sales-reports/
  inventory-reports/
  finance-reports/
  gst-reports/
  party-reports/
  dashboard/
```

### 6.8 Platform

```text
platform/
  pricing/
    plans/
    limits/
  subscription/
    lifecycle/
    billing-cycle/
  feature-toggle/
  usage/
    metering/
    quotas/
  sync/
    multi-device/
    conflict-policy/
  product-config/
```

### 6.9 Admin

```text
admin/
  users/
  roles/
  permissions/
  tenants/
  support-ops/
```

### 6.10 Integrations

```text
integrations/
  payment/
  whatsapp/
  sms/
  hardware/
    printer/
    barcode/
    weighing-scale/
    edc-machine/
    cash-drawer/
  ecommerce/
    online-store/
  taxone/
```

### 6.11 System

```text
system/
  audit/
  backup/
    restore/
  logs/
  notifications/
  storage/
  search/
  cache/
  offline-sync/
```

---

## 7. Product Manifest Architecture

Products are manifest-driven overlays.

Example manifest contract:

```yaml
product: pos
displayName: POS
domains:
  - sales.pos
  - sales.billing
  - inventory.stock
  - inventory.movement
  - finance.payments
  - reporting.dashboard
features:
  - quick_checkout
  - thermal_receipt
  - barcode_scan
  - low_stock_alerts
limits:
  users: 5
  counters: 3
  monthlyTransactions: 50000
navigation:
  mobile:
    - pos_home
    - cart
    - receipts
    - dashboard
  web:
    - pos_terminal
    - sales
    - reports
industryPresets:
  - retail
  - grocery
```

Rules:

- manifests configure enablement only
- manifests do not contain business calculations
- same manifest semantics must be used by backend, web, and mobile
- cross-cutting capabilities such as e-invoicing and OCR must be declared as manifest entitlements or add-ons

---

## 8. Operating Rules and Architecture Guardrails

### 8.1 Required rules

- domains are independent ownership units
- cross-domain reactions should move to events
- products are config-only
- shared naming across backend/web/mobile
- one payment orchestration path
- one stock mutation path
- role and tenant checks at API boundary
- route feature gates for plan/entitlement checks

### 8.2 Anti-patterns

- cross-domain direct service spaghetti
- hardcoded plan checks in UI only
- product-specific backend branching
- duplicate payment posting logic
- direct stock writes from many services

### 8.3 CI enforcement

- import-boundary lint rules
- forbidden dependency checks
- contract tests for key events and DTOs
- manifest schema validation in CI

---

## 9. Capability Matrix (Research-Derived)

### 9.1 Billing and Invoicing capabilities

- professional templates and branding
- print variants and receipt modes
- quotations/proforma/challan support
- GST-compliant invoice outputs
- QR-based collection and multi-payment methods
- payment reminders and status tracking
- offline billing continuity
- party-wise item pricing and retail-vs-wholesale rate handling
- separate commercial invoice and statutory e-invoice workflows when applicable

### 9.2 Inventory capabilities

- multi-location (godown/store) inventory
- stock transfer and movement ledger
- low-stock and expiry alerts
- batch and serial tracking
- barcode generation and scanning
- bulk item updates and catalog maintenance workflows
- valuation and ageing reports
- reserved vs available stock handling

### 9.3 POS capabilities

- fast checkout and queue handling
- single-screen payment experience
- counter sessions and multi-counter model
- hardware-assisted workflows
- barcode-first and weighing-scale-assisted retail operations
- offline-first counter operation
- synchronized sales and stock updates

### 9.4 Accounting capabilities

- automated bookkeeping from transactions
- journal and ledger support
- cashbook/daybook and reconciliation
- P&L and balance sheet reporting
- GST reports linked to transaction data

### 9.5 Compliance capabilities

- IRP and GSP integration model
- IRN and signed QR handling
- schema-validated e-invoice generation
- B2B and B2G compliance workflows
- e-way bill linkage
- audit trail and cancellation window handling

### 9.6 OCR-assisted procurement capabilities

- purchase and expense document upload
- extraction of supplier, item, GST, HSN/SAC, totals, and tax breakdowns
- review-and-correct step before posting transactions
- document attachment to resulting transactions
- automatic feed into purchase, expense, and GST reporting

### 9.7 Platform and operations capabilities

- multi-user roles and access controls
- subscription and plan lifecycle
- usage limits and metering
- real-time multi-device sync and conflict-safe synchronization
- auto backup and restore posture
- backup, audit, and observability posture

---

## 10. Current Repo Alignment and Gaps

### 10.1 Strong alignment already present

- robust infrastructure layer
- tenant and feature-flag foundations
- core business modules for invoice/product/customer/ledger
- mobile feature modularity

### 10.2 Critical gaps to close

- reduce direct cross-domain coupling
- unify payment orchestration
- centralize stock mutations and reservations
- complete purchase service maturity
- move reporting to clear read-model contracts
- complete subscription and quota enforcement
- formalize multi-device sync ownership and conflict rules
- align web feature structure to domain vocabulary

### 10.3 Migration hotspots

- sales invoice orchestration
- finance ledger/payment ownership
- inventory stock movement ownership
- compliance extraction from route-level logic
- app navigation and entitlement synchronization

---

## 11. Non-Functional Requirements (Production Grade)

- tenant isolation in every query and event
- idempotent command handling for retries
- offline-first for billing/POS critical workflows
- outbox-backed reliable event publication
- auditable mutation history for finance and inventory
- SLO-backed observability (API, queue, sync)
- secure backup and restore drills
- role-based access with least privilege
- safe schema migrations and rollback plans
- predictable sync recovery after offline or multi-device conflicts

---

## 12. API and Event Direction

### 12.1 API direction

- REST remains primary for app operations
- strict validation at route boundaries
- route guards for auth, role, feature, quota

### 12.2 Event direction

Initial event set:

- InvoiceCreated
- InvoiceCancelled
- EInvoiceRequested
- EInvoiceIssued
- EInvoiceCancelled
- PaymentRecorded
- StockAdjusted
- StockTransferred
- PurchaseBillPosted
- OcrDocumentUploaded
- OcrExtractionCompleted
- ReminderScheduled
- GstReturnGenerated
- SubscriptionChanged
- QuotaExceeded

Cross-domain consumption should be explicit and contract-tested.

---

## 13. Data and State Principles

- accounting state derives from transaction events and authoritative postings
- inventory state includes onHand, reserved, available, incoming
- invoice and payment statuses are finite state machines
- commercial invoice status and statutory e-invoice status are separate state machines
- OCR ingestion is a staged pipeline: uploaded -> extracted -> reviewed -> posted -> attached
- sync state and offline reconciliation rules must be explicit for multi-device retail operations
- report projections are optimized read models, not business logic owners

---

## 14. Security and Compliance Requirements

- OTP and strong auth controls for sensitive operations
- encryption at rest and in transit
- admin action audit trails
- GST records and export traceability
- IRN, signed QR, schema payload, and cancellation references must be retained for auditable e-invoice history
- environment hardening and secrets hygiene
- rate limits and abuse protections

---

## 15. Team Topology and Ownership

Recommended squads:

1. Sales Domain Squad
2. Inventory + Purchases Squad
3. Finance + Compliance Squad
4. Platform + Admin + System Squad
5. App Composition Squad (Web + Mobile)

Ownership model:

- domains own logic and contracts
- product squad owns composition and UX
- platform squad owns entitlements, plans, governance

---

## 16. Delivery Plan

### Phase 1: Foundation (2-4 weeks)

- freeze domain names and ownership
- implement lint and CI boundary rules
- define manifest schema and config registry

### Phase 2: Core domain hardening (4-8 weeks)

- unify payment path
- centralize stock mutation and reservation logic
- complete purchases service layer
- formalize OCR review-to-transaction pipeline
- split commercial invoice flow from statutory e-invoice flow

### Phase 3: Product composition rollout (4-6 weeks)

- Billing manifest rollout
- Invoicing manifest rollout
- POS manifest rollout
- Accounting manifest rollout

### Phase 4: Platform completion (4-6 weeks)

- subscription lifecycle APIs
- usage metering and quota enforcement
- admin controls and audit exports

### Phase 5: Integration and quality (ongoing)

- hardware and communication adapters
- reliability testing and chaos drills
- parity and regression automation

---

## 17. Success Metrics

Architecture metrics:

- reduction in forbidden cross-domain imports
- single ownership for payment and stock workflows
- release lead time by domain squad
- regression rate in cross-domain changes
- e-invoice failure and retry rate under controlled thresholds
- OCR extraction-to-post accuracy after review

Product metrics:

- median bill creation time
- payment reminder conversion rate
- stock mismatch incidents per 1000 transactions
- GST report readiness time
- subscription conversion and retention

Reliability metrics:

- offline sync success rate
- queue failure/retry rates
- API P95 latency on billing/POS flows
- backup restore validation success

---

## 18. Risks and Mitigations

- Risk: migration churn from immediate folder reorg
  - Mitigation: enforce boundaries first, move folders later

- Risk: event model complexity too early
  - Mitigation: start with outbox on critical flows only

- Risk: product manifests drift from backend reality
  - Mitigation: manifest schema validation plus runtime contract tests

- Risk: web/mobile naming divergence
  - Mitigation: shared taxonomy and PR checklist enforcement

---

## 19. Decisions Locked

- architecture pattern: modular monolith first
- product strategy: four products in parallel via shared domains
- domain set: fixed 11 top-level domains
- composition strategy: products are configuration only
- migration style: incremental with boundary guardrails

---

## 20. Immediate Next Actions

1. Publish manifest schema and initial Billing/Invoicing/POS/Accounting configs.
2. Add CI boundary checks and forbidden import rules.
3. Create one authoritative payment service contract.
4. Create one authoritative stock movement contract.
5. Create explicit e-invoice compliance contract covering eligibility, schema, IRP submission, IRN, and cancellation.
6. Create explicit OCR ingestion contract covering upload, extraction, review, transaction posting, and attachment.
7. Create explicit multi-device sync contract covering device identity, merge policy, and offline replay.
8. Align web and mobile feature taxonomy to domain names.
9. Implement platform quota enforcement for protected flows.

---

## 21. Source Basis

This PRD is based on:

- existing Execora product and sprint docs in docs/product
- current repo architecture audit and coupling analysis
- competitor research from public pages covering homepage, accounting, inventory, invoicing, POS, e-invoicing, OCR, and retail billing
- architecture decisions recorded during Core -> Domains -> Platform -> Products -> Apps planning

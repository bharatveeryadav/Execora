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

## Modular PRD Navigation

Use the split PRD set below for day-to-day work. Keep this file as the canonical master reference.

- [docs/product/domain-platform/README.md](./domain-platform/README.md) — entry point and document map
- [docs/product/domain-platform/01-foundation-and-products.md](./domain-platform/01-foundation-and-products.md) — vision, product line, capability map
- [docs/product/domain-platform/02-domain-modules.md](./domain-platform/02-domain-modules.md) — domain ownership and module breakdown
- [docs/product/domain-platform/03-platform-packaging-and-entitlements.md](./domain-platform/03-platform-packaging-and-entitlements.md) — plans, packs, pricing, entitlement model
- [docs/product/domain-platform/04-app-surfaces-web-mobile-desktop.md](./domain-platform/04-app-surfaces-web-mobile-desktop.md) — app composition for web, mobile, and future desktop
- [docs/product/domain-platform/05-engineering-guardrails-and-events.md](./domain-platform/05-engineering-guardrails-and-events.md) — rules, APIs, events, security, NFRs
- [docs/product/domain-platform/06-delivery-migration-and-metrics.md](./domain-platform/06-delivery-migration-and-metrics.md) — rollout, ownership, success metrics, risks, next actions
- [docs/product/domain-platform/07-feature-module-split-guide.md](./domain-platform/07-feature-module-split-guide.md) — how to split large modules into small feature modules safely

---

## 1. Executive Summary

Execora will be built as a domain-driven business operating platform, not as a single billing app with feature sprawl.

Target architecture:

Core -> Domains -> Platform -> Products -> Apps

This means:

- Core: system engine (DB, transactions, events, tenancy, observability)
- Domains: business logic ownership (sales, inventory, finance, purchases, crm, compliance, reporting)
- Platform: SaaS controls (plans, subscription, feature gates, usage, product configuration)
- Products: five standalone software products (Billing, Invoicing, POS, Accounting, Inventory)
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

Execora is one platform that ships five standalone software products on the same backend:

1. Billing Software
2. Invoicing Software
3. POS Software
4. Accounting Software
5. Inventory Software

Each product is independently usable and marketable as its own software. A business can activate one product or all five — the underlying domain engine is shared, and data flows naturally between them without duplication.

Products are not modules. Products are manifests that enable domain capabilities.

Advanced cross-cutting capabilities such as e-invoicing and OCR-assisted procurement must be attached through manifest entitlements or add-ons, not hardcoded route branching.

### 4.1 Billing Software

Market position: the fastest way to bill a customer and collect payment.

Core capabilities:

- quick sale billing
- walk-in and party billing
- discounts, taxes, totals
- party-wise and retail-vs-wholesale pricing
- payment capture and reminders
- document share/print
- multiple invoice templates

### 4.2 Invoicing Software

Market position: complete GST invoicing with lifecycle, compliance, and receivables in one place.

Core capabilities:

- invoice lifecycle and numbering
- quotations, proforma, delivery challans
- template and print engine
- GST-compliant invoice outputs
- invoice status and receivables tracking
- e-invoice (IRP/IRN) when eligible

### 4.3 POS Software

Market position: fast counter checkout for retail and restaurant with offline confidence.

Core capabilities:

- cart/session checkout flow
- multi-counter support model
- single-screen multi-payment experience
- receipt/thermal workflows
- offline-safe counter operations
- hardware support: barcode scanner, weighing scale, cash drawer, thermal printer

### 4.4 Accounting Software

Market position: automated bookkeeping and GST reporting built from real transactions, no manual entries needed.

Core capabilities:

- bookkeeping automation from transactions
- ledger, journal, CoA, trial balance
- P&L, balance sheet, cashbook, daybook
- GST reporting and finance reporting
- reconciliation and expense tracking
- purchase bills, vendor payments, expense tracking

### 4.5 Inventory Software

Market position: complete stock control across locations with alerts, movement tracking, and valuation.

Core capabilities:

- multi-location stock management (godowns and stores)
- inward and outward stock movement with ledger
- stock transfers between locations
- batch tracking and expiry management
- serial number tracking
- barcode generation, scanning, and label printing
- low-stock alerts, overstock alerts, and reorder suggestions
- bulk item and catalog management
- stock valuation and ageing reports
- reserved vs available vs incoming stock visibility
- fast-moving and slow-moving item analysis
- purchase order and vendor receipt integration

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
    promotions/
    item-calculation/
    weight-pricing/
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
# Example: POS Software manifest
product: pos
displayName: POS Software
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
  - hardware_integration
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
```

```yaml
# Example: Inventory Software manifest
product: inventory
displayName: Inventory Software
domains:
  - inventory.stock
  - inventory.warehouse
  - inventory.movement
  - inventory.batch
  - inventory.barcode
  - inventory.alerts
  - purchases.purchase
  - reporting.inventory-reports
features:
  - multi_location_stock
  - batch_expiry_tracking
  - serial_number_tracking
  - barcode_label_printing
  - low_stock_alerts
  - reorder_suggestions
  - stock_valuation
limits:
  users: 5
  locations: 3
  skus: 10000
navigation:
  mobile:
    - stock_home
    - movements
    - alerts
    - reports
  web:
    - items
    - stock_levels
    - transfers
    - batch_tracking
    - reports
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

- Billing Software manifest rollout
- Invoicing Software manifest rollout
- POS Software manifest rollout
- Accounting Software manifest rollout
- Inventory Software manifest rollout

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
- product strategy: five standalone software products via shared domains (Billing, Invoicing, POS, Accounting, Inventory)
- domain set: fixed 11 top-level domains
- composition strategy: products are configuration only
- migration style: incremental with boundary guardrails

---

## 20. Immediate Next Actions

1. Publish manifest schema and initial Billing/Invoicing/POS/Accounting/Inventory software configs.
2. Add CI boundary checks and forbidden import rules.
3. Create one authoritative payment service contract.
4. Create one authoritative stock movement contract.
5. Create explicit e-invoice compliance contract covering eligibility, schema, IRP submission, IRN, and cancellation.
6. Create explicit OCR ingestion contract covering upload, extraction, review, transaction posting, and attachment.
7. Create explicit multi-device sync contract covering device identity, merge policy, and offline replay.
8. Align web and mobile feature taxonomy to domain names.
9. Implement platform quota enforcement for protected flows.

---

## 21. Execora Pricing Model

### 21.1 Design principles

1. Core operational value is never withheld. Every paid plan includes billing, invoicing, stock, GST basics, and mobile access. Plans differ by depth, scale, and automation — not by blocking daily work.
2. Industry behavior is purchased as a pack, not a separate product. The same backend serves all industries; the pack unlocks domain-specific fields, validation rules, and reports.
3. Metering is honest and predictable. Limits are defined upfront per plan. Overages are surfaced in-app before they generate a charge.
4. Upgrades feel obvious. Each plan level adds a clear operational capability, not just a quota bump.

---

### 21.2 Commercial model structure

```
Platform Plan
  └── base limits: businesses, users, devices
  └── core products included by tier
  └── support SLA by tier

Add-ons (purchased separately or bundled at discount)
  ├── Product Packs: Billing, Invoicing, POS, Accounting
  ├── Industry Packs: Pharmacy, Grocery, Restaurant, Jewellery, Apparel
  └── Usage Credits: messaging, compliance docs, automation jobs, storage
```

One entitlement service resolves `plan + addOns + industryPacks` → `resolvedCapabilities`.
Backend routes, UI forms, and mobile navigation all read only from `resolvedCapabilities`.

---

### 21.3 Plan definitions

#### Plan 1 — Execora Free

**For:** individuals and micro-businesses trying the platform.

**Price:** ₹0 forever

| What is included       | Limit        |
| ---------------------- | ------------ |
| Businesses             | 1            |
| Users                  | 1            |
| Billing documents      | 50/month     |
| Stock tracking         | basic        |
| GST invoice PDF        | yes          |
| Mobile and web         | yes          |
| Storage                | 1 GB         |
| WhatsApp/SMS messaging | not included |
| Accounting engine      | not included |
| POS counters           | not included |
| Industry packs         | not included |

---

#### Plan 2 — Execora Solo

**For:** single-owner businesses needing full billing and invoicing every day.

**Price:** ₹999/month — ₹9,999/year _(save 17%)_

| What is included                      | Limit / detail                 |
| ------------------------------------- | ------------------------------ |
| Businesses                            | 1                              |
| Users                                 | 2 + 1 CA seat                  |
| Billing documents                     | unlimited                      |
| Invoicing (quotes, proforma, challan) | yes                            |
| GST-compliant output + templates      | yes                            |
| Stock tracking + low-stock alerts     | yes                            |
| Party ledger and receivables          | basic                          |
| Barcode scanning                      | yes                            |
| Payment reminders                     | 300 WhatsApp/SMS credits/month |
| Mobile and web                        | all devices                    |
| Storage                               | 5 GB                           |
| Support                               | email                          |
| Accounting engine                     | not included                   |
| POS counters                          | not included                   |
| Industry packs                        | not included                   |

---

#### Plan 3 — Execora Business _(recommended for most)_

**For:** established single or multi-store SME needing full operations plus accounting.

**Price:** ₹2,499/month — ₹24,999/year _(save 17%)_

| What is included                    | Limit / detail                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Businesses                          | 3                                                                                 |
| Users                               | 5 + 1 CA seat                                                                     |
| Billing + Invoicing                 | unlimited                                                                         |
| Full Accounting                     | ledger, journals, CoA, P&L, balance sheet, cashbook, daybook, bank reconciliation |
| GST reports                         | GSTR-1 and GSTR-3B export                                                         |
| Purchase bills and expense tracking | yes                                                                               |
| OCR-assisted purchase entry         | 50 documents/month                                                                |
| Party management                    | credit limits, ageing, segments                                                   |
| Bulk item and catalog management    | yes                                                                               |
| Standard reports                    | sales, inventory, party, finance, GST                                             |
| WhatsApp/SMS credits                | 1,000/month                                                                       |
| Storage                             | 15 GB                                                                             |
| Support                             | email + chat, 24-hour response                                                    |
| POS counters                        | add-on available                                                                  |
| Industry packs                      | add-on available                                                                  |

---

#### Plan 4 — Execora Pro

**For:** high-volume businesses needing POS counters and multi-location inventory.

**Price:** ₹4,999/month — ₹49,999/year _(save 17%)_

| What is included            | Limit / detail                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Businesses                  | 10                                                                                                          |
| Users                       | 15 + 2 CA seats                                                                                             |
| Everything in Business      | yes                                                                                                         |
| POS product                 | multi-counter sessions, offline checkout, thermal receipts, hardware (barcode, weighing scale, cash drawer) |
| Multi-godown inventory      | stock transfers, location valuation, movement ledger                                                        |
| E-invoice automation        | IRN generation, signed QR, IRP submission, cancellation                                                     |
| E-way bill generation       | yes                                                                                                         |
| OCR-assisted purchase entry | 200 documents/month                                                                                         |
| Advanced automation         | recurring invoices, scheduled reminders, payment follow-up sequences                                        |
| Advanced analytics          | SKU movement, party performance, DSO, margin by category                                                    |
| WhatsApp/SMS credits        | 3,000/month                                                                                                 |
| Audit trail retention       | 3 years                                                                                                     |
| Storage                     | 50 GB                                                                                                       |
| Support                     | priority, 4-hour response SLA                                                                               |
| Industry packs              | add-on available                                                                                            |

---

#### Plan 5 — Execora Scale

**For:** distributors, chains, and businesses with 25+ outlets and deep compliance needs.

**Price:** ₹8,999/month — ₹89,999/year _(save 17%)_

| What is included            | Limit / detail                                                                  |
| --------------------------- | ------------------------------------------------------------------------------- |
| Businesses                  | 25                                                                              |
| Users                       | 40 + 3 CA seats                                                                 |
| Everything in Pro           | yes                                                                             |
| Deep automation engine      | workflow rules, trigger-based actions, approval chains for purchases and credit |
| Advanced sync governance    | multi-device conflict policy, offline replay, audit                             |
| Custom report builder       | with scheduled delivery                                                         |
| OCR-assisted purchase entry | 500 documents/month                                                             |
| Audit trail retention       | 7 years with export pack                                                        |
| WhatsApp/SMS credits        | 8,000/month                                                                     |
| Storage                     | 200 GB                                                                          |
| Onboarding                  | dedicated onboarding manager for first 60 days                                  |
| Support                     | phone support during business hours                                             |

---

#### Plan 6 — Execora Enterprise

**For:** large businesses, enterprise chains, and platforms requiring governance, custom integrations, and committed SLA.

**Price:** Custom annual contract

| What is included                        | Detail                                   |
| --------------------------------------- | ---------------------------------------- |
| Businesses and users                    | unlimited within contract scope          |
| Everything in Scale                     | yes                                      |
| SSO                                     | SAML/OIDC                                |
| Custom data retention and export policy | yes                                      |
| Custom domain and white-label kit       | yes                                      |
| Dedicated integration support           | ERP, payment gateway, logistics          |
| Role and permission customization       | beyond standard model                    |
| Quarterly compliance readiness review   | yes                                      |
| Named support engineer                  | yes                                      |
| Private SLA                             | uptime guarantee and response commitment |
| Custom security and audit review        | yes                                      |

---

### 21.4 Industry packs

Each pack attaches to any paid plan. It enables industry-specific manifest fields, API validation rules, reports, and automation from the domain profile layer.

| Pack            | Price                   | What it unlocks                                                                                                                      |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pharmacy Pack   | ₹999/month per business | drug-license fields on invoices, batch/expiry strict gate, Schedule H/H1 controls, restricted-drug register, compliance audit depth  |
| Grocery Pack    | ₹799/month per business | weighted billing, expiry-first checkout, fast/slow movement reports, offer and loyalty engine, high-volume POS flow                  |
| Restaurant Pack | ₹799/month per business | table and order management, KOT and service-mode billing, kitchen-linked receipt, cover and tip handling                             |
| Jewellery Pack  | ₹999/month per business | purity and hallmark fields, net-weight billing, making and labour charges, EMI plan reference                                        |
| Apparel Pack    | ₹799/month per business | size/color/style variant billing at line level, season and fit metadata, wholesale and retail channel pricing, variant-level returns |

All packs include a 14-day free trial on first activation.

---

### 21.5 Usage add-ons

| Unit                    | Included                   | Overage rate                      |
| ----------------------- | -------------------------- | --------------------------------- |
| Extra business          | per plan limit             | ₹999/business/month               |
| Extra user              | per plan limit             | ₹399/user/month                   |
| Extra POS counter       | included in Pro and above  | ₹999/counter/month on Business    |
| WhatsApp messages       | per plan bundle            | ₹0.50 per message beyond bundle   |
| SMS                     | per plan bundle            | ₹0.20 per message beyond bundle   |
| OCR documents           | per plan monthly cap       | ₹5 per document beyond cap        |
| E-invoice (IRN)         | unlimited in Pro and above | ₹3 per IRN beyond cap on Business |
| Storage                 | per plan limit             | ₹99/10 GB/month                   |
| Audit retention upgrade | standard per plan          | ₹999/month for 10-year retention  |

All overage charges are displayed in-app with projection before the billing cycle closes.

---

### 21.6 Annual plan incentives

- 17% cost saving on all plans when billed annually
- first 2 months of one industry pack included free with annual Business and above
- free onboarding session (1 hour video call) with annual Pro and above
- 1,000 bonus WhatsApp/SMS credits at activation with annual Solo and above
- price locked for 12 months from annual plan activation date

---

### 21.7 Entitlement schema (engineering reference)

Every tenant session resolves one entitlement object used by all route guards, UI forms, and mobile navigation:

```typescript
interface TenantEntitlements {
  planId: "free" | "solo" | "business" | "pro" | "scale" | "enterprise";
  businesses: number;
  users: number;
  caUsers: number;
  counters: number;
  products: {
    billing: boolean;
    invoicing: boolean;
    pos: boolean;
    accounting: boolean;
    inventory: boolean;
  };
  industryPacks: {
    pharmacy: boolean;
    grocery: boolean;
    restaurant: boolean;
    jewellery: boolean;
    apparel: boolean;
  };
  limits: {
    documentsPerMonth: number | "unlimited";
    ocrDocumentsPerMonth: number;
    messagingCredits: number;
    storageGB: number;
    auditRetentionYears: number;
    automationJobsPerMonth: number | "unlimited";
    eInvoicePerMonth: number | "unlimited";
  };
  features: {
    eInvoice: boolean;
    eWayBill: boolean;
    multiGodown: boolean;
    recurringBilling: boolean;
    customReports: boolean;
    approvalChains: boolean;
    sso: boolean;
    whiteLabel: boolean;
  };
  support: {
    tier: "email" | "chat" | "priority" | "phone" | "dedicated";
    responseSLAHours: number | "custom";
  };
  addOns: string[];
}
```

Resolution order:

1. Read `planId` from subscription record.
2. Merge `addOns` overrides (extra users, counters, packs).
3. Apply active promotional credits if a valid promo record exists.
4. Return final `TenantEntitlements`.
5. Cache per tenant per session; invalidate on `SubscriptionChanged` event.

---

### 21.8 Pricing governance rules

- plan controls access depth, automation quotas, and limits only.
- core invoice aggregation, stock movement, and ledger posting run on the same engine for all plans.
- industry pack flags are checked at API boundary on every write route; not cached on client.
- all plan upgrades and downgrades must emit a `SubscriptionChanged` domain event.
- downgrade enforcement: resources above new limit go read-only until resolved; users see a grace-period warning before effective date.
- all promotional overrides must be time-boxed and stored in auditable promo records with a clear expiry.

---

## 22. Legacy Switch and User Acquisition Strategy

Objective: attract users migrating from legacy billing and accounting tools by removing switching risk, reducing setup effort, and proving better day-1 outcomes.

### 22.1 Switch-from-old-software playbook

1. Zero-friction import: one-click import for parties, items, opening stock, ledgers, and pending receivables from CSV/Excel and common legacy exports.
2. Parallel-run confidence: support 14–30 day dual-run mode with variance checks between old system and Execora outputs.
3. Assisted onboarding: guided setup wizard by business type (retail, restaurant, pharmacy, distributor, service).
4. Migration assurance: backup-first import flow, rollback option, and migration success checklist.
5. Time-to-value proof: show first invoice, first payment reminder, and first stock alert within first session.

### 22.2 Pricing and offer strategy for conversions

- Solo plan trial with migration credits (messaging and automation jobs) for first 30 days.
- Business plan discount for switchers with annual prepay and verified data import.
- Industry pack trial unlock for 14 days so users can test domain-specific behavior before upgrading.
- CA and reseller referral incentives tied to successful migrations, not just signups.

### 22.3 Product hooks that improve conversion

- Smart importer that maps old field names to Execora manifest contracts.
- Onboarding dashboard with migration progress, pending tasks, and parity checks.
- Template and print cloning so invoice look-and-feel matches what users are familiar with.
- Automatic policy validation so users see compliance safety early.
- In-product guided tours for first bill, first return, first GST report, and first reconciliation.

### 22.4 Trust and risk-reduction signals

- Visible data ownership and export guarantee.
- Transparent audit trail for all imported and edited records.
- Support SLA by plan with fast migration help during first week.
- Plain-language fallback steps when import rows fail validation.

### 22.5 Distribution and acquisition channels

- CA channel program with migration toolkit.
- Retailer and distributor referral loops with account credits.
- Product landing pages for each software (Billing, Invoicing, POS, Accounting, Inventory).
- Webinar and demo tracks: "switch in 1 day", "GST safe migration", and "multi-branch setup".

### 22.6 Success KPIs for switch motion

- Import completion rate by source system.
- Time from signup to first successful invoice.
- First-week activation: invoices + reminders + stock updates + reports viewed.
- Trial-to-paid conversion for switchers.
- 30-day retention of migrated accounts.
- Support tickets per migration and first-response resolution time.

### 22.7 Operating rules

- Migration tooling must use same domain contracts as normal app flows.
- No migration bypass around accounting, stock, or compliance posting rules.
- All switch offers must be controlled through the entitlement service and auditable promo records.

---

## 23. Source Basis

This PRD is based on:

- existing Execora product and sprint docs in docs/product
- current repo architecture audit and coupling analysis
- competitor research from public pages covering homepage, accounting, inventory, invoicing, POS, e-invoicing, OCR, and retail billing
- architecture decisions recorded during Core -> Domains -> Platform -> Products -> Apps planning

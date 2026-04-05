# Domain Modules

## Purpose

This document defines how the platform should be split into maintainable domain modules with clear ownership across backend, web, mobile, and future desktop applications.

## Feature-Based Split Strategy

Large domain modules should be split into small feature modules with independent ownership, tests, and contracts.

Each feature module must contain:

- one feature purpose
- one write path owner
- one contract surface
- one event contract set
- one test suite

Target shape:

```text
packages/modules/src/<domain>/<feature>/
  README.md
  contracts/
  commands/
  queries/
  events/
  policies/
  __tests__/
```

Rules:

- no feature should own more than one business capability cluster
- all cross-feature calls should use contracts or events
- no direct DB writes from outside owning feature module
- app layers call feature contracts, not internal helpers

## AI Isolation Rule

AI-related capabilities must stay in separate optional modules and must never own authoritative business state.

Use separate AI modules for capabilities such as:

- voice assistant
- document extraction
- AI autofill
- AI insights
- AI copilot and recommendations

Recommended shape:

```text
packages/modules/src/ai/
  voice-assistant/
  document-extraction/
  autofill/
  insights/
  copilot/
```

AI module rules:

- AI modules are assistants and adapters, not business owners
- AI modules can suggest, summarize, classify, or extract, but domain modules must validate and persist
- every AI module must be guarded by feature toggles and entitlements
- disabling AI must not break core billing, inventory, finance, CRM, or compliance flows
- AI modules should depend on domain contracts, not domain internals

Naming note:

- architecture entity names can stay entity-oriented (invoice, quotation)
- implementation feature modules should use action-oriented names when helpful (create-invoice, update-invoice-status)
- both forms are valid as long as ownership boundaries are explicit

## Fixed Top-Level Domains

No new top-level domain should be introduced without architecture review.

- sales
- inventory
- finance
- purchases
- crm
- compliance
- reporting
- platform
- admin
- integrations
- system

## Domain Module Breakdown

### Sales

Owns revenue-side transaction logic.

Feature modules:

- invoicing/create-invoice
- invoicing/update-invoice-status
- invoicing/quotation
- invoicing/proforma
- invoicing/delivery-challan
- invoicing/recurring
- invoicing/returns
- invoicing/numbering
- invoicing/template-render
- pos/cart-session
- pos/checkout
- pos/multi-counter
- pos/receipt
- pos/offline-replay
- billing/pricing
- billing/party-pricing
- billing/channel-pricing
- billing/promotions
- billing/tax-calculation
- billing/totals

### Inventory

Owns item state, stock levels, reservations, and movement.

Feature modules:

- stock/item-catalog
- stock/stock-level
- stock/reservations
- stock/adjustments
- warehouse/location-policy
- warehouse/transfer-request
- movement/inward
- movement/outward
- movement/transfer-ledger
- batch/batch-tracking
- batch/expiry-tracking
- batch/serial-tracking
- barcode/generator
- barcode/scanner
- barcode/label-print
- alerts/low-stock
- alerts/overstock
- alerts/expiry-alerts
- alerts/reorder-suggestions

### Finance

Owns accounting state and payment orchestration.

Feature modules:

- accounting/ledger-posting
- accounting/journal-posting
- accounting/chart-of-accounts
- accounting/trial-balance
- accounting/profit-loss
- accounting/balance-sheet
- accounting/cashbook
- accounting/daybook
- payments/payment-in
- payments/payment-out
- payments/settlement
- payments/payment-allocation
- reconciliation/bank-reconciliation
- expenses/expense-entry
- expenses/expense-approval
- tax-ledger/gst-ledger

### GST Ownership Model

- finance owns internal GST posting and ledger state through `tax-ledger/gst-ledger`
- compliance owns statutory return workflows through `gst/gstr1`, `gst/gstr3b`, and `gst/return-export`
- reporting owns GST read models through `gst-reports/gst-read-model`
- finance and compliance exchange state through explicit events and contracts

### Purchases

Owns vendor-side procurement flows and OCR ingestion.

Feature modules:

- purchase/purchase-order
- purchase/purchase-bill
- purchase/purchase-return
- vendors/vendor-profile
- vendors/vendor-ledger
- ocr/document-upload
- ocr/extraction
- ocr/review-correction
- ocr/transaction-linking

### CRM

Owns parties and communication history.

Feature modules:

- parties/customer-profile
- parties/supplier-profile
- parties/party-ledger
- parties/credit-limit
- communication/history
- communication/preferences
- reminders/payment-reminders

### Compliance

Owns statutory workflows and audit-ready records.

Feature modules:

- einvoicing/eligibility
- einvoicing/schema-builder
- einvoicing/irp-submission
- einvoicing/irn-lifecycle
- einvoicing/cancellation
- einvoicing/audit-records
- ewaybill/eligibility
- ewaybill/payload-builder
- ewaybill/generation
- ewaybill/status-sync
- gst/gstr1
- gst/gstr3b
- gst/return-export
- gst/schema-updates

### Reporting

Owns read models only, not business logic.

Feature modules:

- sales-reports/summary
- sales-reports/item-performance
- inventory-reports/stock-position
- inventory-reports/fast-slow-movement
- inventory-reports/valuation
- finance-reports/pl-report
- finance-reports/balance-sheet-report
- gst-reports/gst-read-model
- party-reports/receivables
- dashboard/overview-cards

### Platform

Owns SaaS controls and tenant runtime policies.

Feature modules:

- pricing/plan-catalog
- pricing/add-on-catalog
- subscription/lifecycle
- subscription/downgrade-enforcement
- feature-toggle/product-entitlements
- feature-toggle/industry-packs
- feature-toggle/ai-features
- usage/metering
- usage/quota-enforcement
- sync/device-identity
- sync/conflict-policy
- sync/offline-replay
- product-config/navigation-config

### Admin

Owns operational governance and tenant administration.

Feature modules:

- users/user-lifecycle
- roles/role-policy
- permissions/permission-matrix
- tenants/tenant-profile
- support-ops/impersonation-audit

### Integrations

Owns adapter boundaries to third-party systems.

Feature modules:

- payment/gateway-adapter
- whatsapp/message-adapter
- sms/message-adapter
- hardware/printer-adapter
- hardware/barcode-adapter
- hardware/weighing-scale-adapter
- ecommerce/catalog-sync
- ecommerce/order-sync
- taxone/return-integration

### System

Owns operational runtime services.

Feature modules:

- audit/audit-log
- backup/backup-scheduler
- backup/restore-runner
- logs/log-routing
- notifications/notification-router
- storage/blob-store
- search/search-index
- cache/cache-policy
- offline-sync/recovery-engine

## Ownership Rules

- each domain owns its own write path
- cross-domain reactions should move through events
- domains publish contracts, not implicit internals
- reports consume read models, not domain write services
- products never duplicate domain logic
- AI modules may assist domains, but domains still own validation and persistence

## App Composition Rules

All app surfaces should map to the same domain names.

- API uses domain-owned services and contracts
- web uses product manifests and domain-facing APIs
- mobile uses the same manifests and entitlement checks
- desktop should use the same product and domain contracts, not its own logic fork
- AI entry points in every app surface must check AI-specific entitlements before rendering or executing

## Module Layout Recommendation

Use one domain-oriented shape in code and documentation:

```text
packages/modules/
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

Within each domain, split by feature module:

```text
<domain>/
  <feature>/
    README.md
    contracts/
    commands/
    queries/
    events/
    policies/
    __tests__/
```

## Feature Module Size Limits

Use these limits to force healthy splits:

- max 1 primary aggregate per feature module
- max 5 to 7 public command handlers per feature module
- max 3 external domain dependencies
- if one feature module exceeds these limits, split into 2 feature modules

## Migration Pattern for Existing Big Modules

1. identify existing large service files
2. define feature contracts first
3. split read logic into `queries`
4. split write logic into `commands`
5. move cross-domain side effects to `events`
6. keep compatibility adapters until all routes migrate
7. remove old large module only after parity tests pass

## Current Hardening Priorities

- unify payment orchestration under finance
- centralize stock mutations under inventory
- complete purchases service maturity
- move reporting to explicit read-model contracts
- separate commercial invoice flow from statutory e-invoice flow
- align web, mobile, and desktop navigation to domain vocabulary
- split existing large domain services into feature modules incrementally, not by big-bang rewrite

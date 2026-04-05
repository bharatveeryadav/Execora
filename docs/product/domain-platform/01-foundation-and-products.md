# Foundation and Products

## Purpose

This document is the business-facing summary of the platform direction, target product line, and capability shape.

## Vision

Execora is a domain-driven SMB operating platform, not a single billing app with uncontrolled feature sprawl.

Primary goals:

- full SMB feature breadth comparable to leading market products
- clean module boundaries and lower coupling
- easier upgrades and maintainability
- faster team scaling by domain ownership
- production-grade reliability for web, mobile, and future desktop shells

## Core Architecture

`Core -> Domains -> Platform -> Products -> Apps`

- Core: database, transactions, tenancy, events, observability
- Domains: business logic ownership
- Platform: plans, subscriptions, feature gates, usage, sync, product configuration
- Products: standalone software packs built from shared domains
- App surfaces: web, mobile, and future desktop shells using the same product model through a shared API backend

## Product Objectives

- billing speed
- GST compliance
- inventory correctness
- receivables and payment collection
- offline continuity for critical retail flows
- SaaS packaging and upsell readiness

## Engineering Objectives

- strict domain boundaries
- product composition by config only
- one authoritative payment path
- one authoritative stock mutation path
- event-ready integration model
- testable and observable services

## Market and Competitor Signals

The platform must cover the real market demand surface:

- GST billing and compliance
- accounting for non-accountants
- inventory and stock management
- POS checkout and multi-payment workflows
- templates, print, share, and reminder flows
- multi-user and multi-device operations
- offline continuity
- hardware support such as scanners, printers, cash drawers, and scales
- e-invoicing and e-way bill workflows
- OCR-assisted purchase and expense ingestion
- party pricing, channel pricing, and real-time sync

## Product Line Strategy

Products are not business-logic modules. Products are manifest-driven compositions of shared domains.

### Billing Software

Positioning: fast sale billing for walk-in and party billing.

Core capabilities:

- quick sale billing
- walk-in and party billing
- discounts, taxes, totals
- party-wise pricing
- retail versus wholesale rate handling
- payment capture and reminders
- share, print, and template support

### Invoicing Software

Positioning: full GST invoicing with lifecycle, compliance, and receivables.

Core capabilities:

- invoice lifecycle and numbering
- quotations, proforma, delivery challans
- GST-compliant outputs
- receivables tracking
- print and template engine
- e-invoice support when eligible

### POS Software

Positioning: fast counter checkout for retail and restaurant operations.

Core capabilities:

- cart and session checkout
- multi-counter operations
- single-screen multi-payment flow
- thermal and receipt workflows
- offline-safe counter operations
- hardware integrations

### Accounting Software

Positioning: automated bookkeeping built from real business transactions.

Core capabilities:

- bookkeeping automation
- ledger, journal, chart of accounts, trial balance
- P&L, balance sheet, cashbook, daybook
- GST reporting and reconciliation
- expense tracking and vendor payments

### Inventory Software

Positioning: stock control across locations with alerts, movement, and valuation.

Core capabilities:

- multi-location stock control
- stock movement ledger and transfers
- batch, expiry, and serial tracking
- barcode generation and scanning
- low-stock, overstock, and reorder signals
- valuation and ageing reports
- fast-moving and slow-moving item analysis

## Capability Matrix by Product Family

### Billing and Invoicing

- professional templates and branding
- quotations and proforma support
- GST invoice outputs
- QR collection and multi-payment methods
- payment reminders and status tracking
- party-wise and channel pricing
- separate commercial invoice and statutory e-invoice workflows

### POS

- fast checkout and queue handling
- counter sessions and multi-counter model
- barcode-first operations
- weighing-scale assisted retail operations
- offline-first counter workflow
- synchronized sales and stock updates

### Inventory

- multi-location stock
- movement ledger and transfers
- batch and serial tracking
- barcode and label support
- valuation and ageing reports
- reserved versus available stock handling
- fast-moving and slow-moving item analysis

### Accounting and Compliance

- automated bookkeeping from transactions
- GST-linked reporting
- IRP and IRN handling
- e-way bill linkage
- audit trail and cancellation window handling

### Procurement and OCR

- purchase and expense document upload
- extraction of supplier, item, GST, HSN, and totals
- review and correction before posting
- link documents to resulting transactions

## Product Composition Rule

- products enable capabilities
- domains own business logic
- advanced features such as e-invoicing and OCR are entitlement-driven add-ons
- UI shells (web, mobile, desktop) must consume the same product semantics
- API backend must enforce product manifests and entitlements consistently across all surfaces

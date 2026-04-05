# Engineering Guardrails and Events

## Purpose

This document captures the rules that keep the platform maintainable as product count and app surfaces grow.

## Required Architecture Rules

- domains are independent ownership units
- cross-domain reactions should move to events
- products are config-only
- naming must stay shared across backend, web, mobile, and desktop
- payment posting must have one path
- stock mutation must have one path
- auth, role, tenant, feature, and quota checks happen at API boundary
- AI modules must be optional, isolated, and feature-gated independently from core business modules
- AI modules must never become the system of record for domain state

## Anti-Patterns

- cross-domain direct service spaghetti
- product-specific backend branching for business logic
- hardcoded plan checks in UI only
- duplicate payment posting logic
- direct stock writes from multiple services
- AI-generated writes bypassing domain validation
- AI logic embedded inside core domain modules without explicit toggle boundaries

## CI Enforcement

- import boundary lint rules
- forbidden dependency checks
- contract tests for key DTOs and events
- manifest schema validation in CI
- AI toggle contract tests and fail-closed behavior tests in CI

## API Direction

- REST remains the primary app interface
- validation must happen at route boundaries
- prehandlers must check auth, role, product, feature, and quota
- AI-backed routes must also check AI-specific entitlements and fail closed when disabled

## Event Direction

Core event set:

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

Cross-domain consumers must be explicit and contract-tested.

## Data and State Principles

- accounting state derives from authoritative transaction postings
- inventory state should model on-hand, reserved, available, and incoming
- invoice and payment status should be finite state machines
- commercial invoice status and statutory e-invoice status must stay separate
- OCR ingestion is a staged pipeline
- sync state and offline reconciliation rules must be explicit
- reports are optimized read models, not business-logic owners
- AI suggestions, summaries, and extractions are proposals until accepted by a validating domain module

## Non-Functional Requirements

- tenant isolation in every query and event
- idempotent command handling
- offline-first support for billing and POS critical flows
- outbox-backed reliable event publication
- auditable mutation history for finance and inventory
- SLO-backed observability
- secure backup and restore posture
- least-privilege role access
- safe schema migrations and rollback plans

## Security and Compliance Requirements

- OTP and strong auth for sensitive operations
- encryption at rest and in transit
- admin action audit trails
- GST record traceability
- retained IRN, signed QR, and cancellation references for e-invoice history
- environment hardening and secret hygiene
- rate limits and abuse protection

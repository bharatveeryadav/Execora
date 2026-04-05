# Delivery, Migration, and Metrics

## Purpose

This document turns the architecture into an execution plan that teams can work through independently.

## Squad Topology

Recommended squad structure:

1. Sales domain squad
2. Inventory and purchases squad
3. Finance and compliance squad
4. Platform, admin, and system squad
5. App composition squad for web, mobile, and desktop

Ownership model:

- domains own logic and contracts
- product squads own composition and UX
- platform owns entitlements, plans, and governance

## Delivery Phases

### Phase 1: Foundation

- freeze domain names and ownership
- implement lint and CI boundary rules
- define manifest schema and config registry

### Phase 2: Core Domain Hardening

- unify payment path
- centralize stock mutation and reservation logic
- complete purchases service layer
- formalize OCR review-to-transaction pipeline
- split commercial invoice flow from statutory e-invoice flow

### Phase 3: Product Composition Rollout

- Billing Software manifest rollout
- Invoicing Software manifest rollout
- POS Software manifest rollout
- Accounting Software manifest rollout
- Inventory Software manifest rollout

### Phase 4: Platform Completion

- subscription lifecycle APIs
- usage metering and quota enforcement
- admin controls and audit exports

### Phase 5: Integration and Quality

- hardware and communication adapters
- reliability testing and failure drills
- parity and regression automation across app surfaces

## Current Repo Alignment

Strong alignment already present:

- solid infrastructure layer
- tenant and feature flag foundations
- core business modules around invoice, product, customer, ledger
- mobile feature modularity

Critical gaps to close:

- reduce direct cross-domain coupling
- finish unified payment and stock ownership
- mature purchases and OCR workflows
- formalize multi-device sync and quota enforcement
- align app feature structure to domain vocabulary

## Migration Hotspots

- sales invoice orchestration
- finance ledger and payment ownership
- inventory stock movement ownership
- compliance extraction from route-level logic
- app navigation and entitlement synchronization

## Success Metrics

Architecture metrics:

- reduction in forbidden cross-domain imports
- single ownership for payment and stock workflows
- release lead time by domain squad
- lower regression rate in cross-domain changes

Product metrics:

- median bill creation time
- reminder conversion rate
- stock mismatch rate
- GST readiness time
- subscription conversion and retention

Reliability metrics:

- offline sync success rate
- queue retry and failure rates
- API P95 latency on billing and POS flows
- backup restore validation success

## Risks and Mitigations

- folder reorg churn: enforce boundaries first, move code later
- premature event complexity: start with critical outbox flows only
- product manifests drifting from runtime behavior: validate schema and add contract tests
- app naming divergence: enforce shared taxonomy through review and CI

## Immediate Next Actions

1. publish manifest schema and initial configs
2. add CI boundary checks and forbidden import rules
3. establish one authoritative payment service contract
4. establish one authoritative stock movement contract
5. finalize e-invoice and OCR contracts
6. define explicit multi-device sync contract
7. align web, mobile, and desktop feature taxonomy to domain names
8. implement platform quota enforcement for protected flows
9. execute backend-first reusable runtime from `08-backend-first-modular-runtime.md`

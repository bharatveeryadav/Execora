# Backend-First Modular Runtime

## Purpose

This document defines a backend-first structure where backend modules are reusable across web, desktop, mobile, and any future application.

## Core Decision

Backend is the business engine. Applications are consumers.

- backend owns business rules, state transitions, validation, permissions, and entitlements
- applications own UX, navigation, and local interaction state
- one backend runtime serves all application surfaces

## Architecture Shape

```text
packages/api/
  routes/
  middleware/

packages/modules/src/
  <domain>/<feature>/

packages/infrastructure/src/
  config, db, redis, queue, auth, metrics, storage

packages/types/src/
  shared contracts, domain names, entitlements, manifests

packages/shared/src/
  pure helper logic safe for all app surfaces
```

## Feature Module Contract

Each backend feature module must expose a stable contract.

Required contract surfaces:

- `commands` for write operations
- `queries` for read operations
- `dto` schemas for input and output
- `permissions` and feature requirements
- emitted domain events

Recommended module shape:

```text
packages/modules/src/<domain>/<feature>/
  contracts/
    commands.ts
    queries.ts
    dto.ts
    permissions.ts
  commands/
  queries/
  events/
  policies/
  index.ts
```

## App Integration Pattern

Applications integrate with backend through adapters, not backend internals.

- API adapter: HTTP route to module command or query
- Worker adapter: queue job to module command
- Web adapter: API client to module contracts
- Mobile adapter: API client and flow mapping to module contracts
- Desktop adapter: same contracts with desktop-specific UX

## Module Reuse Across Applications

Every app can choose a subset of modules without creating backend forks.

Example module matrix:

- web app: `sales/invoicing`, `crm/parties`, `finance/payments`, `reporting/dashboard`
- desktop app: `sales/pos`, `inventory/stock`, `inventory/barcode`, `finance/payments`
- mobile app: `sales/invoicing`, `inventory/stock`, `crm/parties`, `finance/expenses`

Rules:

- module implementation is single-owned and shared
- app-specific behavior should be in adapters or app shell, not in module internals
- backend module names must use domain-feature vocabulary, not screen vocabulary

## Entitlement-Driven Access

Access to modules must be controlled by backend-resolved entitlements.

- resolve entitlements per tenant session
- enforce at API boundary before module execution
- app shells render and hide features based on the same entitlement object
- avoid parallel local tier logic when backend entitlements are available

## Stability Rules for Multi-App Connectivity

- keep route naming domain-consistent
- version contracts and keep backward compatibility where possible
- keep write operations idempotent for unstable clients
- keep event names stable and contract-tested
- avoid app-specific business logic branches in backend modules

## Anti-Patterns

- separate backend fork for desktop or mobile
- backend folders based on screen names
- feature checks only in UI and not in backend
- duplicated business calculations across apps

## Migration Plan

### Phase 1: Contract Freeze

- freeze domain and feature names in shared types
- mark module owner for each feature
- publish module contract checklist

### Phase 2: Adapter Normalization

- map API routes to explicit module contracts
- remove route-to-internal coupling where possible
- add missing entitlement guards

### Phase 3: Incremental Module Extraction

- split legacy services into domain-feature modules
- keep temporary compatibility facades
- remove facades after contract parity tests pass

### Phase 4: App Module Matrix Governance

- publish app-to-module usage matrix per application
- require feature ownership declaration in PRs
- enforce naming and import boundary checks in CI

## Definition of Done

This model is complete when:

- backend is the only owner of business logic
- all applications consume backend contracts only
- module reuse across applications is explicit and documented
- entitlements are enforced consistently across all surfaces
- no app-specific backend business logic fork remains

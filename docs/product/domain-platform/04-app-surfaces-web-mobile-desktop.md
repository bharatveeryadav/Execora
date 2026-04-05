# App Surfaces: Web, Mobile, and Desktop

## Purpose

This document explains how the same domain and product model should be applied cleanly across every app surface.

## Shared Rule

App surfaces do not invent product logic. They consume the same contracts from the platform layer.

- API backend enforces access and orchestration
- web composes views from product manifests and entitlements
- mobile does the same with mobile-first UX
- desktop should reuse the same routes, manifests, and entitlement semantics

## Backend Platform Responsibility

### API Backend

- authenticate tenant and user
- resolve entitlements
- apply product and feature guards
- call domain services through stable contracts
- publish events for cross-domain reactions

## Consumer Surface Responsibilities

### Web

- fetch entitlements on session bootstrap
- build navigation from product manifests
- render only enabled product sections
- keep business rules in shared or backend layers, not in page components

### Mobile

- use the same entitlement bootstrap contract
- map manifest-driven navigation to mobile modules and tabs
- keep offline-safe workflows focused on critical billing and POS flows
- avoid custom product logic that diverges from backend rules

### Desktop

- treat desktop as another shell, not as a new product
- reuse shared API contracts and manifests
- support hardware-heavy workflows through the same POS and inventory models
- avoid desktop-only domain forks

## Product Shell Strategy

Support both:

- one app shell with dynamic mode switching by entitlement
- separate branded app shells on the same backend

Both options should use the same resolved capability object and same domain APIs.

## Navigation Model

Use product manifests to define navigation identifiers:

- web navigation keys
- mobile navigation keys
- desktop navigation keys when the desktop shell is added

The shell decides how to render these keys. It should not decide which capabilities exist.

## Recommended App Structure

```text
apps/
  api/
  web/
  mobile/
  desktop/
```

Within web, mobile, and desktop:

```text
src/
  products/
    billing/
    invoicing/
    pos/
    accounting/
    inventory/
  platform/
    navigation/
    entitlements/
    session/
```

## Clean Separation Rules

- route guards and capability checks belong to platform and API layers
- views belong to app shells
- product navigation belongs to manifests
- shared calculations belong to domain or shared packages
- app-specific UI state should never become the source of business truth

## Multi-Product Example

### Vyapar-like experience

- billing
- invoicing
- accounting
- inventory
- optional POS

### Petpooja-like experience

- POS
- restaurant pack workflows
- counter and receipt operations
- table and kitchen workflow overlays
- inventory and payments via shared domains

These are different shells over the same platform, not separate backends.

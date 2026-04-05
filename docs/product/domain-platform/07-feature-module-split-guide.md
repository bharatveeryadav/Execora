# Feature Module Split Guide

## Purpose

This guide turns large modules into small feature-based modules that are easy to own, test, and release independently.

## When to Split a Module

Split a module when any of the following is true:

- one service file crosses multiple capabilities
- frequent merge conflicts across squads
- difficult test setup because too many dependencies
- business rule changes in one area cause regressions elsewhere

## Feature Module Template

```text
packages/modules/src/<domain>/<feature>/
  README.md
  contracts/
    commands.ts
    queries.ts
    events.ts
    errors.ts
  commands/
  queries/
  policies/
  mappers/
  __tests__/
```

## Ownership and Dependency Rules

- one feature module has one primary owner squad
- feature modules can depend on shared contracts, not internals
- cross-domain effects use domain events
- route handlers use contracts only
- app layers never call internal helpers directly

## Suggested Split Sequence

1. extract contracts from existing large service
2. split command and query handlers
3. add event handlers for side effects
4. keep old facade for compatibility
5. migrate routes and app calls to new contracts
6. remove old facade after parity and regression checks

## Parity Checklist Before Removing Old Module

- all previous endpoints still pass contract tests
- all events are emitted with same semantics
- reports return equivalent values for same fixtures
- idempotency and retry behavior remains intact
- web, mobile, and desktop shells show equivalent capability access

## Product Surface Mapping

Every new feature module must declare where it appears:

- backend API endpoint group
- web screen or flow
- mobile screen or flow
- desktop screen or flow

This keeps one module connected to all app surfaces without duplicating business logic.

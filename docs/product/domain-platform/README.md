# Domain Platform PRD Split

This folder splits the master PRD into smaller docs that are easier to maintain across product, domain, platform, API, web, mobile, and future desktop teams.

## How to Use This Set

- Product and business planning: start with [01-foundation-and-products.md](./01-foundation-and-products.md)
- Backend and module ownership: start with [02-domain-modules.md](./02-domain-modules.md)
- SaaS controls, pricing, plans, and access: start with [03-platform-packaging-and-entitlements.md](./03-platform-packaging-and-entitlements.md)
- Web, mobile, and desktop shell composition: start with [04-app-surfaces-web-mobile-desktop.md](./04-app-surfaces-web-mobile-desktop.md)
- Engineering rules, APIs, events, and NFRs: start with [05-engineering-guardrails-and-events.md](./05-engineering-guardrails-and-events.md)
- Delivery, migration, squad ownership, risks, and KPIs: start with [06-delivery-migration-and-metrics.md](./06-delivery-migration-and-metrics.md)
- Feature-level module decomposition and migration: start with [07-feature-module-split-guide.md](./07-feature-module-split-guide.md)
- Backend-first reusable runtime and app integration contract: start with [08-backend-first-modular-runtime.md](./08-backend-first-modular-runtime.md)
- Complete backend implementation phases and release gates: start with [09-complete-backend-implementation-phases.md](./09-complete-backend-implementation-phases.md)

## Recommended Ownership

- Product team owns `01`
- Domain architecture and backend squads own `02`
- Platform and growth teams own `03`
- Web, mobile, and desktop shell teams own `04`
- Architecture and platform squads own `05`
- Product operations and architecture own `06`
- Domain leads and tech leads co-own `07`
- Platform architecture and backend leads co-own `08`
- Backend program lead and architecture council co-own `09`

## Source of Truth Rules

- The master source remains [docs/product/DOMAIN_PLATFORM_PRD.md](../DOMAIN_PLATFORM_PRD.md)
- This split set is the working set for independent teams
- New feature decisions should update the relevant split file and then be reconciled back into the master PRD

## Working Model

Use the same structure in code and docs:

`Core -> Domains -> Platform -> Products -> Apps`

- Core: infrastructure and system runtime
- Domains: business ownership units
- Platform: plans, limits, feature gates, subscriptions, sync, governance
- Products: Billing, Invoicing, POS, Accounting, Inventory
- App surfaces: web, mobile, and future desktop (all consume the shared API backend)

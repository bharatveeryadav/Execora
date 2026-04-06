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

## Implementation Module Docs — `@execora/modules` (6 modules)

> These are the **working implementation docs** aligned to the actual codebase package `@execora/modules`. Each doc covers: mission, feature modules with contract structure, capabilities, events, API contracts, current vs target package layout, and implementation status.
>
> Use these when building features, reviewing PRs, or planning the module restructure.

| Module      | Doc                                                | Codebase path                      | Status                       | Squad                 |
| ----------- | -------------------------------------------------- | ---------------------------------- | ---------------------------- | --------------------- |
| Accounting  | [domains/accounting.md](./domains/accounting.md)   | `packages/modules/src/accounting/` | Ledger + payments active     | Finance + Compliance  |
| Inventory   | [domains/inventory.md](./domains/inventory.md)     | `packages/modules/src/inventory/`  | Catalog + basic stock active | Inventory + Purchases |
| POS         | [domains/pos.md](./domains/pos.md)                 | `packages/modules/src/pos/`        | Voice + drafts active        | Sales Domain          |
| Invoicing   | [domains/invoicing.md](./domains/invoicing.md)     | `packages/modules/src/invoicing/`  | Invoice + customers active   | Sales Domain          |
| E-Invoicing | [domains/e-invoicing.md](./domains/e-invoicing.md) | `packages/modules/src/e-invoice/`  | GST + GSTR-1 active          | Finance + Compliance  |
| OCR         | [domains/ocr.md](./domains/ocr.md)                 | `packages/modules/src/ocr/`        | Job lifecycle + AI active    | Inventory + Purchases |

### Feature Module Contract Structure

Every feature module inside a domain follows this shape:

```
packages/modules/src/<module>/<feature>/
  contracts/
    commands.ts      ← write operation inputs + return types
    queries.ts       ← read operation inputs + return types
    events.ts        ← domain events emitted
    errors.ts        ← typed error codes
  commands/          ← command handler implementations
  queries/           ← query handler implementations
  policies/          ← business rule guards
  __tests__/         ← unit tests per command/query
  index.ts           ← feature barrel export
```

### Module Dependency Map

```
@execora/types  ←  @execora/shared  ←  @execora/infrastructure  ←  @execora/modules
```

Cross-module event flow (all one-directional):

```
invoicing  →  [InvoiceCreated]  →  accounting (ledger posting)
invoicing  →  [InvoiceCreated]  →  inventory (stock deduction)
invoicing  →  [InvoiceCreated]  →  e-invoicing (eligibility check)
pos        →  [PosSessionClosed] → accounting (settlement)
ocr        →  [PurchaseBillPosted] → accounting (payable)
ocr        →  [GoodsReceived]   →  inventory (inward stock)
accounting →  [PaymentRecorded] →  invoicing (payment state update)
e-invoicing → [EInvoiceIssued]  →  invoicing (attach IRN + QR)
inventory  →  [LowStockAlert]   →  notifications
```

---

## Domain Files (Odoo-style reference — business domain PRDs)

> Modelled after Odoo's `addons/<domain>/` pattern. These are the **source PRD documents** for business domain intent, product strategy, and squad ownership. Use these for product planning and architecture decisions.

| Domain       | File                                                 | Odoo equivalent                                      | Squad                     |
| ------------ | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------- |
| Sales        | [domains/sales.md](./domains/sales.md)               | `addons/sale` + `addons/point_of_sale`               | Sales Domain              |
| Finance      | [domains/finance.md](./domains/finance.md)           | `addons/account` (payments + bookkeeping)            | Finance + Compliance      |
| Purchases    | [domains/purchases.md](./domains/purchases.md)       | `addons/purchase`                                    | Inventory + Purchases     |
| CRM          | [domains/crm.md](./domains/crm.md)                   | `addons/crm` + `addons/contacts`                     | Sales Domain              |
| Compliance   | [domains/compliance.md](./domains/compliance.md)     | `addons/l10n_in_edi` + `addons/l10n_in_edi_ewaybill` | Finance + Compliance      |
| Reporting    | [domains/reporting.md](./domains/reporting.md)       | `addons/account_reports`                             | Sales Domain (read)       |
| Platform     | [domains/platform.md](./domains/platform.md)         | `addons/saas_*` + `addons/iap`                       | Platform + Admin + System |
| Admin        | [domains/admin.md](./domains/admin.md)               | `addons/base` (res.users, res.groups)                | Platform + Admin + System |
| Integrations | [domains/integrations.md](./domains/integrations.md) | `addons/payment_*` + `addons/hw_*`                   | App Composition           |
| System       | [domains/system.md](./domains/system.md)             | `addons/base` (ir.logging) + `addons/document`       | Platform + Admin + System |

---

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

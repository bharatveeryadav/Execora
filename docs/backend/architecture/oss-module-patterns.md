# Open-Source Monorepo Module Patterns — Research Reference

> Research date: April 2026  
> Basis for Execora backend structure decisions

---

## Projects Researched

Cal.com · Trigger.dev · Twenty CRM · Hoppscotch · Documenso

---

## 1. Package Structures

### Cal.com — `@calcom/*`

pnpm monorepo, Next.js + NestJS API v2

```
packages/
├── features/             # Business domains
│   └── bookings/
│       ├── lib/service/  # RegularBookingService, BookingCancelService
│       ├── repositories/ # Interface + implementation
│       ├── di/tokens.ts  # DI symbol tokens (framework-agnostic)
│       └── dto/          # DTO types
├── platform/
│   └── libraries/index.ts  # Public aggregation barrel (100+ named exports)
├── lib/                  # Shared utilities (logger, crypto, errors)
├── prisma/               # Prisma client + selects
└── types/
```

**Key pattern:** NestJS app only imports from `@calcom/platform-libraries` — never directly into `@calcom/features` internals.

---

### Trigger.dev — `@trigger.dev/*` + `@internal/*`

pnpm monorepo

```
packages/
├── core/               # Massive isomorphic package
│   └── src/v3/
│       ├── logger-api.ts     # One file per singleton API instance
│       ├── usage-api.ts
│       └── schemas/          # Zod schemas
├── build/              # @trigger.dev/build
│   └── src/index.ts    # comment: "Barrel no more" — explicit named re-exports only

internal-packages/       # Never resolvable externally (bundled via noExternal)
├── database/            # @internal/database
├── tracing/
└── emails/
```

**Key pattern:** `noExternal: [/^@internal/]` in tsup config — private packages bundled at build time, can never be imported by consumers.

---

### Twenty CRM — `twenty-*` (no scope)

Nx + Yarn 4, NestJS backend

```
packages/
├── twenty-server/
│   └── src/
│       ├── engine/
│       │   ├── core-modules/   # Platform (auth, billing, workspace)
│       │   │   └── billing/
│       │   │       ├── billing.module.ts
│       │   │       ├── billing.resolver.ts
│       │   │       ├── billing-gauge.service.ts
│       │   │       └── commands/  # nest-commander CLI commands (NOT CQRS)
│       │   └── metadata-modules/
│       └── modules/             # Business domains (messaging, calendar, workflow)
├── twenty-ui/          # Auto-generated barrels
└── twenty-shared/      # Auto-generated barrels
```

**Key pattern:** NestJS `@Module({ exports: [SomeService] })` — only listed services leak out. Auto-generated barrel scripts (TypeScript compiler API) — no `export *`, always explicit named exports.

---

### Hoppscotch — `hoppscotch-*` (no scope)

pnpm, NestJS backend

```
packages/
└── hoppscotch-backend/
    └── src/
        ├── user/            # flat: user.module.ts + user.service.ts + user.resolver.ts
        ├── team/
        ├── team-collection/
        ├── team-invitation/
        ├── auth/
        └── admin/
```

**Key pattern:** ESLint `no-restricted-globals` / `no-restricted-syntax` banning direct `localStorage` access — forces use of `PersistenceService`. Same principle applies to `prisma` / `redis`.

---

### Documenso — `@documenso/*`

Remix + Hono, most radical pattern

```
packages/
├── lib/
│   ├── server-only/          # One async function per file
│   │   ├── document/
│   │   │   ├── delete-document.ts
│   │   │   ├── send-document.ts
│   │   │   └── find-documents.ts
│   │   ├── customer/
│   │   │   ├── create-customer.ts
│   │   │   └── update-customer.ts
│   │   └── ...
│   ├── client-only/          # Client code
│   ├── universal/            # Isomorphic code
│   ├── types/                # Zod schemas + TS types
│   ├── errors/               # AppError class
│   └── jobs/
│       ├── client.ts         # Registry: new JobClient([...all defs])
│       └── definitions/
│           ├── billing/send-invoice.ts
│           └── notifications/sms-notify.ts
├── trpc/                     # API v2 — one file per operation
│   └── server/
│       └── document-router/
│           ├── create-document.ts
│           ├── delete-document.ts
│           └── router.ts
├── api/                      # REST v1 (ts-rest)
│   └── v1/
│       ├── contract.ts
│       └── implementation.ts
├── prisma/
├── ui/
├── eslint-config/            # Shared ESLint config package
├── prettier-config/
└── tsconfig/
```

**Key pattern:** All `index.ts` files are deliberately empty (`export {}`). Every import uses the full sub-path. One function per file — no service classes in `server-only/`.

---

## 2. CQRS vs. Plain Services

**None of the 5 projects use formal CQRS.**

| Approach                                    | Who                                     |
| ------------------------------------------- | --------------------------------------- |
| NestJS `@Injectable` service classes        | Twenty, Hoppscotch, Cal.com API v2      |
| Framework-agnostic class + DI token symbols | Cal.com features packages               |
| One exported `async function` per file      | **Documenso** (strictest, most admired) |
| Singleton class instances as constants      | Trigger.dev                             |

The `commands/` folder in Twenty = `nest-commander` CLI scripts, not CQRS.

**Industry consensus:** Plain single-responsibility service classes or functions, organized by domain. CQRS adds complexity not justified at product scale.

---

## 3. Boundary Enforcement Mechanisms

| Rank | Mechanism                                                | Project               | Level           |
| ---- | -------------------------------------------------------- | --------------------- | --------------- |
| 1    | NestJS `@Module({ exports: [] })`                        | Twenty, Hoppscotch    | Runtime DI      |
| 2    | tsup `noExternal: [/^@internal/]`                        | Trigger.dev           | Build-time      |
| 3    | Empty `index.ts` + sub-path imports                      | Documenso             | Convention      |
| 4    | Auto-generated explicit named barrels                    | Twenty                | Script-enforced |
| 5    | ESLint `no-restricted-imports` / `no-restricted-globals` | Hoppscotch, Documenso | Lint-time       |

---

## 4. Naming Conventions

```
@calcom/features    @calcom/lib       @calcom/platform
@trigger.dev/core   @internal/database
twenty-server       twenty-ui
hoppscotch-backend  hoppscotch-common
@documenso/lib      @documenso/trpc   @documenso/ee
```

- Scoped (`@scope/name`) when npm-published
- `@internal/` for private-only packages (never published)
- `ee/` for enterprise features
- `server-only/` subdirectory (not a separate package) for server-exclusive code

---

## 5. Execora Assessment

### What Execora Does Well

- `@execora/infrastructure` cleanly separates platform from domain ✅ matches Twenty + Documenso
- `@execora/modules` as a single import boundary ✅ matches Cal.com's `@calcom/platform-libraries`
- Scoped package naming ✅ matches Cal.com, Documenso, Trigger.dev
- Domain-first directory structure (`sales/`, `crm/`, `inventory/`) ✅ matches all 5

### Gaps vs. Industry

| Gap                                                                                    | Industry Solution                                                            | Priority |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| `contracts/dto.ts + commands.ts + queries.ts` — 4-level nesting, no industry precedent | Documenso: `server-only/{domain}/{operation}.ts` flat per function           | High     |
| No ESLint import boundary rules                                                        | Hoppscotch `no-restricted-imports` banning direct `@prisma/client` in routes | High     |
| No `server-only/` vs `universal/` split inside modules                                 | Documenso's subdirectory split                                               | Medium   |
| Manual barrel (`index.ts export *`) maintenance                                        | Twenty's `generateBarrels.ts` script                                         | Low      |
| No structured BullMQ job registry                                                      | Documenso `jobs/client.ts` + `jobs/definitions/` pattern                     | Medium   |

---

## 6. Target Structure for Execora (based on research)

Closest to **Cal.com features pattern** + **Documenso simplicity**:

```
packages/modules/src/
├── sales/
│   └── invoicing/
│       ├── create-invoice.ts     # export async function createInvoice(input) {}
│       ├── get-invoice.ts        # export async function getInvoice(id) {}
│       └── types.ts              # Input/output types for this subdomain
├── crm/
│   └── parties/
│       ├── create-customer.ts
│       ├── search-customers.ts
│       ├── update-customer.ts
│       └── types.ts
├── inventory/
│   └── stock/
│       ├── create-product.ts
│       ├── list-products.ts
│       ├── update-stock.ts
│       └── types.ts
├── finance/
│   └── payments/
│       ├── record-payment.ts
│       └── types.ts
└── jobs/                         # Documenso pattern
    ├── client.ts                 # BullMQ job registry
    └── definitions/
        ├── billing/send-invoice.ts
        └── notifications/sms.ts
```

Routes import individual functions, not service class instances:

```ts
// invoice.routes.ts
import { createInvoice } from "@execora/modules";
// NOT: import { createInvoiceCommand } from '@execora/modules';
```

### ESLint Rule to Add (Hoppscotch pattern)

```js
// root eslint.config.js
"no-restricted-imports": ["error", {
  patterns: [{
    group: ["@prisma/client"],
    message: "Import `prisma` from `@execora/infrastructure`, not directly from @prisma/client"
  }]
}]
```

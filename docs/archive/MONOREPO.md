# Execora — Monorepo Migration Plan

> Readiness assessment and step-by-step migration to Turborepo + pnpm workspaces.

---

## Current Status: Ready (8.5 / 10)

The codebase already has a clean layered architecture that maps naturally to monorepo packages.
**No blocking refactors needed.** The migration is additive — existing code moves, nothing rewrites.

### Why It's Ready

| Criterion | Status | Notes |
|---|:-:|---|
| Clean layer separation | ✓ | api → modules → infrastructure. No circular deps. |
| No cross-boundary imports | ✓ | `infrastructure` never imports from `modules` |
| Worker already isolated | ✓ | `src/worker/index.ts` only imports from `infrastructure` |
| Separate entry points | ✓ | `src/index.ts` (API) and `src/worker/index.ts` (worker) |
| Docker already multi-container | ✓ | `app` and `worker` are separate containers today |
| Shared types already centralized | ✓ | `src/types.ts` — ideal candidate for `@execora/types` package |
| Prisma schema self-contained | ✓ | `packages/db/` is a clean boundary for `@execora/db` |
| No path aliases yet | ⚠ | Relative imports throughout — add aliases before splitting |
| Single `package.json` | ⚠ | Needs to become workspace root + sub-packages |

---

## Target Structure

```
execora/                          ← workspace root
├── apps/
│   ├── api/                      ← Fastify server (src/index.ts)
│   │   ├── src/
│   │   │   ├── api/              ← routes + middlewares
│   │   │   ├── ws/               ← WebSocket handlers
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                   ← BullMQ standalone worker
│       ├── src/
│       │   └── index.ts          ← src/worker/index.ts today
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── types/                    ← @execora/types
│   │   ├── src/index.ts          ← src/types.ts today
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                       ← @execora/db
│   │   ├── prisma/               ← packages/db/schema.prisma today
│   │   ├── src/
│   │   │   ├── client.ts         ← database.ts (Prisma client + audit middleware)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── infrastructure/           ← @execora/infrastructure
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── logger.ts
│   │   │   ├── metrics.ts
│   │   │   ├── queue.ts
│   │   │   ├── redis-client.ts
│   │   │   ├── storage.ts
│   │   │   ├── email.ts
│   │   │   ├── whatsapp.ts
│   │   │   ├── tenant-context.ts
│   │   │   ├── runtime-config.ts
│   │   │   ├── workers.ts
│   │   │   └── bootstrap.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── modules/                  ← @execora/modules  (or split further)
│       ├── src/
│       │   ├── customer/
│       │   ├── invoice/
│       │   ├── ledger/
│       │   ├── product/
│       │   ├── reminder/
│       │   ├── voice/
│       │   └── gst/
│       ├── package.json
│       └── tsconfig.json
│
├── infra/                        ← Docker, monitoring (unchanged)
│   ├── docker-compose.yml
│   ├── docker-compose.monitoring.yml
│   └── monitoring/
│
├── package.json                  ← workspace root (scripts only, no deps)
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Migration: Phase 0 — Prerequisites ✅ DONE (2026-03-01)

### 0.1 — TypeScript Path Aliases (completed)

`tsconfig.json` now has `baseUrl: "."` and `paths: { "@/*": ["src/*"] }`.
`package.json` build script: `"build": "tsc && tsc-alias"`.
`tsc-alias` rewrites `@/` paths in `dist/`; `tsx` resolves them natively in dev.

```typescript
// New style — use for all new code:
import { logger }      from '@/infrastructure/logger';
import { requireAuth } from '@/api/middleware/require-auth';
import type { UserJwtPayload } from '@/types';
// Old relative imports still work — no need to rewrite existing files
```

### 0.2 — Install pnpm and Turborepo (when ready for full monorepo)

```bash
# Install pnpm globally
npm install -g pnpm

```bash
# Install pnpm globally
npm install -g pnpm

# Install turborepo
pnpm add -g turbo
```

### 0.2 — Add TypeScript Path Aliases

Before splitting packages, add path aliases so imports don't need relative `../../` jumps.
Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    ...
    "baseUrl": "./src",
    "paths": {
      "@execora/types":           ["./types.ts"],
      "@execora/infrastructure/*": ["./infrastructure/*"],
      "@execora/modules/*":       ["./modules/*"],
      "@execora/providers/*":     ["./providers/*"],
      "@execora/integrations/*":  ["./integrations/*"],
      "@execora/api/*":           ["./api/*"]
    }
  }
}
```

Then update the runtime resolver in `package.json`:
```json
{
  "devDependencies": {
    "tsconfig-paths": "^4.2.0"
  }
}
```

Add to `dev` script: `tsx -r tsconfig-paths/register src/index.ts`

**Verify compile still passes:**
```bash
npx tsc --noEmit
```

---

## Migration: Phase 1 — Workspace Root

```bash
# 1. Initialize workspace root
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# 2. Create root package.json (scripts only)
cat > package.json << 'EOF'
{
  "name": "execora-workspace",
  "private": true,
  "scripts": {
    "dev":    "turbo run dev",
    "build":  "turbo run build",
    "test":   "turbo run test",
    "worker": "turbo run dev --filter=@execora/worker"
  },
  "devDependencies": {
    "turbo":      "latest",
    "typescript": "^5.3.3"
  }
}
EOF

# 3. Create Turborepo config
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs":   ["dist/**"]
    },
    "dev": {
      "cache":     false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs":   []
    }
  }
}
EOF
```

---

## Migration: Phase 2 — Extract Packages

### 2.1 — `@execora/types`

```bash
mkdir -p packages/types/src
cp src/types.ts packages/types/src/index.ts

cat > packages/types/package.json << 'EOF'
{
  "name": "@execora/types",
  "version": "0.1.0",
  "private": true,
  "main":  "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": { "build": "tsc", "dev": "tsc --watch" }
}
EOF
```

### 2.2 — `@execora/db`

```bash
mkdir -p packages/db/src
cp -r prisma/ packages/db/
cp src/infrastructure/database.ts packages/db/src/client.ts

cat > packages/db/package.json << 'EOF'
{
  "name": "@execora/db",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@prisma/client": "^5.9.1",
    "@execora/types": "workspace:*"
  },
  "scripts": {
    "build":     "tsc",
    "db:push":   "prisma db push",
    "db:migrate":"prisma migrate dev",
    "generate":  "prisma generate"
  }
}
EOF
```

### 2.3 — `@execora/infrastructure`

```bash
mkdir -p packages/infrastructure/src
cp src/infrastructure/*.ts packages/infrastructure/src/

cat > packages/infrastructure/package.json << 'EOF'
{
  "name": "@execora/infrastructure",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@execora/db":    "workspace:*",
    "@execora/types": "workspace:*",
    "bullmq":         "^5.1.9",
    "ioredis":        "^5.3.2",
    "pino":           "^8.19.0",
    "prom-client":    "^15.1.0",
    "nodemailer":     "^6.9.7",
    "minio":          "^7.1.3"
  }
}
EOF
```

### 2.4 — `apps/api` and `apps/worker`

```bash
mkdir -p apps/api/src apps/worker/src

# API app — everything except src/worker/
cp -r src/api   apps/api/src/
cp -r src/ws    apps/api/src/
cp src/index.ts apps/api/src/

# Worker app
cp src/worker/index.ts apps/worker/src/

cat > apps/api/package.json << 'EOF'
{
  "name": "@execora/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@execora/types":          "workspace:*",
    "@execora/db":             "workspace:*",
    "@execora/infrastructure": "workspace:*",
    "fastify":                 "^4.26.1",
    "@fastify/websocket":      "^10.0.1",
    "@bull-board/fastify":     "^5.23.0"
  }
}
EOF
```

---

## Migration: Phase 3 — Wire Up Docker

Update `docker-compose.yml` to build from the new paths:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ...
  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    ...
```

---

## What Changes vs What Stays the Same

| What | Before | After |
|---|---|---|
| Source structure | `src/infrastructure/*` | `packages/infrastructure/src/*` |
| Imports | `../../infrastructure/logger` | `@execora/infrastructure/logger` |
| Prisma | `packages/db/` at repo root | `packages/db/prisma/` |
| DB commands | `npm run db:push` | `pnpm --filter @execora/db db:push` |
| Dev server | `npm run dev` | `pnpm dev` (from root) |
| Worker | `npm run worker` | `pnpm --filter @execora/worker dev` |
| Build | `npm run build` | `pnpm build` (Turborepo caches) |
| Tests | `npm test` | `pnpm test` |
| Docker | Same containers | Same containers, new build paths |

---

## When to Migrate

Recommended trigger: **when you add the Next.js admin frontend.**

The frontend (`apps/web`) will import `@execora/types` for shared TypeScript types.
That's the natural moment the monorepo pays off — shared types across API + frontend
without copy-pasting or a separate npm publish.

Until then, the current single-package structure is fine. Path aliases (Phase 0) can be
added now without the full migration — they improve DX immediately and make the later split trivial.

---

## Estimated Effort

| Phase | Work | Risk |
|---|---|---|
| Phase 0: path aliases | ~1 hour | Low — additive change |
| Phase 1: workspace root | ~30 min | Low — no code moves |
| Phase 2: extract packages | ~3-4 hours | Medium — update all imports |
| Phase 3: Docker | ~1 hour | Low — path changes only |
| Verify + tests | ~1 hour | — |
| **Total** | **~7 hours** | **Low-Medium** |

---

*Last updated: 2026-03-01*

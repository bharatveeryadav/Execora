# Web Master

**Owner:** Web team  
**Last updated:** March 2026  
**Key source files:**
- `apps/web/src/pages/` — all page components
- `apps/web/src/components/` — shared UI components
- `apps/web/src/lib/api.ts` — API client
- `apps/web/src/App.tsx` — routing

---

## Purpose

Single consolidated web application reference for current implementation and parity goals.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- React Query

## Source Of Truth

- apps/web/src/pages/\*
- apps/web/src/components/\*
- apps/web/src/hooks/\*
- apps/web/src/services/\*

## Current Web Coverage

- Auth and session flows
- Dashboard and analytics pages
- Customer, Product, Invoice, Payment and Ledger pages
- Reports and GST pages
- Settings and admin tooling pages

## Web Priorities

- Mobile parity for remaining workflows
- Consistent error/loading states
- Final pass for role-aware navigation hardening
- Integration test coverage for critical billing paths

## Related Consolidated Docs

- BACKEND_MASTER.md
- MOBILE_MASTER.md
- TASKS_COMPLETED.md
- TASKS_PENDING.md

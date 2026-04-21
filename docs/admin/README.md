# Admin Plans — Index

Two separate admin systems exist in Execora. Each has its own plan document.

---

## [PLATFORM_ADMIN_PLAN.md](./PLATFORM_ADMIN_PLAN.md)

**App**: `apps/admin` (port 3008, standalone React app)
**Auth**: `x-admin-key` header (Execora operator key — never shared with businesses)
**Used by**: Execora team to manage all businesses on the platform

What it covers:
- 13 pages already built (dashboard, tenants, users, invoices, etc.)
- Gap analysis: lifecycle management, support ops, analytics, queue drilldown
- Phase-by-phase build plan (5 phases, ~7–8 days)
- Security requirements (audit log, rate limits, impersonation TTL)
- New backend routes and schema additions needed

---

## [BUSINESS_ADMIN_PLAN.md](./BUSINESS_ADMIN_PLAN.md)

**App**: `apps/web` Settings section (port 8080, inside the main business app)
**Auth**: JWT Bearer token (tenant-scoped)
**Used by**: Business owners and admins to manage their own team and settings

What it covers:
- Current state: team list (add/remove) is built, but edit/reset/sessions are missing
- Full role hierarchy and permission matrix reference
- Phase 1: Complete Team Management (edit role, reset password, toggle active)
- Phase 2: Roles & Permissions matrix UI + per-user overrides
- Phase 3: Active Sessions management (view and revoke devices)
- Phase 4: Business Profile completions (FY start, default GST, invoice prefix)
- Phase 5: Activity Audit Trail
- All backend routes needed, new React Query hooks, file structure

---

## Quick Reference

| | Platform Admin | Business Admin |
|-|---------------|----------------|
| App | `apps/admin` | `apps/web` |
| Port | 3008 | 8080 |
| Auth | `x-admin-key` | JWT |
| Scope | All tenants | One tenant |
| Routes | `/admin/*` | `/api/v1/users`, `/api/v1/auth/*` |
| Roles | Single admin key | owner → admin → manager → staff → viewer |
| Status | 13 pages built, gaps in lifecycle/support | Team list basic, edit/sessions/audit missing |

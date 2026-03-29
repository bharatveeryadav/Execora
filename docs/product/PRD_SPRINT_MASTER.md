> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora — Product Requirements & Sprint Master
## Consolidated PRD + Sprint Plan | March 2026 (Updated March 17)

> **Purpose**: Single source of truth for all product requirements, organized as sprint-ready user stories. Derived from `PRODUCT_STRATEGY_2026.md`, `PRODUCT_REQUIREMENTS.md`, and `LAUNCH_CHECKLIST.md`.
>
> **Invoice requirements**: See `docs/INVOICE_REQUIREMENTS.md` for full improvement checklist (quick wins, GST compliance, user-requested, competitor parity).

---

## PR Summary (for docs PR)

**Title**: `docs: Add PRD Sprint Master — consolidated requirements and sprint plan`

**Description**:
- Consolidates all product requirements from PRODUCT_STRATEGY_2026, PRODUCT_REQUIREMENTS, and LAUNCH_CHECKLIST into a single PRD.
- Organizes work into sprints:
  - **Sprint 11 (P0)**: Launch blockers — UPDATE_STOCK voice, mobile layout, offline PWA, GSTIN validation, ErrorBoundary.
  - **Sprint 12 (P1)**: Launch + 30 days — batch/expiry, customer portal, onboarding, Agent Mode, recurring billing.
  - **Sprint 13 (P2)**: Launch + 90 days — E-invoicing, E-Way Bill, bank recon, WhatsApp chatbot.
  - **Sprint 14+ (SME)**: Credit/Debit notes, GSTR-3B, bank details on PDF, ITC tracking.
- Includes security and ops checklist (JWT, rate limit, CORS, tenantId audit).
- Feature status matrix for quick reference.

---

## Table of Contents

1. [Product Vision & Segments](#1-product-vision--segments)
2. [Sprint 11 — P0 Launch Blockers](#2-sprint-11--p0-launch-blockers)
3. [Sprint 12 — P1 Launch + 30 Days](#3-sprint-12--p1-launch--30-days)
4. [Sprint 13 — P2 Launch + 90 Days](#4-sprint-13--p2-launch--90-days)
5. [Sprint 14+ — SME & Enterprise](#5-sprint-14--sme--enterprise)
6. [Security & Ops Requirements](#6-security--ops-requirements)
7. [Feature Status Matrix](#7-feature-status-matrix)

---

## 1. Product Vision & Segments

### Vision
**"Bolo aur becho"** — Voice-first business OS for India's 12M kirana stores and small merchants.

### Segment A: Dukaan Owner (Core)
- Kirana, medical shop, small retailer | 10–200 bills/day
- **Needs**: Fast billing, walk-in, udhaar, WhatsApp, GST, offline, low stock, daily cash
- **Fit**: ~90% — offline ✅, mobile layout ✅, onboarding ✅ (all fixed March 15)

### Segment B: Growing Business (Upgrade)
- Distributor, pharmacy, multi-staff | 100+ bills/day, B2B
- **Needs**: Full GST, E-invoicing, multi-user, batch/expiry, purchase AP, reports
- **Fit**: ~50% (missing: E-invoicing ❌, E-Way Bill ❌, bank recon ❌)

---

## 2. Sprint 11 — P0 Launch Blockers

**Goal**: Ship nothing until these are done. Target: 2 weeks.

| # | Story | Est. | Status | Acceptance Criteria |
|---|-------|------|--------|---------------------|
| S11-01 | **UPDATE_STOCK voice intent** | 3h | ✅ | Voice "50 kilo aata aaya" increments stock. Add intent to prompts, handler, engine switch. |
| S11-02 | **Mobile layout — counter mode** | 2d | ✅ | `BottomNav` centralised in `AppLayout`; removed from 10 pages; `pt-safe pb-[56px]` wrapper; all tables `overflow-x-auto`; `OfflineBanner` in layout. |
| S11-03 | **Settings persistence** | 1d | ✅ | Business profile (name, address, GSTIN, UPI VPA) wired to `PUT /api/v1/auth/me/profile`; role/permission UI functional. |
| S11-04 | **Walk-in billing UX audit** | 2h | ✅ | ClassicBilling responsive; no horizontal scroll; 44px touch targets. |
| S11-05 | **Classic billing mobile audit** | 2h | ✅ | Verified — ClassicBilling is touch-friendly on mobile. |
| S11-06 | **Offline mode (PWA)** | 5d | ✅ | vite-plugin-pwa, manifest, IndexedDB outbox, "Offline — X queued" banner, voice STT disabled offline. |
| S11-07 | **React ErrorBoundary** | 1h | ✅ | Wrap `<AppRoutes />` in ErrorBoundary. |
| S11-08 | **GSTIN checksum validation** | 2h | ✅ | Reject B2B invoices with malformed GSTIN at API; UI red border + message. |

**Sprint 11 Success**: All P0 flows usable on 375px; voice stock update works; offline queue functional.

---

## 3. Sprint 12 — P1 Launch + 30 Days

**Goal**: Close adoption killers, improve retention. Target: 4 weeks.

| # | Story | Est. | Priority | Acceptance Criteria |
|---|-------|------|----------|---------------------|
| S12-01 | **Pharmacy: batch/expiry frontend** | 1d | ✅ | Batch entry in Purchase form, expiry alert on Inventory, batch selector on invoice rows. |
| S12-02 | **Customer portal (read-only)** | 1d | ✅ | Signed public URL; HTML page with invoice + payment status + UPI QR. |
| S12-03 | **Guided onboarding** | 3d | ✅ | `OnboardingWizard` 3-step modal on first login; saves to localStorage + `PUT /api/v1/auth/me/profile`; redirects to `/billing`; cannot be dismissed. |
| S12-04 | **Customer portal UPI link** | 1d | ✅ | "Pay Now" UPI deep link in `/pub/:id/:token`. |
| S12-05 | **Invoice template customisation** | 2d | P1 | 3–4 variants (thermal, A4, branded), logo, colour themes. |
| S12-06 | **Multiple price tiers** | 2d | P1 | `wholesalePrice`, `priceTier2`, `priceTier3` on Product; voice "wholesale price do". |
| S12-07 | **Recurring billing** | 3d | P1 | Invoice templates, scheduler, confirmation flow ("Aaj Sharma ji ka monthly bill ready hai — confirm?"). |
| S12-08 | **True Agent Mode (Mode 3)** | 1w | P1 | Tool-calling LLM, two-agent pattern (Conversation + Task), agent-runner.ts. |
| S12-09 | **PWA Quick Bill shortcut** | 2h | ✅ | manifest.json shortcut; auto-focus product search on ClassicBilling load. |
| S12-10 | **WhatsApp delivery → email fallback** | 2h | ✅ | If WhatsApp undelivered, fallback to email. |
| S12-11 | **Referral program** | 2d | P1 | "Invite 3 friends → 3 months free" tracking. |

---

## 4. Sprint 13 — P2 Launch + 90 Days

**Goal**: Segment B readiness, compliance, distribution. Target: 8 weeks.

| # | Story | Est. | Priority | Acceptance Criteria |
|---|-------|------|----------|---------------------|
| S13-01 | **E-invoicing (IRN + QR)** | 1w | P2 | IRP API integration, IRN generation, QR embed in PDF. |
| S13-02 | **E-Way Bill** | 1w | P2 | NIC portal API, vehicle/transporter details. |
| S13-03 | **Tally/Vyapar import wizard** | 3d | P2 | CSV import; Tally XML export for CA. |
| S13-04 | **WhatsApp chatbot** | 1w | P2 | Voice note → STT → intent → reply on WhatsApp. No app install. |
| S13-05 | **Bank statement import + reconciliation** | 4d | P2 | Upload CSV; match payments; flag unmatched. ICICI, HDFC, SBI formats. |
| S13-06 | **OCR purchase bill — complete** | 2d | P2 | Supplier cost capture, cost price update, purchase ledger, supplier payment tracking. |
| S13-07 | **Razorpay subscription** | 2d | P2 | Starter + Business plan billing. |
| S13-08 | **Barcode scan (React Native)** | 1d | P2 | react-native-vision-camera → GET /api/v1/products/barcode/:barcode. |
| S13-09 | **Push notifications (FCM)** | 2d | P2 | Payment reminder push on mobile. |
| S13-10 | **Mobile dashboard charts** | 2d | P2 | Charts on DashboardScreen. |

---

## 5. Sprint 14+ — SME & Enterprise

**Goal**: Segment B (5–50 staff, ₹50L–₹10Cr) paid launch. Target: 12 weeks.

### Must Build Before SME Paid Launch

| # | Story | Est. | Acceptance Criteria |
|---|-------|------|---------------------|
| S14-01 | **Credit note / debit note** | 3d | ✅ Schema (CreditNote+CreditNoteItem+enums); API routes (CRUD+issue+cancel); full UI page at /credit-notes; CN/FY/SEQ numbering; CGST/SGST/IGST per line. |
| S14-02 | **Bank account — Settings + PDF** | 4h | ✅ `bankAccount` on Tenant; IFSC/Account# on PDF footer. |
| S14-03 | **GSTR-3B output tax** | 3d | Aggregate IGST/CGST/SGST from invoices + ITC from purchases. |
| S14-04 | **ITC tracking** | 3d | `gstPaid` on purchases; ITC summary endpoint; wire to GSTR-3B. |
| S14-05 | **Customer statement export** | 1d | GET /api/v1/customers/:id/statement?from=&to= → PDF + CSV. |
| S14-06 | **GSTR-1 JSON (GSTN schema)** | 2d | JSON export matching GSTN B2B/B2CS/CDNR/HSN. |
| S14-07 | **Round-off on invoice** | 2h | `roundOff` boolean; `roundOffAmount`; print on PDF. |
| S14-08 | **Amount in words on PDF** | 4h | Add to PDF template (ClassicBilling has it in UI). |
| S14-08a | **Total items/qty in totals block** | 2h | Add "Total: X items, Y units" to TotalsBlock in preview + PDF. See INVOICE_REQUIREMENTS.md. |
| S14-08b | **ORIGINAL FOR RECIPIENT stamp** | 1h | Show when B2B (buyerGstin present). |
| S14-08c | **Payment status badge** | 2h | "Paid" / "Partial" / "Balance Due" on invoice. |
| S14-09 | **Terms & conditions** | 4h | ✅ `termsAndConditions` on Tenant; Settings; PDF footer. |

### Invoice Improvements (see docs/INVOICE_REQUIREMENTS.md)

| # | Story | Est. | Notes |
|---|-------|------|-------|
| INV-01 | Supplier email on invoice | 2h | Add to Settings; PDF footer |
| INV-02 | Recipient phone/email | 4h | Optional; delivery |
| INV-03 | Buyer PO number | 4h | Optional B2B |
| INV-04 | Template builder (logo, colors, columns) | 2d | S12-05 |
| INV-05 | E-invoicing (IRN + QR) | 1w | S13-01 |
| INV-06 | E-Way Bill | 1w | S13-02 |

### Important (Week 2–4 Post SME)

| # | Story | Est. |
|---|-------|------|
| S14-10 | Bulk invoice export (CSV/Excel) | 1d |
| S14-11 | Supplier management UI | 2d |
| S14-12 | Purchase order management | 3d |
| S14-13 | Sales report by product/customer/category | 2d |
| S14-14 | Cash flow statement | 2d |
| S14-15 | Email reminder fallback | 1d |
| S14-16 | Inventory valuation report | 2d |
| S14-17 | User audit log UI | 1d |
| S14-18 | Cost price / margin per product | 4h |

### Nice-to-Have (Q3 2026)

| # | Story | Est. |
|---|-------|------|
| S14-19 | Bulk customer/product import (CSV) | 2d |
| S14-20 | Product variants (size/color) | 3d |
| S14-21 | Customer segmentation / groups | 2d |
| S14-22 | Price lists (wholesale vs retail per tag) | 2d |

---

## 6. Security & Ops Requirements

### Security Hardening (Week 1)

| # | Requirement | Status |
|---|-------------|--------|
| SEC-01 | JWT_SECRET ≥ 32 chars in production | 🔴 |
| SEC-02 | ADMIN_API_KEY ≥ 16 chars in production | 🔴 |
| SEC-03 | Login rate limit: 5 req/min per IP | 🔴 |
| SEC-04 | CORS fail-closed if ALLOWED_ORIGINS empty | 🔴 |
| SEC-05 | Helmet CSP (min `default-src 'self'`) | 🔴 |
| SEC-06 | tenantId filter audit on all Prisma calls | 🔴 |

### Stability (Week 2)

| # | Requirement | Status |
|---|-------------|--------|
| OPS-01 | Fix listAllCustomers: DB-level take/skip | 🔴 |
| OPS-02 | Log rotation for logs/app.log | 🔴 |
| OPS-03 | Pre-register WhatsApp templates with Meta | 🔴 |
| OPS-04 | Redis AOF persistence verified | 🔴 |

### Launch Day

| # | Requirement | Status |
|---|-------------|--------|
| OPS-05 | GitHub Actions backup secrets set | 🔴 |
| OPS-06 | Migrate to managed DB (Supabase/Railway/RDS) | 🔴 |
| OPS-07 | Migrate to managed Redis (Upstash) | 🔴 |
| OPS-08 | Smoke test: tenant → customer → invoice → payment | 🔴 |

---

## 7. Feature Status Matrix

| Feature | Status | Sprint |
|---------|--------|--------|
| Voice billing (Hindi/Hinglish) | ✅ | — |
| Item-level discount | ✅ | S10 |
| WhatsApp auto-send PDF | ✅ | S9 |
| Walk-in billing | ✅ | S9 |
| UPI QR on invoice | ✅ | S9 |
| Desktop sidebar | ✅ | Recent |
| Parties (Customers + Vendors) | ✅ | Recent |
| Bottom nav (mobile) | ✅ | S10 |
| UPDATE_STOCK voice | ✅ | S11 |
| GSTIN checksum validation | ✅ | S11 |
| React ErrorBoundary | ✅ | S11 |
| Mobile layout polish | ✅ | S11 |
| Offline mode (PWA) | ✅ | S11 |
| Guided onboarding wizard | ✅ | S12 |
| Batch/expiry frontend | ✅ | S12 |
| Customer portal | ✅ | S12 |
| Customer portal UPI Pay Now | ✅ | S12 |
| WhatsApp → email fallback | ✅ | S12 |
| E-invoicing | 🔴 | S13 |
| E-Way Bill | 🔴 | S13 |
| Credit note | ✅ | S14 |
| GSTR-3B backend | 🔴 | S14 |
| Bank reconciliation | 🔴 | S14+ |

---

## Appendix: File References

| Area | Key Files |
|------|-----------|
| Item discount | `packages/types`, `invoice.service.ts`, `InvoiceCreation.tsx`, `prompts.ts` |
| UPDATE_STOCK | `prompts.ts`, `product.handler.ts`, `engine/index.ts` |
| GSTIN validation | `packages/shared/src/gstin.ts`, `invoice.routes.ts`, `ClassicBilling.tsx`, `InvoiceCreation.tsx` |
| Mobile layout | `AppLayout.tsx` (BottomNav centralised), `BottomNav.tsx`, `ClassicBilling.tsx` |
| Offline | `apps/web/src/lib/offline-outbox.ts`, `apps/web/src/components/OfflineBanner.tsx`, `vite.config.ts` |
| Onboarding | `apps/web/src/components/OnboardingWizard.tsx` (shown in `ProtectedRoute` in `App.tsx`) |
| Invoice portal | `apps/api/src/api/routes/portal.routes.ts`, `apps/web/src/pages/InvoicePortal.tsx` |
| Batch/expiry | `apps/api/src/api/routes/expense.routes.ts`, `apps/web/src/components/DraftConfirmDialog.tsx`, `prisma/schema.prisma` |
| Settings | `Settings.tsx`, tenant update route |
| Feature flags | `packages/infrastructure/src/feature-flags.ts` |

---

_Document version: 1.3 | March 15, 2026 | Sprint 11 ✅ complete, Sprint 12 ✅ complete, S14-01 Credit Notes ✅_

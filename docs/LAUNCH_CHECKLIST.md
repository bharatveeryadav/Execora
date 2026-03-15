# Execora — Launch Checklist
## Last Updated: March 13, 2026

---

## BLOCKERS (ship nothing until these are done)

- [x] ~~Fix IDOR~~ **FIXED 2026-03-13**: `getCustomerById()` + `getInvoiceById()` now use `findFirst({ where: { id, tenantId } })` — Tenant A cannot fetch Tenant B's data
- [x] ~~Fix InvoiceCounter~~ **FIXED 2026-03-13**: `InvoiceCounter` model updated with `tenantId` field + composite `@@id([fy, tenantId])`; `generateInvoiceNo()` now inserts/upserts with `tenant_id`; migration `20260313000001_invoice_counter_tenant_scope` created — run `pnpm db:generate && pnpm db:migrate` to apply
- [x] ~~Fix MinIO~~ **FIXED 2026-03-13**: `mc anonymous set download local/execora` removed from `docker-compose.yml`; bucket is now private; PDFs accessed via presigned URLs / email only
- [x] ~~Fix WebSocket~~ **FIXED 2026-03-13**: `/ws` endpoint in `apps/api/src/index.ts` now validates JWT from `?token=` query param; closes with code 4001 if missing, expired, or invalid; `tenantContext` updated from JWT payload

---

## SECURITY HARDENING (Week 1 alongside blockers)

- [ ] Startup assertion: throw if `JWT_SECRET` < 32 chars in production
- [ ] Startup assertion: throw if `ADMIN_API_KEY` < 16 chars in production
- [ ] Login rate limit: 5 req/min per IP on `POST /api/v1/auth/login` separately from global rate limit
- [ ] CORS fail-closed: if `ALLOWED_ORIGINS` empty in production, set `origin: false` (reject all cross-origin requests)
- [ ] Remove `allowedHosts` tailscale hostname from `apps/web/vite.config.ts`
- [ ] Enable Helmet CSP (at minimum `default-src 'self'`)
- [ ] Add `tenantId` filter audit: scan all `prisma.*` calls in `packages/modules/src/` to verify `tenantId` is in every `where` clause
- [x] ~~GSTIN checksum validation~~ **FIXED 2026-03**: Reject B2B invoices with malformed GSTIN at API; Luhn mod 36 checksum in `packages/shared/src/gstin.ts`; UI red border + message in ClassicBilling + InvoiceCreation

---

## STABILITY (Week 2)

- [x] ~~Add React ErrorBoundary~~ **FIXED 2026-03**: `ErrorBoundary.tsx` wraps AppRoutes; fallback UI with retry on render errors
- [ ] Integrate Sentry: `@sentry/node` in API + `@sentry/react` in web; Slack alert on error rate spike
- [ ] Fix `listAllCustomers`: replace JS-level `slice(offset, offset+limit)` with DB-level `take/skip` in Prisma query
- [ ] Configure log rotation for `logs/app.log` (logrotate or Pino transport maxSize)
- [x] ~~Add GSTIN checksum validation UI feedback~~ **FIXED 2026-03**: Red border + message in InvoiceCreation and ClassicBilling; pre-submit validation; API returns 400 INVALID_GSTIN
- [ ] Pre-register WhatsApp message templates with Meta before enabling auto-send (templates must be approved before use)
- [ ] Verify Redis AOF (Append-Only File) persistence is enabled — voice session draft loss on Redis restart is a P0 UX failure

---

## LAUNCH DAY (Week 3)

- [ ] Verify GitHub Actions backup secrets are set (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `DATABASE_URL`)
- [ ] Set `ALLOWED_ORIGINS` to production domain(s) only
- [ ] Set strong `JWT_SECRET` (≥32 chars), `ADMIN_API_KEY` (≥16 chars), `REDIS_PASSWORD`, `POSTGRES_PASSWORD` — all must be random, not defaults
- [ ] Migrate from local Docker PostgreSQL to managed DB (Supabase / Railway / RDS) with automatic failover
- [ ] Migrate from local Redis to Upstash or managed Redis with AOF persistence
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
- [ ] Verify `GET /health` returns `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`
- [ ] Smoke test: create tenant → customer → invoice → payment → verify balance
- [ ] Verify Tenant A cannot fetch Tenant B's customer UUID (should return 404)
- [ ] Verify invoice number sequence is independent per tenant (Tenant A INV/2025-26/1, Tenant B INV/2025-26/1)
- [ ] Verify MinIO invoice PDFs require presigned URL — raw object key URL should return 403
- [ ] Verify unauthenticated WebSocket connection is rejected with close code 4001
- [ ] Verify JWT with expired token returns 401 from API
- [ ] Verify Prometheus `/metrics` endpoint is not publicly accessible (behind admin auth or firewall)

---

## PRODUCTION-READY (already solid — no action needed)

- [x] JWT auth: HS256, `timingSafeEqual`, 15-min access tokens, refresh token rotation with anti-replay
- [x] Invoice creation atomic: stock deduction + payment recording + ledger entry + customer balance in single Prisma `$transaction`
- [x] Decimal types for all money amounts (`Prisma.Decimal`) — no floating-point rounding bugs
- [x] 5 Prisma migrations applied (not `db:push`) — rollback-safe
- [x] Prometheus metrics: HTTP latency histograms, voice session counters, LLM cost tracking, queue depth, DB latency
- [x] BullMQ: email + WhatsApp + PDF + OCR are all queue-backed with retry and exponential backoff
- [x] Soft delete: `deletedAt` on Invoice, Customer, Product — data is never permanently erased without intent
- [x] `pg_dump` backup in GitHub Actions (30-day S3 retention)
- [x] Docker prod compose: CPU/memory resource limits, no Bull Board exposed, Redis requires password
- [x] Token refresh race-condition-safe (`refreshInFlight` dedup in `AuthContext`)
- [x] WhatsApp: real Meta Cloud API integration (not a stub) — delivery status tracked via webhook
- [x] GSTR-1 + P&L report generation with email delivery via BullMQ
- [x] Multi-tenancy via AsyncLocalStorage `tenantContext` (majority of service methods)
- [x] HMAC portal tokens: constant-time comparison, deterministic (no DB column needed)
- [x] 9-aggregator UPI webhook system: each verified with provider-specific HMAC scheme

---

## P0 FEATURE GAPS (must build before paid launch)

- [x] ~~**Item-level discount — API route schema fix**~~ **FIXED 2026-03-13**: `lineDiscountPercent` + `hsnCode` added to items schema in all 3 routes (POST, proforma, PATCH) in `invoice.routes.ts`. UI in `ClassicBilling.tsx` and voice `ADD_DISCOUNT` intent can now flow end-to-end.
- [x] ~~UPDATE_STOCK voice intent~~ **CONFIRMED BUILT**: `executeUpdateStock` in product.handler.ts; engine switch in engine/index.ts; prompts in prompts.ts
- [x] ~~WhatsApp auto-send invoice PDF~~ **CONFIRMED BUILT**: `dispatchInvoicePdfEmail()` reads `autoSendWhatsApp` from Tenant.settings → `whatsappService.sendDocumentMessage()`. Just set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` env vars.
- [ ] Mobile-responsive web layout: bottom nav at ≤768px, touch targets ≥44px, no horizontal scroll on 375px (2 days — S10-03)
- [ ] Mobile ClassicBillingScreen (React Native): single-screen counter billing, walk-in default, sticky total bar (3 days)
- [ ] Offline mode (PWA + IndexedDB): `vite-plugin-pwa`, `StaleWhileRevalidate` for catalog, `NetworkFirst` with IndexedDB outbox for mutations (5 days — S10-04)
- [ ] Barcode scan (React Native native camera): `react-native-vision-camera` → `GET /api/v1/products/barcode/:barcode` (1 day)
- [ ] Razorpay subscription integration: Starter + Business plan billing (2 days)

---

## P1 GAPS (30 days post-launch)

- [ ] Guided onboarding flow: business profile → first invoice < 5 minutes; new tenants currently land on empty dashboard (3 days)
- [ ] Customer portal UPI payment link: "Pay Now" UPI deep link in `/pub/:id/:token` portal (1 day)
- [ ] Referral program: "Invite 3 friends → 3 months free" tracking + reward system (2 days)
- [ ] True Agent Mode (Mode 3): LLM tool-calling, two-agent pattern (Conversation + Task); planned Q3 2026 (3 weeks)
- [ ] Push notifications for payment reminders (mobile): FCM integration for RN app (2 days)
- [ ] PWA "Quick Bill" home screen shortcut: `manifest.json` shortcut + auto-focus product search on ClassicBilling load (2h)
- [x] ~~React ErrorBoundary in App.tsx~~ **FIXED 2026-03** (1h)
- [ ] Barcode scan (React Native) — if not done as P0 (1 day)
- [ ] Mobile dashboard charts (DashboardScreen has layout but no charts) (2 days)
- [ ] WhatsApp delivery failure → email fallback chain (2h)
- [ ] Batch/expiry frontend: batch entry on Purchase form + batch selector on invoice rows (1 day — S10-05)
- [ ] GSTR-3B backend (currently placeholder page only)
- [ ] Recurring billing backend (currently placeholder page only)

---

## 🏢 MEDIUM-SCALE BUSINESS FEATURE GAPS
> Based on full code audit March 13, 2026 — 67/125 features built (67% coverage).
> These are required before Segment B (5–50 staff, ₹50L–₹10Cr SME) launch.

### 🔴 Must Build Before SME Paid Launch (Top 10, ordered by impact)

- [ ] **Credit note / debit note** — No model, route, or UI. Mandatory for B2B returns; GST compliance requires CN/DN with original invoice reference. Est: 3 days
- [x] ~~**Bank account details — Settings + Invoice PDF**~~ **CONFIRMED BUILT**: `bankAccountNo`, `bankIfsc`, `bankAccountHolder` in tenant.settings; Settings UI; PDF footer in `packages/infrastructure/src/pdf.ts`
- [ ] **GSTR-3B output tax summary** — `Gstr3b.tsx` is a placeholder reading from `useSummaryRange` only. Build backend: aggregate IGST/CGST/SGST from confirmed invoices + ITC from purchases. Est: 3 days
- [ ] **Input tax credit (ITC) tracking** — No model or route. Add `gstPaid` field to purchases; build ITC summary endpoint; wire into GSTR-3B. Est: 3 days
- [ ] **Customer statement / ledger export** — Add `GET /api/v1/customers/:id/statement?from=&to=` returning PDF + CSV. CAs require this weekly. Est: 1 day
- [ ] **GSTR-1 JSON in official GSTN schema** — Current report is CSV. Build JSON export matching GSTN's official schema (B2B/B2CS/CDNR/HSN sections). Required for GST portal upload. Est: 2 days
- [ ] **Round-off on invoice total** — Add `roundOff` boolean to invoice; calculate and store `roundOffAmount`; print on PDF. Est: 2h
- [ ] **Amount in words on PDF** — `ClassicBilling.tsx` shows amount-in-words in UI but `generateInvoicePdf()` does not print it. Add to PDF template. Est: 4h
- [x] ~~**Terms & conditions on invoice**~~ **CONFIRMED BUILT**: `termsAndConditions` in tenant.settings; Settings UI; PDF footer in `packages/infrastructure/src/pdf.ts`
- [x] ~~WhatsApp auto-send invoice~~ — **CONFIRMED BUILT** (see P0 section above). Just needs Meta env vars.

### 🟡 Important (Build Week 2–4 Post SME Launch)

- [ ] **Bulk invoice export (CSV/Excel)** — Add `GET /api/v1/invoices/export?from=&to=&status=` returning CSV. Add download button to Invoices page. Est: 1 day
- [ ] **Supplier management UI** — `Supplier` model exists in schema; no frontend CRUD. Build `/suppliers` page with name, phone, GSTIN, payment terms. Est: 2 days
- [ ] **Purchase order management** — No PO model. Add `PurchaseOrder` model with items, supplier, status; CRUD routes + UI. Est: 3 days
- [ ] **Sales report by product / customer / category** — Add `GET /api/v1/reports/sales?groupBy=product|customer|category&from=&to=`. Est: 2 days
- [ ] **Cash flow statement** — CashBook shows transactions but not grouped by Operating/Investing/Financing activities. Add a dedicated cash flow endpoint. Est: 2 days
- [x] ~~Auto-send invoice toggle~~ — **CONFIRMED BUILT**: Settings.tsx saves `autoSendEmail` + `autoSendWhatsApp` to both localStorage and Tenant.settings via `updateProfile.mutateAsync`. `dispatchInvoicePdfEmail()` reads these flags.
- [ ] **Email reminder fallback** — WhatsApp reminders are built (10 types, BullMQ). Email reminders using same scheduler are not. Add email job to `scheduleReminder` with fallback if WhatsApp undelivered. Est: 1 day
- [ ] **Inventory valuation report** — No `costPrice` field on `Product`. Add `costPrice` to schema; build `GET /api/v1/reports/inventory-valuation` (stock × cost). Est: 1 day schema + 1 day report
- [ ] **User audit log UI** — `ActivityLog` model exists in schema with `userId`, `action`, `entity`, `entityId`, `metadata`. Build `GET /api/v1/audit-log` + Settings > Audit Log page. Est: 1 day
- [ ] **Cost price / margin tracking per product** — Add `costPrice` (Decimal) to Product model; show margin% in Inventory page. Est: 2h schema + 4h UI

### 🟢 Nice-to-Have (Q3 2026)

- [ ] **Bulk customer import (CSV)** — `ImportData.tsx` is a placeholder. Build backend parser endpoint `POST /api/v1/customers/import` + confirm step. Est: 2 days
- [ ] **Bulk product import (CSV)** — Same — `ImportData.tsx` placeholder. Build `POST /api/v1/products/import`. Est: 1 day
- [ ] **Product variants (size/color)** — No `ProductVariant` model. Est: 3 days
- [ ] **Customer segmentation / groups** — No grouping model beyond tags. Est: 2 days
- [ ] **Purchase order to invoice auto-conversion** — After PO is built. Est: 1 day
- [ ] **Price lists (wholesale vs retail per customer tag)** — VIP/Wholesale tags exist; no per-tag price logic. Est: 2 days

---

## P2 BACKLOG

- [ ] E-invoicing (IRN + QR code from GSTN API) — Enterprise Q4 2026
- [ ] E-way bill generation — Enterprise Q4 2026
- [ ] Multi-branch support (consolidated reporting) — Enterprise Q4 2026
- [ ] Bank reconciliation backend — Enterprise Q4 2026
- [ ] CA partner mode (external accountant dashboard) — Enterprise Q4 2026
- [ ] API webhooks + REST access for ERP integration — Enterprise Q4 2026
- [ ] WhatsApp chatbot interface (voice note → AI → WhatsApp reply) — Enterprise Q4 2026
- [ ] Tally XML import (migration tool for Tally defectors) — Enterprise Q4 2026
- [ ] Desktop Electron wrapper (for Windows Tally replacers) — Q4 2026
- [ ] GSTR-2A / ITC reconciliation — Business+ Q4 2026
- [ ] Multi-language STT (Marathi, Gujarati, Tamil, Telugu) — Business+ Q3 2026
- [ ] Email reminders (secondary channel after WhatsApp) — Starter+ Q3 2026
- [ ] SMS fallback (Twilio/Textlocal) — All tiers Q3 2026
- [ ] Loyalty points / customer rewards — Enterprise Q4 2026
- [ ] Thermal receipt printer support — Business+ Q4 2026
- [ ] Staff attendance tracking — Business+ Q4 2026
- [ ] Price lists (wholesale vs retail tiers per product) — Business+ Q3 2026
- [ ] Analytics AI ("explain my sales drop") — Enterprise Q4 2026
- [ ] Credit scoring from transaction history — Enterprise 2027
- [ ] Bank current account integration — Enterprise 2027
- [ ] E-commerce integration (Shopify/WooCommerce) — Enterprise 2027

# Execora — Launch Checklist
## Last Updated: March 13, 2026

---

## BLOCKERS (ship nothing until these are done)

- [ ] Fix IDOR: `getCustomerById()` + `getInvoiceById()` — add `tenantId: tenantContext.get().tenantId` to `where` clause in both module services
- [ ] Fix InvoiceCounter: verify `InvoiceCounter` table has `tenantId` column + `(tenantId, fiscalYear)` unique constraint; add Prisma migration if missing; update `generateInvoiceNo()` to filter by tenantId
- [ ] Fix MinIO: remove anonymous read access from bucket policy; confirm all PDF access goes through presigned URLs or email
- [ ] Fix WebSocket: verify JWT on `/ws` upgrade request (token from `?token=` query param); close connection with code 4001 if missing, expired, or invalid

---

## SECURITY HARDENING (Week 1 alongside blockers)

- [ ] Startup assertion: throw if `JWT_SECRET` < 32 chars in production
- [ ] Startup assertion: throw if `ADMIN_API_KEY` < 16 chars in production
- [ ] Login rate limit: 5 req/min per IP on `POST /api/v1/auth/login` separately from global rate limit
- [ ] CORS fail-closed: if `ALLOWED_ORIGINS` empty in production, set `origin: false` (reject all cross-origin requests)
- [ ] Remove `allowedHosts` tailscale hostname from `apps/web/vite.config.ts`
- [ ] Enable Helmet CSP (at minimum `default-src 'self'`)
- [ ] Add `tenantId` filter audit: scan all `prisma.*` calls in `packages/modules/src/` to verify `tenantId` is in every `where` clause
- [ ] GSTIN checksum validation: reject B2B invoices with malformed GSTINs at the API layer (2h)

---

## STABILITY (Week 2)

- [ ] Add React ErrorBoundary to `apps/web/src/App.tsx` wrapping `<AppRoutes />`
- [ ] Integrate Sentry: `@sentry/node` in API + `@sentry/react` in web; Slack alert on error rate spike
- [ ] Fix `listAllCustomers`: replace JS-level `slice(offset, offset+limit)` with DB-level `take/skip` in Prisma query
- [ ] Configure log rotation for `logs/app.log` (logrotate or Pino transport maxSize)
- [ ] Add GSTIN checksum validation UI feedback in InvoiceCreation form (show red border + message on invalid format)
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

- [ ] Item-level discount backend wiring: `resolveItemsAndTotals()` must apply `lineDiscountPercent` before GST calculation (3h — S10-01)
- [ ] UPDATE_STOCK voice intent: wire `executeUpdateStock` handler into engine switch + add LLM prompt examples (3h — S10-02)
- [ ] WhatsApp auto-send invoice PDF on confirm: queue `whatsapp:send-invoice` BullMQ job from `confirmInvoice()` + per-tenant Settings toggle (4h — S9-01)
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
- [ ] React ErrorBoundary in App.tsx (1h)
- [ ] Barcode scan (React Native) — if not done as P0 (1 day)
- [ ] Mobile dashboard charts (DashboardScreen has layout but no charts) (2 days)
- [ ] WhatsApp delivery failure → email fallback chain (2h)
- [ ] Batch/expiry frontend: batch entry on Purchase form + batch selector on invoice rows (1 day — S10-05)
- [ ] GSTR-3B backend (currently placeholder page only)
- [ ] Recurring billing backend (currently placeholder page only)

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

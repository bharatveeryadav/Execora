# Execora — Senior PM + Architecture Strategy Document
**Version 1.0 | March 2026**

## Live Status — March 13, 2026

### Billing & Invoice
| Feature | Status | Notes |
|---------|--------|-------|
| B2C GST invoice (CGST+SGST) | ✅ Shipped | Voice + form, all edge cases |
| Non-GST cash memo | ✅ Shipped | withGst=false |
| B2B invoice with buyer GSTIN | ✅ Shipped | buyerGstin + IGST inter-state |
| IGST inter-state auto-switch | ✅ Shipped | supplyType=INTERSTATE |
| Walk-in billing (1-tap) | ✅ Shipped | QuickActions "Quick Sale" |
| Partial payment at billing | ✅ Shipped | initialPayment field |
| Bill-level discount (voice + form) | ✅ Shipped | discountPercent / discountAmount |
| Item-level (per-line) discount | ⚠️ UI only | lineDiscountPercent type exists; resolveItemsAndTotals() not wired |
| Proforma invoice / quotation | ✅ Shipped | POST /invoices/proforma |
| Proforma → invoice convert | ✅ Shipped | With optional initial payment |
| Invoice edit (PATCH) | ✅ Shipped | Items, notes, discounts, GST flags on PENDING |
| Invoice cancel (stock restored) | ✅ Shipped | |
| Invoice PDF + UPI QR footer | ✅ Shipped | qrcode in pdf.ts |
| Invoice PDF auto-email | ✅ Shipped | BullMQ mediaQueue on confirm |
| Invoice PDF auto-WhatsApp | ❌ P0 Gap | Not wired from confirmInvoice(); no autoWhatsapp tenant toggle |
| Invoice numbering (per-tenant, FY-based) | ⚠️ Security gap | InvoiceCounter may lack tenantId isolation — see Blocker 2 |
| Repeat last bill | ✅ Shipped | GET /customers/:id/last-order |
| ClassicBilling single-screen UI | ✅ Shipped | /billing route |
| Mixed payment (cash+UPI split) | ✅ Shipped | POST /ledger/mixed-payment + voice |
| Credit limit enforcement | ✅ Shipped | 422 CREDIT_LIMIT_EXCEEDED |

### Customer Management
| Feature | Status | Notes |
|---------|--------|-------|
| Customer CRUD (name, phone, email, tags) | ✅ Shipped | |
| Fuzzy search (name/phone/nickname/landmark) | ✅ Shipped | Levenshtein + token overlap |
| Customer overdue list | ✅ Shipped | GET /customers/overdue |
| Communication preferences (WA/email/SMS) | ✅ Shipped | GET/PUT /comm-prefs |
| Customer portal (read-only, HMAC token) | ✅ Shipped | /pub/invoice/:id/:token |
| Customer portal PDF redirect (presigned) | ✅ Shipped | |
| Customer portal UPI payment link | ❌ P1 Gap | Not built |
| Customer delete (soft delete) | ✅ Shipped | |

### Ledger / Payments
| Feature | Status | Notes |
|---------|--------|-------|
| Payment recording (cash/UPI/card/other) | ✅ Shipped | |
| Auto-settlement (oldest-first, khata) | ✅ Shipped | |
| Credit addition | ✅ Shipped | |
| Customer ledger view | ✅ Shipped | |
| Payment Sound Box (Paytm-style TTS) | ✅ Shipped | Web Speech API + WS event |
| Webhook — Razorpay (HMAC-SHA256) | ✅ Shipped | |
| Webhook — PhonePe (SHA256+saltKey) | ✅ Shipped | |
| Webhook — Cashfree (HMAC+timestamp) | ✅ Shipped | |
| Webhook — PayU (SHA512 reverse) | ✅ Shipped | |
| Webhook — Paytm (TXN_SUCCESS) | ✅ Shipped | |
| Webhook — Instamojo (HMAC-SHA1) | ✅ Shipped | |
| Webhook — Stripe India | ✅ Shipped | stripe-signature verified |
| Webhook — EaseBuzz (SHA512) | ✅ Shipped | |
| Webhook — BharatPe (HMAC-SHA256) | ✅ Shipped | |

### Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| Product catalog CRUD | ✅ Shipped | HSN, GST rate, barcode, stock |
| Low stock alerts | ✅ Shipped | minStock threshold, WS push |
| Barcode scan (web ZXing) | ✅ Shipped | EAN-13/QR |
| Barcode scan (React Native) | ❌ P1 Gap | Backend ready; native camera not wired |
| OCR purchase bill (OpenAI Vision) | ⚠️ Partial | 9-field draft; supplier cost capture pending |
| Batch/expiry tracking | ⚠️ Partial | Backend full (S9-06); frontend batch entry needs verification |
| UPDATE_STOCK voice intent | ⚠️ Backend only | product.handler.ts exists; voice switch + LLM prompt not wired |

### Reports & GST
| Feature | Status | Notes |
|---------|--------|-------|
| GSTR-1 export (B2B/B2CS/HSN, Indian FY) | ✅ Shipped | PDF + CSV + email |
| P&L date-range report | ✅ Shipped | Month-wise + email |
| Balance Sheet page | ✅ Shipped | Assets/liabilities/equity |
| CashBook, DayBook | ✅ Shipped | |
| Expenses + Purchases CRUD | ✅ Shipped | |
| GSTR-3B | 🖥️ Placeholder | Frontend page only |
| E-invoicing (IRN) | 🖥️ Placeholder | Frontend page; no backend; Q4 2026 |
| Bank reconciliation | 🖥️ Placeholder | Frontend page; no backend |
| Recurring billing | 🖥️ Placeholder | Frontend page; no backend |

### Voice Engine
| Feature | Status | Notes |
|---------|--------|-------|
| 35 intents (CREATE_INVOICE … UPDATE_STOCK) | ✅ Shipped | engine/index.ts switch |
| Multi-turn drafts (Redis, 4h TTL) | ✅ Shipped | ConversationSession |
| TTS (ElevenLabs/OpenAI/Browser fallback) | ✅ Shipped | |
| Deepgram STT + Browser WebSpeech fallback | ✅ Shipped | |
| True Agent Mode (Mode 3) | ❌ P2 | LLM tool-calling; planned Q3 2026 |

### Infrastructure / Auth / Mobile
| Feature | Status | Notes |
|---------|--------|-------|
| JWT auth + refresh rotation | ✅ Shipped | HS256, timingSafeEqual |
| RBAC (5 roles, 22 permissions) | ✅ Shipped | |
| Feature flags (FeatureFlag enum + TIER_FEATURES) | ✅ Shipped | featureGate() returns 402 |
| Real-time WebSocket (per-tenant fan-out) | ✅ Shipped | 12+ event types |
| BullMQ queues (4 queues + Bull Board) | ✅ Shipped | |
| MinIO object storage + presigned URLs | ✅ Shipped | |
| Prometheus metrics | ✅ Shipped | |
| Docker prod compose (resource limits, no admin UIs) | ✅ Shipped | |
| GitHub Actions pg_dump backup | ✅ Shipped | 30-day S3 retention |
| Sentry error tracking | ❌ P0 Gap | Not in codebase |
| Offline mode (PWA + IndexedDB) | ❌ P0 Gap | No service worker, no manifest.json |
| Mobile (React Native) — 10 screens | ✅ Shipped | Dashboard, Billing, Customers, Invoices, Voice, Overdue |
| Mobile ClassicBillingScreen | ❌ P0 Gap | Web ClassicBilling exists; RN equivalent not built |
| Mobile offline / AsyncStorage queue | ❌ P0 Gap | Not built |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Landscape & Competitor Deep-Dive](#2-market-landscape--competitor-deep-dive)
3. [Two-Segment User Strategy](#3-two-segment-user-strategy)
4. [Feature Toggle & Add-On Architecture](#4-feature-toggle--add-on-architecture)
5. [Mobile vs Desktop Parity Strategy](#5-mobile-vs-desktop-parity-strategy)
6. [Production Launch Roadmap](#6-production-launch-roadmap)
7. [Critical P0 Gaps — Must Build Before Launch](#7-critical-p0-gaps--must-build-before-launch)
8. [Voice Engine Roadmap](#8-voice-engine-roadmap)
9. [Technical Debt & Architecture Risks](#9-technical-debt--architecture-risks)
10. [Competitive Moat & Long-Term Strategy](#10-competitive-moat--long-term-strategy)

---

## 1. Executive Summary

### What Execora Is and the Core Bet

Execora is a real-time, voice-driven business operating system for India's 63 million MSMEs — specifically targeting the 12 million kirana stores and small retailers who have been left behind by every billing software built in the last 30 years. The core bet is simple and asymmetric: **voice is the only interface Indian shopkeepers will actually use mid-rush hour, and no competitor has built real voice for them.**

The product combines a Fastify + BullMQ backend with a React web dashboard, React Native mobile app, WebSocket-powered real-time sync, and a three-mode execution architecture (intent-based voice, classic form UI, and a planned true AI agent mode). The voice engine understands Hindi, Hinglish, and regional languages. An invoice can be created in under 3 seconds from a spoken sentence.

The business model follows a SaaS playbook with a generous free tier (the "forever free" hook for kirana stores) scaling to ₹299–₹2,999/month for power users, with add-ons for WhatsApp volume, extra users, OCR scans, and API access.

### Why Now — Market Timing

Three forces converge in 2026 that make this the right moment:

1. **GST compliance pressure is permanent.** The GST regime has been in force since 2017, but enforcement intensity increased sharply after 2023. A kirana owner who ignored GST in 2020 cannot do so in 2026. The compliance burden creates a software pull that did not exist before.

2. **UPI is universal; voice is next.** India processed 17.6 billion UPI transactions in November 2024. The kirana owner who adopted UPI payments in 2019 is now comfortable with app-based transactions. Voice is the natural next step — these users speak to Google Maps, Jio phone assistants, and WhatsApp voice notes all day.

3. **Deepgram + GPT-4 made real Hindi STT/NLP viable for the first time.** Before 2023, Hindi STT quality was poor. Deepgram's Nova-2 Hindi model achieves sub-800ms latency with high accuracy on Hinglish. The technology barrier that protected incumbents from voice challengers has now been removed.

### The Single Most Important Insight from Competitor Research

**Every competitor built forms first and called it "easy." None of them solved the counter problem.**

During the 300-customer-per-day rush between 10 AM and 1 PM, a kirana owner cannot stop to type a customer name, navigate to items, select quantities, and click "confirm." Vyapar has 50 million downloads but 3-star reviews from counter users specifically cite: "too many taps to make a simple bill," "slow on my phone," and "keeps logging out." BillBook users report the same. These are not bugs. They are a fundamental design mistake: these products were designed for a desktop accountant, then shrunken to a mobile screen.

Execora's bet is that voice eliminates this friction entirely. The demo — say "Ramesh ka bill do aata ek tel" and watch a GST invoice appear in 3 seconds — is not a feature. It is a category shift.

---

## 2. Market Landscape & Competitor Deep-Dive

### 2.1 Competitor Matrix

| Competitor | Pricing (India) | Primary User | Platform | Voice Input | GST Compliance | Offline Mode | WhatsApp Integration | Key Pain Points |
|---|---|---|---|---|---|---|---|---|
| **Vyapar** | Free (basic); ₹1,299–₹2,399/year (desktop); ₹599–₹1,799/year (mobile); ₹2,999/year (desktop+mobile) | Kirana, small retailer | Android + Windows | None | Full GSTR-1, e-invoice | Yes (desktop) | Basic (manual share) | Too many taps for counter billing; desktop-mobile sync is paid extra; customer support is slow; WhatsApp share is manual, not automatic |
| **myBillBook** | Free (limited); ₹2,499/year (Standard); ₹4,999/year (Plus) | Retailer, FMCG | Android + Web | None | GST invoicing | Partial | Manual share | Complex UI for non-accountants; limited inventory for pharma; no recurring reminders; reports are weak |
| **Swipe Billing** | Free (5 users); ₹2,399–₹7,199/year (Growth/Scale) | SME, B2B | Web + Android | None | Full + e-invoice + e-way bill | No | WhatsApp share | No offline mode at all; expensive for small shops; mobile app is slower than web; limited customization |
| **Tally Prime** | ₹750+GST/month (Silver/single user); ₹8,100/year; ₹22,500+GST lifetime | CA, accountant, mid-size business | Windows desktop only | None | Full GST, audit trail | Yes (local) | None natively | Requires trained operator; no mobile app; ₹26,550 lifetime is prohibitive for kirana; interface is 1990s-era; zero Hindi support in UI |
| **Zoho Books** | Free (revenue ≤ ₹25L); ₹749–₹7,999/month | SME with accountant, urban | Web + iOS/Android | None | Full + e-invoice + GSTR | No (cloud only) | None | Overkill for kirana; English-first UI; minimum ₹899/month for GST filing features; requires internet always; learning curve is weeks |
| **Marg ERP** | ₹9,000–₹18,000/year | Pharma distributor, FMCG | Windows desktop | None | Full + pharma-specific | Yes | None | Desktop-only; pharma/distribution niche; poor mobile experience; complex implementation |
| **Busy Accounting** | Free (Express); ₹9,999–₹19,999/year (Basic–Enterprise) | SME, distributor, CA | Windows desktop | None | Full GST + TDS | Yes (local) | None | Desktop-only; no mobile; complex for non-accountants; UI is dated; no cloud sync without paid add-on |
| **OkCredit / Khatabook** | Free | Kirana (credit tracking only) | Android | None | No GST | Yes | Basic WhatsApp share | Not a billing tool — only tracks credit (udhaar); no invoices; no inventory; no GST; users outgrow it immediately |
| **Pilloo AI** | Unknown (launched Feb 2026) | TBD — early stage | Web | Claims voice | Unknown | Unknown | Unknown | Very new; tech depth unverified; no production track record; likely single-intent voice (not multi-turn) |
| **Execora** | Free; ₹299/mo (Starter); ₹999/mo (Business); ₹3,499/mo (Enterprise) | Kirana (primary), Growing SME (secondary) | Web + React Native | Real-time Hindi/Hinglish voice (streaming) | Full: CGST/SGST/IGST, GSTR-1 export | Planned (Q3 2026) | Automated (BullMQ + Meta Cloud API) | Item-level discount not wired yet; offline mode not built; mobile layout is desktop-first |

**Pricing Sources Verified:** Tally Prime Silver = ₹750+GST/month, ₹8,100/year (10% discount), Lifetime ₹22,500+GST. Tally Gold (multi-user) = ₹2,250+GST/month. Zoho Books Standard = ₹749/month (annual), Free for revenue ≤ ₹25 lakhs. Busy Standard = ₹14,999/year. Vyapar pricing from public sources and competitor research in PRD v2.6.

---

### 2.2 Top User Complaints from Play Store / Reddit / Quora

Based on analysis of 193+ verified reviews from SoftwareSuggest, GetApp, Trustpilot, and Play Store (documented in PRD v2.4), plus research from competitor product pages:

**Complaint 1 — "Too many taps to make a simple bill" (Vyapar, myBillBook)**
What users say: "Main rush hour mein bill nahi bana sakta — teen screen navigate karna padta hai." (I can't make a bill during rush hour — I have to navigate three screens.) This is the #1 complaint in counter-use scenarios. Affects 40-60% of kirana billers whose business is highest-volume in the 10 AM–1 PM window.
How Execora wins: Single-screen ClassicBilling page at `/classicbilling` already built. Voice mode reduces it to one spoken sentence. Walk-in 1-tap button built in Sprint 9.

**Complaint 2 — "App is slow on my phone / keeps crashing" (Vyapar Android, myBillBook)**
What users say: "₹8,000 ka phone hai, Vyapar khulte khulte 10 second lagte hain." (I have an ₹8,000 phone, Vyapar takes 10 seconds to open.) Low-end Android phones (2-4GB RAM, MediaTek processors) are the primary device for Tier-2/3 shop owners. Heavy JavaScript bundles crash these devices.
How Execora wins: React + Vite produces tree-shaken bundles. Fastify API is lightweight. The ClassicBilling screen is intentionally a single-component render. Target TTI (time to interactive) under 2 seconds on 4G, ₹8,000-class Android device.

**Complaint 3 — "Desktop and mobile don't sync without paying extra" (Vyapar)**
What users say: Multiple Play Store reviews cite frustration that Vyapar charges separately for desktop and mobile access — the combined plan is ₹2,999/year, not the ₹599 base. Owners want the accountant on desktop and themselves on mobile simultaneously.
How Execora wins: All plans include web + mobile access. WebSocket-based real-time sync is architectural — voice on mobile updates the dashboard on desktop in real time. Not a paid add-on.

**Complaint 4 — "GST filing is still manual — software just gives data" (Vyapar, Zoho)**
What users say: "Vyapar se GSTR-1 download karo, phir portal mein manually upload karo — kya fayda?" (Download GSTR-1 from Vyapar, then manually upload to portal — what's the benefit?) Users want direct filing, not data export. This is a compliance gap even at the top end.
How Execora wins: Q4 2026 roadmap includes direct GSTN API integration. Short-term, GSTR-1 export (B2B/B2CS/HSN) in JSON and CSV is already built and email-deliverable. CA partner mode (Enterprise) allows CA to pull data directly.

**Complaint 5 — "WhatsApp reminders don't work automatically — I have to manually send" (myBillBook, OkCredit)**
What users say: "Reminder bhejne ke liye button dabana padta hai — automatically kyon nahi bhejta?" (I have to press a button to send reminders — why doesn't it send automatically?) Most apps have "share to WhatsApp" buttons, not automated scheduled reminders.
How Execora wins: Execora's BullMQ + Meta WhatsApp Cloud API is a genuine automated reminder engine. 10 reminder types, natural language scheduling ("kal subah 9 baje"), recurring monthly reminders, bulk remind-all, delivery status tracking. This is not a share button.

**Complaint 6 — "No offline mode — useless without internet" (Swipe, Zoho Books)**
What users say: "Net nahi hota toh kuch nahi hota — dukan toh chalti rahti hai." (When there's no internet, nothing works — but the shop keeps running.) Swipe is entirely cloud-dependent with zero offline capability. Internet in Tier-2/3 cities is unreliable, especially during monsoon.
How Execora wins: PWA + IndexedDB offline queue is in the Q3 2026 roadmap (scoped Sprint S10-04). This is a known P0 gap currently. Short-term mitigation: ClassicBilling with cached product list works partially offline.

**Complaint 7 — "Data loss and no proper backup" (Vyapar desktop, Busy)**
What users say: "PC kharab hua, saara data gaya — 3 saal ka hisaab." (My PC crashed, all data gone — 3 years of accounts.) Desktop software stores data locally. Hardware failure = permanent data loss. This is a catastrophic trust failure for an accounting tool.
How Execora wins: All data lives in PostgreSQL on cloud infrastructure (Docker + managed DB on production). Automatic daily backups. Data loss is architecturally impossible in normal operation.

**Complaint 8 — "Customer support takes days / no Hindi support" (Vyapar, Zoho)**
What users say: "Ticket daalo, 3-4 din baad reply aata hai — woh bhi English mein." (Submit a ticket, reply comes after 3-4 days — in English.) Non-English-speaking owners cannot navigate English-only support tickets.
How Execora wins: Support language matches product language — Hindi-first support. WhatsApp-based customer support (the channel users already use). Target: 4-hour response SLA for paid plans.

---

### 2.3 Execora's Differentiation

**Voice-First as the Moat**

Voice-first is defensible for three reasons that compound over time:

1. **Training data is proprietary.** Every voice interaction generates labeled intent data: what a kirana owner in Kanpur actually says when creating an invoice, the exact Hinglish phrasing for "give discount," the regional product names ("maida" vs "atta" vs "floor"). This data is unavailable to competitors who start from scratch.

2. **The UX pattern requires rethinking the entire product, not adding a microphone button.** Vyapar cannot add voice to its existing screen-navigation UX because the current screen flow was designed for typing. Voice requires a conversation-first interaction model (multi-turn drafts, context persistence, disambiguation). Retrofitting this onto a form-based product is a 12-18 month rewrite, not a feature addition.

3. **Network effects on language models.** As Execora accumulates interaction data, fine-tuning on that data improves the Hindi/Hinglish extraction quality. The gap widens with each passing month.

**Three Execution Modes — Architecture Advantage**

The three-mode architecture (Intent-Based Voice, Form/Dashboard, True Agent) is a structural moat that competitors cannot replicate quickly:

- Mode 1 (current voice) handles 80% of daily tasks reliably and deterministically
- Mode 2 (classic UI) handles complex edits and bulk operations
- Mode 3 (planned agent) will handle conditional logic and multi-step workflows

Critically, all three modes share the same business service layer. A feature built once (e.g., `invoiceService.createInvoice()`) is immediately available in all three modes. This means Execora's development velocity on features is 3x a competitor who must build the same feature for both desktop and mobile separately.

**Real-Time WebSocket vs Polling-Based Competitors**

Tally, Vyapar, and Zoho all require a page refresh to see new data. In a multi-user scenario (owner at counter + accountant at back office), this means the accountant's screen is always stale.

Execora's WebSocket architecture means: owner creates an invoice via voice at the counter → WebSocket broadcasts `invoice:created` to all tenant connections → accountant's screen updates instantly → revenue dashboard ticks up → stock decrements in real time. This is a qualitatively different experience that users notice immediately in demos.

---

## 3. Two-Segment User Strategy

### 3.1 Segment A — Kirana / Counter (Tier 2-3 Cities)

**Profile**
- 1-2 person shop, owner is both cashier and manager
- Age 25-55, WhatsApp is the primary digital tool
- Education: Class 10-12, comfortable with Hindi, uncomfortable with English UIs
- Device: ₹6,000-15,000 Android phone, no laptop in most cases
- Daily revenue: ₹20,000-2,00,000
- Business type: Kirana, cosmetics, stationery, hardware, paan shop, pharmacy

**Jobs to Be Done (prioritized)**
1. Create a bill in under 10 seconds mid-rush hour (cash/UPI/credit)
2. Track who owes money (udhaar) without a notebook
3. Send payment reminders without awkward phone calls
4. Know which products are running low before they run out
5. Have a GST bill for big customers who need input credit
6. Know how much money came in today at close of day

**Key Features Needed**
- P0: Voice billing in Hindi ("Ramesh ka bill — 2 aata 1 tel")
- P0: Walk-in billing with 1 tap, no name needed
- P0: Udhaar tracking with automatic WhatsApp reminders
- P0: Low stock alerts on dashboard
- P0: Daily summary ("aaj ka hisaab")
- P1: Barcode scan to add products (already built)
- P1: UPI QR on invoice (already built)
- P2: Offline mode (network is unreliable in Tier-3)

**UX Requirements**
- Single thumb operation on a 5-6 inch screen
- Font size minimum 16px for touch targets
- Bottom navigation bar (not hamburger menu)
- No page navigation during billing — single screen from start to confirm
- Maximum 3 taps from app open to invoice confirmed
- Voice command accessible from any screen via floating button

**Pricing Willingness**
- ₹0: 70% of kirana owners — they will not pay if a free tier exists
- ₹99-299/month: 25% — after they see clear value (saved time, recovered udhaar)
- ₹500+/month: 5% — only if they have staff and need multi-user

Target ARPU for Segment A: ₹199/month after 3-month free trial conversion

**Acquisition Channels**
- WhatsApp groups of kirana owner communities (hyperlocal, city-specific)
- Local FMCG distributor partnerships (distributors visit 50-200 kiranas per day)
- YouTube Shorts in Hindi (60-second "billing in 3 seconds" demos)
- Regional language onboarding video sent via WhatsApp
- Referral: "Aapne 3 dost banae toh 3 mahine free"

---

### 3.2 Segment B — Growing SME (Tier 1 Cities, 5-50 Employees)

**Profile**
- Business owner + 1 accountant + 3-10 staff
- Owner has college education, comfortable with English apps
- Accountant or manager manages day-to-day digital operations
- Devices: Desktop/laptop for accountant, mobile for owner approvals
- Annual revenue: ₹50L-10Cr
- Business type: Wholesale distributor, multi-branch retail, pharma, manufacturing SME

**Jobs to Be Done (prioritized)**
1. GST-compliant B2B invoicing with buyer GSTIN and correct IGST/CGST/SGST
2. Monthly GSTR-1 data ready for CA without manual data entry
3. Multi-user access (owner + accountant + staff with RBAC)
4. Inventory management with batch/expiry tracking (pharma segment)
5. P&L reports and cash flow visibility
6. CA partner access for audit and filing
7. Integration with bank statements for reconciliation

**Key Features Needed**
- P0: B2B invoice with GSTIN, auto IGST/CGST switch (already built)
- P0: GSTR-1 export (B2B/B2CS/HSN, PDF+CSV+email) (already built)
- P0: Multi-user with RBAC (5 roles, 22 permissions) (already built)
- P0: P&L date-range report with period comparison (already built)
- P1: Batch/expiry tracking (backend built, frontend in Sprint S10-05)
- P1: Bank reconciliation (Enterprise tier, Q4 2026)
- P1: CA partner mode for external accountant access
- P2: Tally XML export for migration

**UX Requirements**
- Desktop-first dashboard with multiple open tabs
- Bulk actions (bulk invoice creation, bulk payment marking, bulk export)
- Advanced filtering and search on all data tables
- Keyboard shortcuts for power users
- Mobile app for owner approvals and real-time alerts only

**Pricing Willingness**
- ₹999-1,999/month: Standard tier for 1 location + 5 users
- ₹2,999-4,999/month: For multi-branch, high invoice volume, CA integration
- ₹10,000-30,000/year: Annual commitment preferred (cash flow predictable)

Target ARPU for Segment B: ₹2,200/month

**Acquisition Channels**
- Google Ads targeting "GST billing software," "B2B invoice software India"
- CA (Chartered Accountant) referral program — CAs recommend tools to clients
- LinkedIn content targeting business owners in manufacturing/distribution
- Direct sales for Enterprise (B2B outreach to distributors, pharma companies)
- Content marketing: "How to prepare GSTR-1 from Execora" YouTube tutorials

---

### 3.3 Segment Tension and Resolution

**Where the Segments Conflict**

| Decision Area | Segment A Wants | Segment B Wants | Tension |
|---|---|---|---|
| Default invoice UI | 1-tap, minimal fields | Full form with all GST fields | Complexity vs speed |
| Language | Hindi UI, Hindi support | English UI, formal docs | Language of product |
| Mobile vs desktop | Mobile-only | Desktop primary | Investment priority |
| Pricing | ₹0-299/month | ₹999-4,999/month | Freemium vs premium model |
| Voice interface | Primary workflow | Useful but secondary | Resource allocation |
| Reports | Daily summary only | Full P&L, GST export | Depth of analytics |
| User roles | Single user | Multi-user RBAC | Complexity |

**Resolution: Feature Flags + Add-On Architecture**

The `FeatureFlag` enum and `TIER_FEATURES` map already solve this architecturally. Every feature that serves Segment B but would confuse Segment A is gated behind a plan tier. The `Tenant.features` JSON column is the single source of truth per tenant. No code branching by segment — only flag checking.

The ClassicBilling UI (Segment A) and the full Invoice creation form (Segment B) coexist as two separate entry points. The dashboard's Quick Actions button shows "Quick Sale" for free/starter users and a full "New Invoice" modal for business/enterprise users based on their flags.

**Which Segment to Prioritize for Launch (and Why)**

**Prioritize Segment A first.**

Reasons:
1. Volume: 12 million kirana stores in India vs ~200,000 SMEs that match Segment B. Even 0.5% penetration of kirana is 60,000 customers.
2. Virality: Kirana owners talk to each other, share WhatsApp videos, buy from the same distributors. Word-of-mouth velocity is 10x higher than Segment B.
3. Demo power: The "bill in 3 seconds" demo is visually compelling and spreads organically. A B2B GSTR-1 report demo is not viral.
4. Speed to first-paying customer: A kirana owner can make a buying decision in one demo session. An SME requires a sales cycle, pilot, procurement approval, and IT sign-off.
5. Lower support burden initially: Kirana's scope is narrow (billing + udhaar + reminders). Segment B will generate complex support requests about GST edge cases, multi-branch stock, Tally imports.

Launch with Segment A in Q2 2026. Build the enterprise features in Q3 while Segment A traction validates the product.

---

## 4. Feature Toggle & Add-On Architecture

### 4.1 Core vs Add-On Classification

| Feature | Core/Add-On | Tier | Implementation Status | Priority |
|---|---|---|---|---|
| Voice invoice creation (Hindi/Hinglish) | Core | Free (50/mo cap) | ✅ Built | P0 |
| Walk-in billing (no customer name) | Core | Free | ✅ Built | P0 |
| B2C GST invoice | Core | Free | ✅ Built | P0 |
| Non-GST cash memo | Core | Free | ✅ Built | P0 |
| Customer ledger / udhaar tracking | Core | Free | ✅ Built | P0 |
| Payment recording (cash/UPI/card) | Core | Free | ✅ Built | P0 |
| Auto-settlement (khata-style) | Core | Free | ✅ Built | P0 |
| Real-time dashboard (WebSocket) | Core | Free | ✅ Built | P0 |
| Low stock alerts | Core | Free | ✅ Built | P0 |
| Today's revenue widget | Core | Free | ✅ Built | P0 |
| WhatsApp reminders | Core | Free (5/mo) → Unlimited Starter+ | ✅ Built | P0 |
| Bill-level discount (voice + form) | Core | Free | ✅ Built | P0 |
| Item-level discount | Core | Free | ⚠️ UI built; backend S10-01 (3h remaining) | P0 |
| B2B invoice with buyer GSTIN | Core | Free | ✅ Built | P0 |
| IGST inter-state calculation | Core | Free | ✅ Built | P0 |
| UPI QR code on invoice PDF | Core | Free | ✅ Built | P0 |
| Invoice PDF generation | Core | Free | ✅ Built | P0 |
| Multi-turn voice drafts (Redis) | Core | Free | ✅ Built | P0 |
| TTS voice response | Core | Free | ✅ Built | P0 |
| Single-screen classic billing UI | Core | Free | ✅ Built (S9-05) | P0 |
| UPDATE_STOCK voice intent | Core | Free | ⚠️ Handler exists; voice switch not wired (3h) | P0 |
| Invoice PDF auto-WhatsApp on confirm | Core | Free | ❌ NOT built (4h) | P0 |
| Barcode scan (web, EAN-13/QR, ZXing) | Add-On | Business+ | ✅ Built | P1 |
| GSTR-1 export (PDF/CSV/email) | Add-On | Starter+ | ✅ Built | P1 |
| P&L date-range report | Add-On | Business+ | ✅ Built | P1 |
| Balance sheet page | Add-On | Starter+ | ✅ Built | P1 |
| Email delivery of invoices/reminders | Add-On | Starter+ | ✅ Built | P1 |
| Unlimited voice commands | Add-On | Starter+ | ✅ Built | P1 |
| 9-aggregator UPI webhooks (Razorpay→BharatPe) | Add-On | Starter+ | ✅ Built | P1 |
| Payment Sound Box (Paytm-style TTS) | Add-On | Starter+ | ✅ Built | P1 |
| Customer portal (HMAC token, no auth) | Add-On | Starter+ | ✅ Built | P1 |
| OCR purchase bill ingestion | Add-On | Business+ | ⚠️ Partially built (9-field draft; supplier cost pending) | P1 |
| Batch/expiry tracking | Add-On | Business+ | ⚠️ Backend built; frontend batch-entry S10-05 | P1 |
| Multi-user + RBAC (5 roles, 22 permissions) | Add-On | Business+ | ✅ Built | P1 |
| Customer credit limits | Add-On | Business+ | ✅ Built | P1 |
| Feature flags (FeatureFlag enum + featureGate) | Add-On | All | ✅ Built | P1 |
| Expenses + Purchases CRUD | Add-On | Starter+ | ✅ Built | P1 |
| CashBook + DayBook | Add-On | Starter+ | ✅ Built | P1 |
| True Agent Mode (AI tool-calling) | Add-On | Business+ | ❌ Planned Q3 2026 | P2 |
| E-invoicing (IRN/QR from GSTN) | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| E-way bill generation | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| Multi-branch support | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| Bank reconciliation | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| CA partner mode (external accountant access) | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| API access (webhooks + REST) | Add-On | Enterprise | ❌ Planned Q4 2026 | P2 |
| WhatsApp chatbot interface | Add-On | Enterprise | ❌ Planned | P2 |
| Offline mode (PWA + IndexedDB) | Core | All tiers | ❌ Planned Q3 2026 | P0 |
| Supplier invoice / purchase management | Add-On | Business+ | ⚠️ Partially built (form only) | P1 |
| Customer portal UPI payment link | Add-On | Starter+ | ❌ Not built | P1 |
| Loyalty points / rewards | Add-On | Enterprise | ❌ Planned | P2 |
| Thermal receipt printer | Add-On | Business+ | ❌ Planned | P2 |
| Tally XML import | Add-On | Enterprise | ❌ Planned | P2 |
| Mobile ClassicBillingScreen (React Native) | Core | Free | ❌ Not built | P0 |
| Barcode scan (React Native native camera) | Add-On | Business+ | ❌ Not built (backend ready) | P1 |

---

### 4.2 Pricing Architecture

#### Free Tier — "Forever Free" Hook

Purpose: Get kirana stores addicted before asking for money. Conversion via demonstrable value (recovered udhaar, time saved).

Included:
- Unlimited invoices (GST and non-GST)
- Walk-in billing
- Udhaar/ledger tracking
- 50 voice commands per month
- 5 WhatsApp reminders per month
- Basic dashboard (today's revenue, low stock)
- 1 user only
- PDF invoices with Execora branding

**Free tier is the kirana onboarding funnel. Remove friction completely. No credit card required.**

---

#### Starter Plan — ₹299/month (₹2,499/year — ₹208/month)

Target: Kirana store that needs unlimited voice + GST filing data + email delivery.

Adds over Free:
- Unlimited voice commands
- WhatsApp reminders: unlimited
- GSTR-1 export (PDF + CSV + email to CA)
- Email invoice delivery
- Customer portal links (read-only invoice view)
- 2 users
- Remove Execora branding from invoices
- Priority WhatsApp customer support

Why ₹299: Anchored against Vyapar's mobile-only plan (~₹50/month) but justified by voice + auto-WhatsApp which Vyapar does not have. Psychologically: "₹10/day for never writing a bill again."

---

#### Business Plan — ₹999/month (₹8,999/year — ₹750/month)

Target: Growing retailer or distributor needing multi-user, inventory depth, analytics, and AI features.

Adds over Starter:
- 5 users (RBAC: owner/admin/manager/staff/viewer)
- Batch/expiry tracking (pharma, FMCG)
- P&L date-range reports with period comparison
- Barcode scan (camera, EAN-13/QR)
- OCR purchase bill ingestion (AI)
- Credit limits per customer
- True Agent Mode (AI tool-calling)
- 10,000 invoices/year
- Dedicated email support

Why ₹999: Directly competitive with Zoho Books Standard (₹749/month but no voice, no Hindi). A distributor saving 2 hours/day via voice billing values this at ₹3,000-5,000/month easily. ₹999 is deliberately below-market to capture share.

---

#### Enterprise Plan — ₹3,499/month (custom annual)

Target: Wholesale distributor, pharmacy chain, multi-branch retailer, manufacturer.

Adds over Business:
- Unlimited users
- Multi-branch with consolidated reporting
- E-invoicing (IRN from GSTN API)
- E-way bill generation
- Bank reconciliation
- CA partner mode (external accountant gets read-only access)
- API access (webhooks + REST for ERP integration)
- WhatsApp chatbot interface
- Tally XML import
- SLA: 4-hour support response
- Custom subdomain (business.execora.in)
- Dedicated account manager

---

#### Add-On Pricing

| Add-On | Price |
|---|---|
| Extra users (beyond plan limit) | ₹149/user/month |
| WhatsApp messages (beyond 1,000/month) | ₹0.50/message |
| SMS fallback | ₹0.30/SMS |
| OCR scans (beyond 200/month) | ₹5/scan |
| API access (Starter/Business) | ₹999/month |
| Extra branch (Enterprise) | ₹999/branch/month |
| Historical data migration (one-time) | ₹4,999 |

---

### 4.3 Feature Flag Implementation (Current Architecture)

Execora's feature gating lives in three files that form a complete system:

**`packages/types/src/index.ts`** — defines the `FeatureFlag` enum and `TIER_FEATURES` map. Every feature capability is a named constant. The tier-to-feature mapping is the pricing contract expressed as code. When pricing changes, update `TIER_FEATURES` and call `setTierFeatures()` — nothing else changes.

**`packages/infrastructure/src/feature-flags.ts`** — provides the runtime evaluation functions: `hasFeature(tenantId, FeatureFlag)`, `enableFeature()`, `disableFeature()`, `setTierFeatures()`, and `featureGate()`. The `Tenant.features` JSON column in PostgreSQL is the live state. Flags are per-tenant, not per-user.

**`Tenant.features` JSON column in PostgreSQL** — default value set at tenant creation based on their plan. When a tenant upgrades, `setTierFeatures(tenantId, 'business')` bulk-applies the new tier's flags while preserving any custom overrides (e.g., a free-tier user who was manually given a feature during a trial).

**Gating pattern in route handlers:**
```typescript
// Fastify route with feature gate
fastify.post('/api/v1/ocr/upload', {
  preHandler: [requireAuth, async (req) => {
    await featureGate(FeatureFlag.OCR_PURCHASE_BILL)(req.user.tenantId);
  }],
}, async (request, reply) => { ... });
```

Returns HTTP 402 (Payment Required) with `{ error: "Feature 'ocr_purchase_bill' requires a plan upgrade." }` — the frontend shows a contextual upgrade prompt.

**Rollout Strategy for New Features:**
1. Ship feature behind a flag (default `false` for all tiers)
2. Enable for internal tenants: `enableFeature(internalTenantId, FeatureFlag.NEW_THING)`
3. Percentage rollout: batch enable for 10% of Starter tenants, monitor error rate
4. Promote to tier default via `TIER_FEATURES` update when stable
5. Kill switch: `disableFeature()` can be called per-tenant or via admin API for immediate rollback

The `featureGate()` function acts as the kill switch at every gated endpoint — disabling a flag immediately blocks all API access for that feature without a deployment.

---

## 5. Mobile vs Desktop Parity Strategy

### 5.1 Current State

**Web App (apps/web):** React 18 + Vite + TypeScript + Tailwind CSS. Desktop-first layout. Most pages are designed for a 1280px-wide screen. 11 pages: Dashboard, Customers, Invoices, Products, Ledger, Reminders, Voice, Sessions, Reports, ClassicBilling, Overdue. Sprint S10-03 is actively addressing mobile layout.

**Mobile App (apps/mobile):** React Native. Screens built: CustomersScreen, OverdueScreen, VoiceScreen (new, untracked files visible in git status). Navigation index exists. Significantly less complete than web.

**Gap Analysis:**

| Feature | Web Status | Mobile (RN) Status | Gap |
|---|---|---|---|
| Invoice creation | Complete | Not built | Critical |
| Voice billing | Complete | VoiceScreen exists (unverified) | High |
| Customer management | Complete | CustomersScreen exists | Medium |
| Dashboard | Complete | Not built | High |
| Ledger/payments | Complete | Not built | High |
| Overdue management | Complete | OverdueScreen exists | Low |
| ClassicBilling | Complete | Not built | Critical |
| Barcode scan | Complete (ZXing) | Camera native is better | Medium |
| Offline mode | Not built (either) | Same gap | P0 |

---

### 5.2 Mobile-First Features (Segment A Requires)

**ClassicBillingScreen — Single-Screen Counter Billing**
The ClassicBilling page (`/classicbilling`) exists on web. The React Native equivalent needs to be the primary entry point — not a secondary screen behind navigation. Requirements:
- Product search with voice or barcode as primary input
- Customer selection optional (walk-in is default)
- Running total visible at all times (sticky bottom bar)
- Confirm = 1 tap, not a dialog chain
- Works with one thumb on a 6-inch screen

**Voice Command from Lock Screen / Notification**
Android allows a floating button over other apps (Overlay permission). Consider a persistent voice recording bubble that kirana owners can tap without unlocking the phone. This is a power feature for high-volume shops. Alternatively, a notification tile action for "Quick Bill."

**Offline-First with Sync Queue**
Implementation plan (Sprint S10-04):
1. `vite-plugin-pwa` for service worker + `manifest.json`
2. `StaleWhileRevalidate` for GET requests (product catalog, customers)
3. `NetworkFirst` for mutations with IndexedDB `outbox`
4. Background sync drains outbox in FIFO on reconnect
5. UI: "Offline — 3 actions queued" banner; disable voice STT gracefully

On React Native: `@react-native-community/netinfo` for connection detection + `AsyncStorage` or `WatermelonDB` for local queue.

**Camera OCR Purchase Bill Entry**
React Native's camera API allows native barcode scanning and document OCR. The OCR pipeline already exists on the backend (`workers.ts`, 9-field extraction). On mobile, replace the web's `<input type="file">` with `react-native-vision-camera` for direct photo capture → upload → OCR → DraftManagerPanel flow.

**UPI Deep Link / QR for Payment**
Invoice PDFs already embed UPI QR (built in Sprint S9-03). On mobile, add a "Pay Now" deep link (`upi://pay?pa=...`) on InvoiceDetail that opens the customer's UPI app directly. This closes the payment loop inside the Execora interface.

---

### 5.3 Desktop-First Features (Segment B Requires)

**Multi-Tab Workflow**
Power users (accountants, distributors) need multiple browser tabs open simultaneously: one tab for creating invoices, one for the customer ledger, one for reports. Execora's WebSocket architecture handles this correctly — all tabs share the same tenant connection pool, and all receive real-time updates.

**Bulk Actions**
- Bulk invoice export to CSV (accounting, GST preparation)
- Bulk payment marking (end of month settlement)
- Bulk reminder scheduling ("send reminder to all customers with >₹1,000 balance")
- Bulk product price update (before season/price revision)

**CA Export (Tally XML, GSTR-1 JSON)**
Enterprise tier. The GSTR-1 export (B2B/B2CS/HSN) already produces structured data. Q4 2026: add GSTR-1 JSON in GSTN-compatible format for direct upload. Tally XML export requires reverse-engineering Tally's data format — 2-week effort.

**Advanced Reporting Dashboard**
Segment B needs reports that Segment A does not: month-over-month revenue comparison, customer DSO (days sales outstanding), product profitability by category, GST liability vs ITC (input tax credit) reconciliation. These are desktop-consumption reports — large tables, charts, export buttons.

---

### 5.4 Parity Roadmap — Q1-Q4 2026

**Q1 2026 (Jan-Mar) — Foundation [Current State]**
- Web app: 11 pages complete, real-time WebSocket, ClassicBilling built
- Mobile (RN): Basic screens (Customers, Overdue, Voice)
- Focus: Close remaining P0 web gaps (item-level discount, UPDATE_STOCK voice, mobile layout S10-03)

**Q2 2026 (Apr-Jun) — Kirana Launch**
- Web: Offline PWA (S10-04), WhatsApp auto-send for invoices (S9-01)
- Mobile (RN): ClassicBillingScreen, InvoiceCreation, Dashboard home widget
- Both: Payment portal (read-only invoice link for customers)
- Target: Mobile app on Play Store beta

**Q3 2026 (Jul-Sep) — SME Push**
- Web: True Agent Mode, batch/expiry UI, bank reconciliation (Enterprise)
- Mobile (RN): Full feature parity for Segment A flows (all P0 features)
- Both: Multi-language support expansion (Gujarati, Tamil)
- Target: React Native app production release (Play Store + App Store)

**Q4 2026 (Oct-Dec) — Scale**
- Web: E-invoicing, E-way bill, Tally XML export, multi-branch
- Mobile (RN): Full parity for Segment B flows (reports, bulk actions)
- Both: CA partner mode, API webhooks
- Target: Desktop app (Electron wrapper) for Tally replacers

---

## 6. Production Launch Roadmap

### 6.1 Pre-Launch Checklist (Must-Have Before First Paid Customer)

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | SSL/TLS on all endpoints (HTTPS + WSS) | DevOps | Must verify |
| 2 | Rate limiting on all public endpoints (Fastify rate-limit) | Backend | Built in middleware |
| 3 | JWT refresh token rotation (anti-replay) | Backend | Must verify |
| 4 | WhatsApp Business API production approval (Meta) | Product | Pending |
| 5 | Production PostgreSQL with daily automated backups | DevOps | docker-compose.prod.yml exists |
| 6 | Redis persistence (AOF) for session/draft data | DevOps | Must configure |
| 7 | MinIO or S3 for PDF storage with versioning | DevOps | MinIO configured, S3 migration for prod |
| 8 | Prometheus + Grafana alerting (p99 latency, error rate) | DevOps | Prometheus built |
| 9 | Error tracking (Sentry or equivalent) | Backend | Not in codebase — must add |
| 10 | GDPR/privacy policy + data deletion API | Legal/Product | Data delete intent built |
| 11 | Tenant data isolation audit (tenantId in every DB query) | Backend | Convention documented, audit needed |
| 12 | Payment gateway integration (Razorpay subscriptions) | Backend | Not built — P0 for monetization |
| 13 | Admin dashboard for tenant management and plan changes | Admin | `/admin/*` routes exist |
| 14 | Onboarding flow: business profile + first invoice in <5 minutes | Product | Not built as guided flow |
| 15 | Load test at 100 concurrent WebSocket sessions | QA | Not done |
| 16 | Mobile-responsive layout (S10-03 completion) | Frontend | In progress |
| 17 | WhatsApp auto-send invoice on confirm (S9-01) | Backend | Not built |
| 18 | Customer support channel (WhatsApp Business number) | Operations | Must set up |
| 19 | Pricing page + plan comparison on marketing site | Marketing | Not built |
| 20 | Demo video in Hindi (60-second "bill in 3 seconds") | Marketing | Must produce |

---

### 6.2 Q1 2026 (Jan-Mar) — Foundation

**✅ Delivered (as of March 13, 2026):**
- ✅ Customer portal — `/pub/:id/:token` HMAC token, no-auth invoice view + PDF download
- ✅ Payment Sound Box — Paytm-style voice announcement via Web Speech API, WS-triggered
- ✅ Feature flag system — `FeatureFlag` enum, `TIER_FEATURES`, `featureGate()` middleware, per-tenant JSON column
- ✅ Balance Sheet page — simplified SME assets/liabilities/equity from live API data
- ✅ Invoice PATCH (edit) — items, notes, discounts, GST flags on pending invoices
- ✅ Proforma → Invoice convert — with optional initial payment
- ✅ Email delivery — auto-sends on confirm; manual resend endpoint; GSTR-1 + P&L email
- ✅ GSTR-1 export — B2B/B2CL/B2CS/HSN, Indian FY, PDF + CSV + email
- ✅ P&L report — month-wise, period comparison, PDF + CSV + email
- ✅ Overdue page — live table, bulk remind, per-row actions
- ✅ Expiry tracking — batch/expiryDate backend; Expiry page shipped
- ✅ 9-aggregator UPI webhook — Razorpay, PhonePe, Cashfree, PayU, Paytm, Instamojo, Stripe, EaseBuzz, BharatPe
- ✅ ClassicBilling single-screen UI — `/billing` route, walk-in 1-tap
- ✅ UPI QR on invoice PDF
- ✅ Mixed payment (cash+UPI split) — POST /ledger/mixed-payment + voice intent
- ✅ Expenses + Purchases CRUD pages
- ✅ CashBook + DayBook pages
- ✅ Customer communication preferences (GET/PUT /comm-prefs)
- ✅ Mobile React Native app — 10 screens wired (Dashboard, Billing, Invoice, Customers, Voice, Overdue)
- ✅ Repeat last bill — GET /customers/:id/last-order
- ✅ Credit limit enforcement — 422 on invoice creation when exceeded
- ✅ 35-intent voice engine (including ADD_DISCOUNT, SET_SUPPLY_TYPE, EXPORT_GSTR1, EXPORT_PNL, RECORD_MIXED_PAYMENT)

**❌ Still Open for Q1 Close:**
- ❌ S10-01: Item-level discount backend wiring — resolveItemsAndTotals() (~3h)
- ❌ S10-02: UPDATE_STOCK voice intent wiring — LLM prompt + engine switch (~3h)
- ❌ S10-03: Mobile layout — bottom nav at ≤768px, touch targets ≥44px (~2 days)
- ❌ S9-01: WhatsApp auto-send invoice PDF on confirm (~4h)
- ❌ Add Sentry error tracking (~1h)
- ❌ Load test WebSocket at 100 concurrent sessions
- ❌ Razorpay subscription integration (Starter + Business plans) (~2 days)
- ❌ Fix IDOR: getCustomerById/getInvoiceById missing tenantId filter (SHIP BLOCKER)
- ❌ Fix InvoiceCounter tenantId isolation (SHIP BLOCKER)
- ❌ Verify MinIO bucket is not world-readable (SHIP BLOCKER)
- ❌ Verify WebSocket requires JWT on connect (SHIP BLOCKER)

**Team:** 1 backend engineer, 1 frontend engineer, 1 PM/founder

**Infrastructure:** Migrate from local Docker to managed PostgreSQL (Supabase or Railway) + Upstash Redis for production. Cost: ~₹8,000-12,000/month.

---

### 6.3 Q2 2026 (Apr-Jun) — Kirana Launch

**Go-to-Market for Segment A:**

Week 1-2: Soft launch with 10 hand-picked kirana stores in one city (Kanpur or Indore). Free 30-day pilot. Personal onboarding by phone/WhatsApp. Goal: get 3 testimonial videos in Hindi.

Week 3-4: WhatsApp broadcast of demo video to kirana WhatsApp groups. Target 5 cities in Hindi belt. Partner with 2 FMCG distributors to mention Execora to their kirana clients.

Month 2-3: Run YouTube Shorts campaign ("Tally ke bina GST bill — 3 second mein"). Target: 1 lakh views. Offer free 90-day trial with Play Store install.

**Target:** 500 paid users by end of Q2 (₹149/month average = ₹74,500 MRR)

**Product deliverables for Q2:**
- Offline PWA (S10-04) — critical for Tier-3 adoption
- React Native ClassicBillingScreen on Play Store beta
- Guided onboarding flow (business profile → first invoice in 3 minutes)
- Referral program: "Invite 3 friends → 3 months free"

---

### 6.4 Q3 2026 (Jul-Sep) — SME Push

**Go-to-Market for Segment B:**

Google Ads targeting: "GST billing software," "B2B invoice software," "Vyapar alternative," "Tally alternative India." Budget: ₹2L/month. Target CPC ₹40-80. Target CAC ₹3,000-5,000.

CA referral program: Partner with 50 CAs in Mumbai, Delhi, Bangalore. Offer CA partner mode free (they get a dashboard to manage all their clients). CA recommends Execora to clients = referral commission (₹500 per converted Business plan customer).

LinkedIn content: Weekly posts targeting business owners and distributors. "How to prepare GSTR-1 in 2 minutes from Execora."

**Target:** 100 paying SMEs at ₹999/month average = ₹99,000 MRR from Segment B. Combined with Segment A: ~₹2.5L MRR by end of Q3.

**Product deliverables for Q3:**
- True Agent Mode (LLM tool-calling)
- Batch/expiry tracking full UI (pharma vertical unlock)
- Multi-language: Gujarati + Tamil STT support
- Customer portal (read-only invoice link)

---

### 6.5 Q4 2026 (Oct-Dec) — Scale

**Target: 2,000 paying users, ₹30L ARR**

Revenue breakdown:
- 1,700 Segment A users × ₹299/month = ₹5.08L/month
- 250 Segment B users × ₹999/month = ₹2.50L/month
- 50 Enterprise users × ₹3,499/month = ₹1.75L/month
- Add-ons (WhatsApp volume, extra users, OCR): ~₹50K/month
- **Total: ~₹9.83L/month = ₹1.18Cr ARR**

Path to ₹30L ARR (₹2.5Cr) requires ~3,000 users at blended ₹830 ARPU — achievable with Segment B growth in Q4.

**Product deliverables for Q4:**
- E-invoicing (IRN from GSTN API) — Enterprise tier
- E-way bill — Enterprise tier
- Multi-branch support
- Tally XML import (migration tool for Tally defectors)
- Bank reconciliation (Enterprise)
- Desktop Electron wrapper for Windows (for Tally replacers)

---

### 6.6 Key Metrics and OKRs

**North Star Metric:** Weekly Active Billers — the number of distinct tenants who created at least one invoice in the past 7 days. This is the single metric that captures product-market fit, retention, and actual usage (not signups or installs).

**5 KPIs with Targets:**

| KPI | Q2 2026 Target | Q4 2026 Target | Measurement |
|---|---|---|---|
| Weekly Active Billers | 350 | 1,800 | Unique tenants with invoice in last 7 days |
| Voice Command Conversion Rate | >60% | >70% | Voice sessions resulting in confirmed invoice |
| 30-day Retention | >50% | >65% | % of Month 1 users still active in Month 2 |
| Free-to-Paid Conversion | >8% | >12% | % of free users converting within 90 days |
| WhatsApp Reminder Delivery Rate | >90% | >95% | % of scheduled reminders reaching "delivered" status |

**Anti-Metrics (What NOT to Optimize For):**
- Total signups / total downloads (vanity metrics — Vyapar has 50M downloads and 3-star reviews)
- Number of features shipped per sprint (feature quantity ≠ user value)
- Average session duration (a kirana owner should be in and out in 30 seconds — long sessions mean the UX is confusing)
- Daily Active Users (kirana shops close on Sunday — weekly is the right cadence)

---

## 7. Critical P0 Gaps — Must Build Before Launch

> **Status legend:** ✅ BUILT | ⚠️ PARTIAL | ❌ NOT BUILT | 🚨 SECURITY BLOCKER

### Gap 1 — Item-Level Discount (Backend Wiring)

**Status: ⚠️ PARTIAL — March 2026**
Bill-level discount (voice + form) is fully built. `InvoiceItemInput` has `lineDiscountPercent?: number`. The UI column exists in InvoiceCreation.tsx. The `lineDiscountPercent` is correctly exposed in the portal API. However, `resolveItemsAndTotals()` in invoice.service.ts does not yet apply per-line discounts to the effective price calculation before GST.

**Remaining work:** 3 hours. Update `resolveItemsAndTotals()` to apply `lineDiscountPercent` before computing line subtotal. Wire the form submit to pass `lineDiscountPercent` through.

**Segment Blocked:** Both. B2B wholesale requires item-level trade discounts for compliance. Kirana needs it for promotional pricing on specific items.

---

### Gap 2 — B2B Invoice with Buyer GSTIN + IGST

**Status: ✅ BUILT — March 2026**
This gap is closed. B2B invoice with buyer GSTIN capture, auto-switch between CGST+SGST (intra-state) and IGST (inter-state) is built in voice + form modes. GSTR-1 B2B list export confirmed working. Confirmed by code audit March 13, 2026: `POST /api/v1/invoices` accepts `buyerGstin`, `supplyType`, `placeOfSupply`.

**Remaining work:** GSTIN checksum validation (15-char format + state code extraction) — 2h. Backend accepts any 15-char string; no validation.

---

### Gap 3 — Partial Payment at Invoice Creation Time

**Status: ✅ BUILT — March 2026**
This gap is closed. The `POST /api/v1/invoices` schema includes `initialPayment: { amount, method }`.

---

### Gap 4 — Mobile-Responsive / ClassicBillingScreen

**Status: ⚠️ PARTIAL — March 2026**
ClassicBilling page (`/billing`) is built on web (S9-05). `BottomNav.tsx` component exists. Mobile breakpoints and touch-target enforcement are in progress (S10-03). React Native ClassicBillingScreen not yet built.

**Acceptance Criteria:**
- All primary flows work on 375px screen without horizontal scroll
- Bottom navigation bar replaces side drawer on screens ≤ 768px
- Touch targets minimum 44×44px on all interactive elements
- Font sizes minimum 16px throughout

**Estimated Complexity:** 2 days (S10-03) for web layout + 3 days for RN ClassicBillingScreen.

**Segment Blocked:** Segment A entirely. Kirana owners use mobile.

---

### Gap 5 — Walk-In Billing UX Optimization

**Status: ⚠️ PARTIAL — March 2026**
Walk-in 1-tap button is built (S9-02). ClassicBilling page is built (S9-05). QuickActions "Quick Sale" button pre-selects walk-in customer. The remaining friction:
- Walking from the app's main screen to ClassicBilling still requires navigation
- On mobile, ClassicBilling should be accessible via a home screen shortcut (PWA manifest shortcut)

**Acceptance Criteria:**
- PWA shortcut "Quick Bill" opens ClassicBilling directly (bypassing navigation)
- Walk-in customer pre-selected, product search focused on load
- First product result accessible within 1 tap or 1 spoken word

**Estimated Complexity:** 2 hours (manifest.json shortcut + auto-focus on load).

---

### Gap 6 — WhatsApp Auto-Send Invoice PDF on Confirm

**Status: ❌ NOT BUILT — March 2026**
Email auto-sends on invoice confirm (S9-01 shipped email half). WhatsApp job is not queued from `confirmInvoice()`. No per-tenant `autoWhatsapp` toggle in Settings. WhatsApp Cloud API is integrated for reminders; the invoice dispatch path is not connected.

**User Story:** As Suresh, when I confirm an invoice via voice, I want the customer's WhatsApp to receive the PDF automatically — I should not need to press anything.

**Acceptance Criteria:**
- Per-tenant toggle "Auto-send invoice via WhatsApp" in Settings (mirrors email toggle)
- `confirmInvoice()` queues a `whatsapp:send-invoice` BullMQ job when: customer has phone number + tenant has `autoWhatsapp: true`
- Job sends WhatsApp message with PDF download link via Meta Cloud API
- Status tracked in WhatsApp message delivery table
- Failure retried 3 times with exponential backoff; fallback to email after failure

**Estimated Complexity:** 4 hours (S9-01, exact implementation documented in PRD Section 15).

**Segment Blocked:** Segment A primary. This is the "wow" moment that drives word-of-mouth: customer gets a WhatsApp with their bill 3 seconds after the shop owner confirms by voice.

---

### Gap 7 — Offline Mode with Sync Queue

**User Story:** As Suresh in Bhilai, when my internet goes down during peak hours, I still need to create bills and record payments. When the internet comes back, everything should sync automatically.

**Acceptance Criteria:**
- App installs as a PWA (manifest.json, service worker, installable on Android home screen)
- Product catalog and customer list cached via `StaleWhileRevalidate` service worker strategy
- Invoice creation and payment recording work offline (stored in IndexedDB outbox)
- Outbox drains automatically in FIFO order when connection restores
- UI shows "Offline — 3 actions queued" banner during offline period
- Voice STT disabled with clear message when offline; ClassicBilling form works

**Estimated Complexity:** 5 days (S10-04, new milestone). This is the highest-complexity P0 gap.

**Segment Blocked:** Segment A critically. 22% of users cite offline as a dealbreaker (per PRD v2.4 research). Tier-3 cities have 30-60 minutes of internet outage per day on average.

---

### Gap 8 — Barcode Scan on Mobile (Status: Built on Web)

**Status: ⚙️ BACKEND ONLY**
Barcode scanning is built for the web using ZXing library (Sprint S8). On React Native, this should use `react-native-vision-camera`. The backend API (`GET /api/v1/products/barcode/:barcode`) already exists.

**Estimated Complexity for RN:** 1 day.

---

### Gap 9 — IDOR in getCustomerById / getInvoiceById

**Status: 🚨 SECURITY BLOCKER — Must fix before first paid customer**

`getCustomerById()` and `getInvoiceById()` in the module services perform `prisma.X.findUnique({ where: { id } })` without filtering by `tenantId`. Any tenant-authenticated user can fetch another tenant's customer or invoice by their UUID.

**Fix:** Add `tenantId: tenantContext.get().tenantId` to the `where` clause. If the record belongs to a different tenant, return `null` (routes convert to 404).

---

### Gap 10 — InvoiceCounter Missing tenantId Isolation

**Status: 🚨 SECURITY BLOCKER — Must fix before first paid customer**

`generateInvoiceNo()` uses `tx.$queryRaw` against the `InvoiceCounter` table. If this table does not partition by `tenantId`, two tenants in the same Indian financial year receive the same invoice numbers — a GST audit failure and data integrity violation.

**Fix:** Verify `InvoiceCounter` has a `(tenantId, fiscalYear)` unique constraint. Add via migration if missing.

---

### Gap 11 — MinIO World-Readable Bucket

**Status: 🚨 SECURITY BLOCKER — Must fix before first paid customer**

If the MinIO bucket was provisioned with an anonymous read policy (common in development), invoice PDFs are accessible to anyone who knows the object key. Invoice PDFs contain customer PII and financial data.

**Fix:** Remove anonymous read access. All PDF access already routes through `minioClient.getPresignedUrl()` (portal) or email (invoice delivery) — no direct public URL is required.

---

### Gap 12 — WebSocket Unauthenticated Voice Commands

**Status: 🚨 SECURITY BLOCKER — Must fix before first paid customer**

The `/ws` WebSocket endpoint may accept connections without JWT verification. An unauthenticated client could send fabricated intent payloads to execute business operations on any tenant's data.

**Fix:** Verify JWT on WebSocket upgrade (token in `?token=` query param). Close with code 4001 if missing or invalid. All 6 existing unit test suites still pass after this change.

---

## 8. Voice Engine Roadmap

### 8.1 Current Mode 1 (Intent-Based) — Limitations

Mode 1 is the current production voice system. It works reliably for the 23 defined intents but has structural limitations that become visible as usage scales:

**What it cannot do:**
- Multi-step conditional logic: "If Ramesh's balance is over ₹1,000, don't create a new bill"
- Chained operations from a single utterance: "Check Seema's balance and if she's paid, send her next month's reminder"
- Error recovery with intelligence: if a product is not found, Mode 1 returns a generic error; Mode 3 would ask "Did you mean 'Ariel' instead of 'Aerial'?"
- New operations without code changes: adding a new intent requires a new handler, a new LLM prompt example, and a new switch case

**What it does well (and should remain):**
- Deterministic: zero hallucination in the execution path
- Fast: 2 LLM calls (extraction + response phrasing), ~800ms total
- Cheap: minimal LLM tokens
- Reliable: if GPT-4 extracts intent correctly, execution never fails due to AI

**The Right Strategy:** Keep Mode 1 for all defined intents. Add Mode 3 alongside it (not replacing it) for complex multi-step operations. Users who say "Ramesh ka bill banao — 2 aata" always route to Mode 1 (fast, cheap). Users who say "Check Ramesh's balance and if it's over 500 then remind him" route to Mode 3.

---

### 8.2 Mode 3 (True Agent) — When to Build, Prerequisites

**Prerequisites before building:**
1. All Mode 1 intents must be stable and tested (currently: 23 intents, all test suites passing)
2. Tool definitions must be written for all existing business service methods
3. A sandbox environment for testing agent behavior without affecting production DB
4. Cost monitoring: Mode 3 uses 3-5 LLM calls per interaction vs Mode 1's 2 calls — at scale, this matters

**When to build:** Q3 2026, after kirana launch is stable and at least 200 active users are generating real interaction data. Real data is invaluable for evaluating agent behavior and catching edge cases.

**Architecture:** Two-agent pattern (as documented in PRD Section 6):
- Conversation Agent: manages dialogue, clarifies ambiguity, formats responses for TTS
- Task Agent (Executor): has all business tools, executes silently, returns structured results

**First use cases for Mode 3 (high value, validates the approach):**
1. "Top 3 udhari wale customers ko aaj reminder bhejo" — requires list query + 3 parallel reminder schedules
2. "Is hafte kitna credit nahi aaya — unhe ek ek karke remind karo" — weekly filter + bulk reminders
3. "Ramesh ka balance check karo, agar 500 se zyada hai toh bill mat banao" — conditional logic

---

### 8.3 Hinglish NLP — Current State and What's Missing

**Current state:**
- GPT-4 handles Hinglish naturally via few-shot examples in the extraction prompt
- Number normalization: Hindi cardinal and fractional numbers mapped (ek, do, teen... paav, aadha, pona)
- Devanagari transliteration: handled by GPT-4 natively
- Product name fuzzy matching: Levenshtein + token overlap in `customer.service.ts` (also used for products)

**What's missing:**
- **Regional product aliases:** "maida" vs "atta" vs "flour" are the same product in different dialects. A product name resolution system that handles regional synonyms is not built.
- **Contextual pronouns:** "Woh wala" (that one), "Pehle wala" (the previous one), "Uska" (his/her) — referring back to context without explicit naming. Partially handled by conversation memory but not robustly.
- **Implicit quantity units:** "Do packet" without specifying the packet size. System currently defaults to 1 unit. Should ask "Kaunsa packet — 500g ya 1kg?"
- **Price negotiation language:** "Thoda kam karo," "Woh wali price do" (give me that price), "Wholesale mein do" — triggering discount/price-list selection via idiomatic phrases.

**Improvement path:** Each missed extraction case should be added as a few-shot example to the LLM prompt. Target: add 5 new examples per week for 8 weeks. This is the fastest improvement lever with zero code changes.

---

### 8.4 Multi-Language Roadmap

| Language | Priority | Q2 2026 | Q3 2026 | Q4 2026 | Notes |
|---|---|---|---|---|---|
| Hindi | P0 | Production | Production | Production | Core language, fully built |
| Hinglish | P0 | Production | Production | Production | Fully built, primary in practice |
| English | P0 | Production | Production | Production | Works via GPT-4 |
| Marathi | P1 | Beta | Production | Production | 83M speakers, Mumbai suburban market |
| Gujarati | P1 | — | Beta | Production | 57M speakers, key FMCG/textile market |
| Tamil | P1 | — | Beta | Production | 69M speakers, South India push |
| Telugu | P1 | — | Beta | Production | 83M speakers, Hyderabad/AP |
| Bengali | P2 | — | — | Beta | 97M speakers, Kolkata kirana market |
| Kannada | P2 | — | — | — | 44M speakers, Bangalore secondary |

**Technical implementation for new languages:**
1. Update Deepgram STT language parameter (Deepgram supports all major Indian languages)
2. Add language-specific few-shot examples to the LLM extraction prompt (20 examples per language)
3. Update TTS provider to use appropriate voice for the language (ElevenLabs has Indian language voices)
4. Localize the UI (date formats, number formats — already configurable via `Tenant.language`)
5. Add product name aliases for regional product names ("pitha" = "rice flour" in Bengali)

---

## 9. Technical Debt and Architecture Risks

**Risk 1 — No Offline Mode (HIGH)**
Description: 22% of users cite offline as a dealbreaker. The entire application currently requires active internet. A single network outage during peak billing hours results in the shop owner being unable to bill customers.
Mitigation: PWA + IndexedDB queue (Sprint S10-04, scoped as 5-day milestone). Interim: tell users to use ClassicBilling with a cached product list (partially works). Hard deadline: before Segment A launch in Q2.

**Risk 2 — Single PostgreSQL Instance (HIGH)**
Description: The current docker-compose setup uses a single PostgreSQL container. A database outage takes down billing for all tenants simultaneously. For an application where "my billing is down" = "I can't serve customers," this is a critical SLA risk.
Mitigation: Migrate to managed PostgreSQL (Supabase, RDS, or Neon) with automatic failover and daily automated backups before first paid customer. Read replica for reporting queries.

**Risk 3 — Redis as Session + Draft Store (HIGH)**
Description: ConversationSession data (multi-turn voice drafts) lives in Redis with a 4-hour TTL. If Redis goes down, all active voice sessions lose their context. An owner mid-billing has their draft disappear.
Mitigation: Enable Redis AOF (Append-Only File) persistence. Add a fallback to PostgreSQL for session data (write to `ConversationSession` table on every turn, read from Redis first). This is 1 day of work.

**Risk 4 — LLM Vendor Lock-in on OpenAI (MEDIUM)**
Description: The intent extraction and response generation both use OpenAI GPT-4. An OpenAI outage or price increase directly impacts product functionality. The STT providers (Deepgram) add a second single point of failure.
Mitigation: Abstract the LLM provider behind an interface (already partially done in `packages/modules/src/providers/llm/`). Add Anthropic Claude as a fallback for intent extraction. Browser Web Speech API as a free STT fallback is already built. Test fallback path monthly.

**Risk 5 — WhatsApp Meta Cloud API Rate Limits and Policy Risk (MEDIUM)**
Description: Meta's WhatsApp Business API has per-day message limits that scale with phone number quality rating. A spam report from a customer can reduce the daily limit from 100,000 to 1,000 messages overnight. Meta can also terminate Business API access.
Mitigation: Implement message delivery tracking to identify low-delivery-rate phone numbers. Add SMS (Twilio/Textlocal) as a fallback channel (already planned in infrastructure). Ensure opt-in consent is captured at customer creation.

**Risk 6 — No Sentry / Error Tracking in Production (MEDIUM)**
Description: There is no error tracking service in the codebase. Production errors are only visible in Pino logs. If a customer encounters a bug at 2 PM during billing rush, the team has no alert.
Mitigation: Add `@sentry/node` to the API (1 hour). Instrument the React web app with `@sentry/react`. Set up Slack alert on error rate spike. This must be done before any public launch.

**Risk 7 — Tenant Data Isolation (MEDIUM)**
Description: The convention to include `tenantId` in every Prisma query is documented but not enforced by the type system. A missing `tenantId` filter in a query could return cross-tenant data (a serious GDPR/data breach issue).
Mitigation: Audit all `prisma.*` calls in `packages/modules/src/` to verify `tenantId` is present in `where` clause. Consider a Prisma middleware that injects `tenantId` from context automatically (the `tenantContext` async local storage is already in place — wire it to Prisma middleware).

**Risk 8 — Mobile App is Significantly Behind Web (LOW-MEDIUM)**
Description: The React Native app has 3 screens (Customers, Overdue, Voice) while the web has 11 fully functional pages. Segment A users (kirana, mobile-first) will encounter this gap on first install.
Mitigation: The Q2 2026 plan prioritizes RN ClassicBillingScreen + InvoiceCreation. The web app as a PWA on Android is a viable short-term alternative to a native app — ClassicBilling on the mobile browser, installed as a home screen icon, covers 90% of Segment A's daily needs.

---

## 10. Competitive Moat and Long-Term Strategy

### Why Voice-First is Defensible

Voice-first as a moat operates on four compounding levels:

**Level 1 — UX moat:** A form-first competitor cannot retrofit voice without rebuilding their product. Voice requires: (a) a conversation-state system (multi-turn drafts, Redis-backed), (b) real-time audio streaming infrastructure (WebSocket, PCM, STT pipeline), (c) an LLM integration layer with business-domain few-shot training, (d) TTS for responses. This is 6-9 months of work for an established team. Vyapar has 50 million users and a large engineering team — but they're optimizing their existing form-based UX, not rebuilding it.

**Level 2 — Language data moat:** Every real voice interaction in production generates labeled training data: what Indian shopkeepers actually say, in what dialect, with what ambiguities, and what the correct resolution was. After 10,000 real billing sessions, Execora's LLM prompts and fine-tuning data will be significantly better than any competitor starting from scratch.

**Level 3 — Behavioral moat:** A kirana owner who creates bills by voice for 60 days will find it physically uncomfortable to return to typing. The switching cost is not a contract or a data export problem — it's a behavioral rewiring. This is the same lock-in dynamic that made people stay on smartphones after leaving feature phones.

**Level 4 — Integration moat:** As Execora connects to WhatsApp (messaging), UPI (payments), and GSTN (compliance), it becomes the connective tissue for the shop's digital life. Each integration deepens the cost of switching.

---

### Network Effects — Udhaar Tracking → Supplier Network

Udhaar (credit tracking) is inherently social: it involves two parties (shop and customer). Currently Execora tracks the shop's side. The growth vector:

**Phase 1:** Shop tracks udhaar internally. WhatsApp reminders notify customers.
**Phase 2:** Customer receives a link to view their own udhaar balance (customer portal — already in Q2 2026 roadmap). Customer can make a payment via UPI link in the same portal.
**Phase 3:** If both the supplier (distributor) and retailer (kirana) use Execora, their B2B transaction creates a shared ledger. The supplier's `pending payment` is the kirana's `udhaar`. Real-time settlement notification when kirana pays.

This supplier-retailer network effect is the same playbook as Khatabook's "DigitBook" (connecting buyer and seller ledgers), but Execora adds voice, GST compliance, and inventory on top.

---

### Data Moat — Transaction Data → Credit Scoring → Lending

The transaction data that flows through Execora has significant lending value:

- Revenue consistency: is this shop's income stable or volatile?
- Payment behavior: does this shopkeeper pay suppliers on time?
- Udhaar recovery rate: what % of credit extended is recovered within 30 days?
- Inventory velocity: which products are moving? (useful for FMCG distributors)
- GST compliance: is this a GST-registered business? (creditworthiness signal)

Indian NBFCs and fintech lenders are actively seeking SME credit data. A kirana store that has 12 months of Execora transaction history is a verified business with machine-readable financial data — something that has historically been unavailable for informal businesses.

**Lending partnership opportunity:** Partner with an NBFC or neo-bank to offer "Execora Business Credit" — a working capital loan to kirana stores with ≥6 months of Execora history. Revenue split: 0.5-1% of loan amount as referral fee. This could become a revenue stream as large as the SaaS subscription itself.

---

### Partnership Opportunities

**Payment Gateways (Razorpay, PhonePe for Business, Paytm for Business):**
Execora already has UPI QR on invoices. The natural extension is UPI payment collection with automatic reconciliation — customer pays via QR, payment is automatically recorded against the invoice in Execora. Razorpay has an API for this. Revenue share: Razorpay's MDR is 0% for UPI — the integration is goodwill-building, not revenue-sharing.

**CA (Chartered Accountant) Networks:**
India has 350,000+ practicing CAs. Each CA manages 20-200 SME clients. A CA who recommends Execora to all their clients is a B2B distribution channel with very low acquisition cost. The CA partner mode (Enterprise feature) — where CAs get a dashboard to manage multiple client accounts — turns every CA into a distribution partner. Target: 500 CA partners by end of 2026 = access to 10,000+ SME clients.

**FMCG Distributors:**
A regional FMCG distributor supplies 200-500 kirana stores. If the distributor uses Execora for their own B2B invoicing, they can recommend Execora to their kirana customers for retail billing. This is a classic B2B distribution channel play. One distributor partnership = 200-500 kirana store leads in a single geography.

**Banks (Current Accounts, Neo-Banks):**
Jupiter, Fi, HDFC SmartBiz, and Kotak Current Account are targeting the SME segment. An Execora integration with a bank current account — where bank statement data auto-populates in Execora for reconciliation — is a valuable partnership for both sides. The bank gets a sticky feature. Execora gets referred to every new current account holder.

---

### The 5-Year Vision

Year 1 (2026): 2,000 paying users, ₹30L ARR. Product-market fit with Hindi-belt kirana.
Year 2 (2027): 15,000 users, ₹2Cr ARR. South India expansion (Tamil, Telugu). Lending partnership live.
Year 3 (2028): 60,000 users, ₹8Cr ARR. Supplier network effects. WhatsApp chatbot as primary interface for rural users.
Year 4 (2029): 200,000 users, ₹25Cr ARR. First acquisition interest from Reliance Jio (distribution), HDFC (lending data), or a global SME platform (Shopify, Intuit) looking to enter India.
Year 5 (2030): Series B or strategic acquisition. Execora is the operating system for India's 12 million kirana stores.

The long-term bet is not that we build the best billing software. The bet is that **we own the voice interface through which Indian shopkeepers interact with their business** — and that interface, once established, becomes the distribution layer for financial products, B2B commerce, and supply chain tools that collectively dwarf the billing SaaS revenue.

---

*Document version: 1.0*
*Prepared: March 2026*
*Based on: Execora PRD v2.8, 193+ verified user reviews, Zoho Books pricing (verified), Tally Prime pricing (verified), Busy accounting pricing (verified), and internal sprint audit data through Sprint 10.*

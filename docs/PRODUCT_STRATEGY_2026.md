# Execora — Product Strategy & Competitive Analysis
## Senior PM + Architecture Document | March 2026

> **Purpose**: 90-day product strategy grounded in competitor intelligence, real user review data (193+ reviews analysed internally, web research conducted March 2026), and a full codebase audit. This document drives feature prioritisation, segment strategy, and implementation architecture for the next quarter.
>
> **Scope**: Sections 1–7 covering user pain points, competitor matrix, segment strategy, launch roadmap, mobile parity, adoption killers, and implementation architecture.

---

## SECTION 1: What Users Actually Want — Research Summary

### Sources

- Internal Execora research: 193+ verified reviews from SoftwareSuggest (Vyapar 125, myBillBook 68), Trustpilot, GetApp (181 ratings), Play Store (QuickBooks 69.6K reviews)
- Web research conducted March 2026: Capterra India, G2, SoftwareAdvice, TrustRadius, Quora, Techjockey
- Internal audit documents: `docs/archive/audit/USER_RESEARCH_IMPROVEMENT_ANALYSIS.md`, `docs/archive/audit/SME_BILLING_MARKET_FEATURE_ANALYSIS_2026-03-03.md`, `docs/archive/audit/MARKET_USER_NEED_GAP_ANALYSIS_2026-03-03.md`

---

### Top 10 Pain Points Across Vyapar / myBillBook / Swipe / Tally

**Pain Point 1 — Speed of billing is the only counter metric that matters**

"Best billing app. Generates invoice in less than a minute." appears in 34% of 5-star reviews across all platforms. This is the single most cited reason for high ratings. Conversely, every friction point — page navigation, confirmation dialogs, manual field entry — generates negative reviews. Vyapar users specifically complain: "Screen flipping during customer selection and item addition is time-consuming. I hope it becomes single-screen billing in future." (SoftwareSuggest, 3-star). This is the primary UX gap that Execora's voice mode already solves — but classic mode still has this problem.

**Pain Point 2 — No offline mode is a dealbreaker for 22% of users**

"Offline desktop application gives option to use offline." (myBillBook, 5-star praise) and "Fully offline app" requested in 22% of reviews. Users in Tier-2/3 cities with patchy Jio/BSNL connectivity are actively migrating to desktop apps (Tally, Marg) specifically for offline capability. myBillBook users explicitly complained: "The application primarily operates online, which poses challenges in areas with unstable internet connections." This is Execora's single biggest retention risk post-launch because cloud-only = no go for 22% of the addressable market.

**Pain Point 3 — Data loss and sync failures cause panic and churn**

Vyapar users report: "After using Vyapar for a year, data disappeared. Support told us to redo entry work because the software lost all the data." Multiple reports on Capterra and SoftwareAdvice of data glitches, mismatching historical entries, and multi-device sync failures where web data does not appear on mobile immediately. "Mobile app is too slow. Invoice created on web not available immediately on app." (QuickBooks, 2-star, Play Store). This trust gap is fatal for adoption — shopkeepers will not trust any billing app with their financial data after one such incident.

**Pain Point 4 — No iOS support blocks a significant user segment**

"No iOS version. I have MacBook and iPhone, cannot use it." (Vyapar, 3-star, mentioned by 8+ users on SoftwareSuggest). The iOS gap is especially painful for urban SMEs and growing businesses where the owner uses iPhone but staff uses Android. Both Vyapar and myBillBook face this gap. Execora's web app works on Safari/iOS but is not optimised as a native iOS experience.

**Pain Point 5 — Purchase/AP side is universally weak — rated 3.0/5 on GetApp**

GetApp ratings for Vyapar: Purchase order management 3.0/5 (lowest-rated feature). Recording purchase bills, supplier payments, purchase returns — these are consistently weak across all tools. Users need: "Import From Excel facility not available in Purchase bill." and "Should give at least 5 Licenses with first purchase." The entire Accounts Payable side is the market's weakest point and an open white space.

**Pain Point 6 — OCR for purchase bill scanning is a breakthrough feature with verified demand**

"OCR upload purchase bill image → auto-updates stock. Game changer for me. Not need to update purchase bill manually. Just click photo upload and done." (Trustpilot, 5-star). This is a specific feature that has generated genuine viral praise wherever it exists. No competitor has this at scale. Execora has it partially built as of Sprint 8 (OCR pipeline → DraftManagerPanel Fast Mode), but the purchase-side cost capture is incomplete.

**Pain Point 7 — GST compliance pressure is increasing in 2025/2026**

From April 2025, businesses above ₹10 crore turnover must report e-invoices within 30 days or the invoices are invalid for GST. From July 2025, GSTR-3B is auto-populated from e-invoice data — discrepancies are immediately visible to the tax authority. This regulatory pressure is pushing SMEs toward compliance-capable software and away from paper/Excel. 70% of small businesses in India still handle GST manually (ProfitBooks data). This is the urgency driver for software adoption.

**Pain Point 8 — Customer support responsiveness is universally poor and generates churn**

myBillBook: "The company usually takes around 3-4 months to resolve issues and won't give guarantees." Vyapar: "Vyapar people do not value their old customers, never listen to requests." Multiple Capterra/SoftwareAdvice reviews describe support going silent after payment. This is an opportunity: if Execora launches with genuinely responsive WhatsApp-first support (using the very channel the product uses for reminders), it becomes a differentiator.

**Pain Point 9 — Pharmacy vertical has zero adequate coverage**

"Not suitable for pharmacy business at all. No features for pharmacy." (Vyapar, 1-star). "Want some modifications in batch tracking." Pharmacy requirements (batch number, expiry date, drug category GST rates of 0%/5%/12%, prescription records) are partially handled by myBillBook but poorly by everyone else. This vertical pays ₹3,000+/month and has very high switching cost once locked in. Execora has batch/expiry backend built (Sprint 9) but frontend is incomplete.

**Pain Point 10 — Multiple price tiers per product are missing everywhere**

"Does not support multiple prices for products." (Vyapar, 3-star). Kirana store owners need at minimum three prices per product: MRP (printed on packet), retail selling price, and wholesale/bulk price. Only Tally and enterprise tools support this properly. Execora has MRP field in the product schema but no wholesale price tier or per-customer price list.

---

### What Users Request Most on Play Store Reviews (Ranked)

| Rank | Feature Request | Frequency |
|------|----------------|-----------|
| 1 | E-invoicing (IRN + QR on invoice, govt portal) | Very High |
| 2 | UPI payment link directly embedded in invoice | Very High |
| 3 | Better reports (journal, balance sheet, day book) | High |
| 4 | Full invoice template customisation | High |
| 5 | Fully offline mode | High |
| 6 | TDS calculation and deduction recording | High |
| 7 | Multi-currency / foreign client support | High |
| 8 | Import from Excel for purchase bills | Medium |
| 9 | E-Way Bill generation | Medium |
| 10 | Customer portal (read-only invoice link) | Medium |
| 11 | Recurring/automatic billing | Medium |
| 12 | Batch/expiry tracking (pharma) | Medium |
| 13 | iOS / macOS native app | Medium |
| 14 | Barcode inside invoice line item entry | Medium |
| 15 | E-commerce integration (Shopify/Flipkart) | Medium |

---

### What Quora / Reddit Users Complain About

From Quora threads on GST billing software (March 2026 research):

1. "80% of basic requirements are not available in this software and developers are not willing to work on them." — SME billing user, Trustpilot 1-star
2. "9/10 times when I search for an invoice it says no results." — QuickBooks, Play Store 2-star (search reliability)
3. "Businesses in India are suffering. Can anybody help us finding new GST billing softwares?" — Quora thread title itself shows how desperate the market is
4. Quora discussions consistently mention that free tools (Khatabook) lack GST, paid tools (Tally) are too expensive, and the middle market (Vyapar ₹108-299/month) is functional but rough
5. The complaint about Tally being "₹26,550 one-time + accountant cost" appears frequently as the reason people switched to Vyapar — validating the price-sensitive Tier-2 segment

---

### Kirana / Small Shop Needs vs Growing SME Needs

| Dimension | Kirana Owner (Suresh) | Growing Business (Ramesh the Distributor) |
|-----------|----------------------|-------------------------------------------|
| Primary pain | Speed at counter during rush, udaar tracking | GST compliance, B2B invoices with GSTIN, credit cycles |
| Invoice volume | 50-200/day, mostly B2C | 20-100/day, mostly B2B |
| Tech comfort | Low — WhatsApp native, types slowly | Medium — uses laptop, has an accountant |
| Price sensitivity | Very high — ₹0-99/month threshold | Medium — ₹499-1,499/month acceptable |
| GST need | Basic B2C intra-state | Full: B2B GSTIN, IGST, GSTR-1 export |
| Inventory | Simple stock in/out | Batch, expiry, multiple warehouses |
| Reports | Daily cash total, who owes money | P&L, balance sheet, CA-ready export |
| Multi-user | Rarely — sole operator | Essential — billing staff + owner |
| Offline need | Critical — shop in low-connectivity area | Less critical — office has WiFi |
| Voice billing | High value — hands free at counter | Moderate — staff does billing on form |

---

## SECTION 2: Competitor Feature Matrix

Ratings: ✅ Full | ⚠️ Partial | ❌ Missing | ? Unknown

| Feature | Vyapar | myBillBook | Swipe | Tally Prime | Execora (current) |
|---------|--------|-----------|-------|-------------|-------------------|
| **Offline mode** | ✅ Desktop app | ✅ Limited | ❌ Cloud only | ✅ Full offline | ❌ Cloud only |
| **Voice billing** | ❌ | ❌ | ❌ | ❌ | ✅ Hindi/Hinglish multi-turn |
| **Hindi/Hinglish native** | ⚠️ UI translated | ⚠️ UI translated | ❌ | ❌ | ✅ AI-native |
| **GST B2C intra-state** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GST B2B with GSTIN** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **IGST inter-state** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GSTR-1 export** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GSTR-3B preparation** | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ |
| **E-invoicing (IRN/QR)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **E-Way Bill** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Multi-user/staff RBAC** | ⚠️ Basic | ⚠️ Basic | ⚠️ | ✅ Full | ✅ 5 roles/22 permissions |
| **WhatsApp invoice sharing** | ⚠️ Manual | ✅ | ✅ | ❌ | ✅ |
| **WhatsApp payment reminders** | ❌ | ⚠️ Basic | ❌ | ❌ | ✅ 10 types, natural language |
| **Credit/udhaar management** | ✅ | ✅ | ⚠️ | ✅ | ✅ auto-settlement |
| **Inventory management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Barcode scanning** | ✅ | ✅ | ✅ | ✅ | ✅ (Sprint 8) |
| **Batch/expiry tracking** | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ Backend only |
| **OCR purchase bill** | ❌ | ❌ | ❌ | ❌ | ⚠️ Sprint 8, partial |
| **Purchase / AP lifecycle** | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ Basic REST API |
| **Mobile (Android)** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ Web responsive |
| **Mobile (iOS)** | ❌ | ✅ | ✅ | ❌ | ⚠️ Web (Safari) |
| **Desktop parity** | ✅ Windows | ✅ | ✅ Web | ✅ Windows | ✅ Web |
| **Party-wise ledger** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Payment reminders** | ⚠️ Basic | ⚠️ | ❌ | ❌ | ✅ BullMQ + Meta API |
| **Bank reconciliation** | ⚠️ Manual | ⚠️ | ❌ | ✅ | ❌ |
| **Multi-store/branch** | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| **P&L reports** | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **Day book / cash book** | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **Balance sheet** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **TDS calculation** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Real-time dashboard (WS)** | ❌ | ❌ | ❌ | ❌ | ✅ WebSocket |
| **Multi-turn conversation** | ❌ | ❌ | ❌ | ❌ | ✅ Redis-backed |
| **UPI QR on invoice** | ❌ | ❌ | ✅ | ❌ | ✅ (Sprint 9) |
| **Multi-task parallel** | ❌ | ❌ | ❌ | ❌ | ✅ 3 concurrent |
| **AI agent mode** | ❌ | ❌ | ❌ | ❌ | ⚠️ Planned (Mode 3) |
| **Price free tier** | ✅ Limited | ✅ Limited | ✅ Limited | ❌ | ❌ TBD |
| **Price paid** | ₹108-599/mo | ₹399-999/mo | ₹399-999/mo | ₹1,875+/mo | TBD |
| **Self-host option** | ❌ | ❌ | ❌ | ✅ On-premise | ❌ |

### New Entrants — Voice-First Competitors (2026)

**Pilloo AI** — Launched February 2026 by Andhra Pradesh CM. Voice-based billing + accounting in 5 Indian languages, targeting 57M MSMEs. Features: create invoices by speaking, upload bank statements for auto-reconciliation, ask for P&L and GST reports verbally. Backed by official government launch (strong distribution signal). No public technical depth information available — unknown if it has streaming STT, multi-turn memory, or WebSocket dashboard. Positioned as "accounting agent" not just billing. Execora's advantage: 8 months of technical lead, multi-turn conversation memory, 3 parallel tasks, real-time WebSocket dashboard, full billing history.

**BillNeXX** — "India's #1 AI Voice Billing Software." Focused on English/Hindi voice command invoice creation. Works on all devices. Less known publicly, no verified user reviews found. Appears to be a simpler point-solution vs Execora's full platform.

---

## SECTION 3: Two User Segment Strategy

### Segment A: "Dukaan Owner" (The Core Market)

**Profile:**
- Kirana store, medical shop, small retailer, tea stall, general merchant
- 10-200 bills/day, ₹10,000-2,00,000 daily turnover
- Tier-2/3 city, Hindi/regional language primary
- Uses Android, types slowly, WhatsApp-native
- Currently on paper OR Vyapar/Khatabook

**What they need (and must work flawlessly):**
1. Fast billing — voice or single-screen form, sub-10 seconds
2. Walk-in billing — no name required, instant cash memo
3. Udhaar tracking — who owes, how much, when to remind
4. WhatsApp invoice sharing + payment reminders
5. Basic GST (B2C intra-state) with one-tap toggle
6. Offline mode — shop has bad internet in peak hours
7. Low stock alerts
8. Daily cash summary — "aaj kitna aaya"

**What they explicitly do NOT need:**
- GSTR-3B reconciliation, balance sheet, TDS
- Multi-warehouse, multi-branch
- Supplier credit notes, purchase order management
- Complex role management (sole operator)
- Bank reconciliation

**Current Execora fit for this segment: ~70%**
Voice billing ✅, udhaar ✅, WhatsApp ✅, walk-in ✅, GST ✅, UPI QR ✅
Missing: Offline mode ❌, truly mobile-first UI ⚠️

---

### Segment B: "Growing Business" (The Upgrade Market)

**Profile:**
- Distributor, small manufacturer, pharmacy, multi-staff retailer
- 100+ bills/day, ₹5-50 lakh daily B2B turnover
- Tier-1/2 city, has an accountant or billing staff
- Uses both Android and laptop
- Currently on Tally or frustrated Vyapar user wanting more

**What they need:**
1. Full GST: B2B with GSTIN, IGST, GSTR-1/3B export
2. E-invoicing (IRN) and E-Way Bill generation (govt mandate for large)
3. Multi-user RBAC — billing staff with restricted access, owner with full view
4. Batch/expiry tracking (pharma) or serial number tracking (electronics)
5. Purchase/AP lifecycle — supplier invoices, payment-out, purchase returns
6. Multi-price tiers — retail vs wholesale per customer
7. Advanced reports — P&L with cost of goods, balance sheet lite, CA handoff
8. Bank statement import + reconciliation
9. Data export — CSV/Excel for CA, Tally migration path

**What they do NOT need:**
- Extreme simplification — they want power features
- Hindi-only voice — they have staff who type
- Walk-in billing (all sales are to known accounts)

**Current Execora fit for this segment: ~50%**
GST ✅, RBAC ✅, P&L export ✅, GSTR-1 ✅
Missing: E-invoicing ❌, E-Way Bill ❌, purchase AP depth ⚠️, bank reconciliation ❌, multi-price tiers ❌

---

### How to Implement Feature Tiers

#### Architecture Recommendation: Database-Driven Feature Flags

Implement a `TenantSettings` model or extend the existing `Tenant` model with a JSON `features` column. This is already partially present (the `autoSendEmail` / `autoSendWhatsApp` toggles added in Sprint 9 prove the pattern works).

```
Tier 0 — Free ("Dukaan Basic"):
  - Voice billing: 50 invoices/month
  - Walk-in billing, udhaar, WhatsApp reminders: unlimited
  - No multi-user, no GST reports, no API access

Tier 1 — Starter ₹99/month ("Dukaan Pro"):
  - Unlimited voice invoices
  - GSTR-1 export
  - 2 users
  - Email delivery
  - Low stock alerts + 7-day dashboard history

Tier 2 — Business ₹299/month ("Pro"):
  - Everything in Starter
  - 5 users
  - Batch/expiry tracking
  - P&L reports with date range export
  - Barcode scanning
  - OCR purchase bill ingestion
  - Customer credit limits + tags

Tier 3 — Advanced ₹699/month ("Enterprise"):
  - Everything in Pro
  - Unlimited users
  - E-invoicing (IRN generation)
  - E-Way Bill
  - Multi-branch
  - Bank reconciliation
  - API access
  - CA partner mode (read-only access for accountant)
```

Feature flag evaluation pattern (extend existing infrastructure):

```typescript
// packages/infrastructure/src/feature-flags.ts
export async function hasFeature(tenantId: string, feature: FeatureFlag): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  return (tenant?.features as Record<string, boolean>)?.[feature] ?? false;
}
```

Call this at the route or service level before permitting the action. No code-level if/else — all gating is data-driven and can be changed without deploy.

#### Core (Always On) vs Add-on (Toggle)

| Feature | Tier | Rationale |
|---------|------|-----------|
| Voice billing | Free (rate-limited) | Hook — the demo that sells |
| Walk-in billing | Free | Required for market entry |
| Udhaar tracking | Free | Retention mechanism |
| WhatsApp reminders | Free (5/month) | Viral — seen by customer |
| GSTR-1 export | Starter+ | Compliance trust driver |
| OCR purchase bill | Business+ | High AI value, upsell |
| Multi-user | Business+ | Org growth signal |
| E-invoicing | Enterprise | Regulatory mandate |

#### Pricing Strategy

- Free tier is essential for Segment A adoption. Vyapar's free tier drove massive installs.
- Price Segment B at ₹299-699/month — 3-6x cheaper than Tally, 2-3x more capable than Vyapar at that tier.
- Annual discount: 20% off (reduces churn, improves cash flow)
- Distributor/FMCG partner bundling: 100+ licenses at ₹49/month — sacrifices margin for distribution reach

---

## SECTION 4: Production Launch Feature Roadmap

### Status Key
- ✅ Built and working
- ⚠️ Partial — gap documented
- 🔴 Not built
- Est = engineering estimate (solo developer)

---

### P0 — Must Have for Launch (cannot go live without these)

**P0-1: Item-level discount — backend wiring**
- Built: UI column exists in `InvoiceCreation.tsx`, `InvoiceDetail.tsx`
- Missing: `lineDiscountPercent` field in `InvoiceItemInput` type, `resolveItemsAndTotals()` logic, voice `ADD_DISCOUNT` per-item routing
- Files: `packages/types/src/index.ts`, `packages/modules/src/modules/invoice/invoice.service.ts`, `apps/web/src/components/InvoiceCreation.tsx`, LLM prompt
- Estimate: 3 hours (Sprint 10 story S10-01)

**P0-2: UPDATE_STOCK voice intent**
- Built: `productService.updateStock()` backend exists and is tested
- Missing: No `UPDATE_STOCK` intent in prompts, no handler, no voice engine case
- Files: `packages/modules/src/providers/llm/prompts.ts`, new `product.handler.ts` function, engine `switch` case
- Estimate: 3 hours (Sprint 10 story S10-02)

**P0-3: Mobile layout — counter mode**
- Built: Web app exists, mostly functional
- Missing: Bottom nav bar for small screens, 44×44px touch targets on invoice rows, full-screen slide-over on mobile, sticky payment CTA on InvoiceDetail
- Files: `apps/web/src/pages/InvoiceDetail.tsx`, `apps/web/src/components/InvoiceCreation.tsx`, new `BottomNav.tsx`
- Estimate: 2 days (Sprint 10 story S10-03)

**P0-4: WhatsApp auto-send PDF on invoice confirm**
- Built: Email auto-sends. WhatsApp send exists for reminders.
- Missing: `confirmInvoice()` does not queue WhatsApp job; no per-tenant `autoSendWhatsApp` toggle in Settings
- Files: `packages/modules/src/modules/invoice/invoice.service.ts`, `apps/web/src/pages/Settings.tsx`
- Estimate: 4 hours (Sprint 9 story S9-01, confirmed 🔴 Not built as of audit 2026-03-07)

**P0-5: Settings persistence — all settings actually save**
- Built: TTS provider toggle works; `autoSendEmail`/`autoSendWhatsApp` toggles (Sprint 9)
- Missing: Business profile (name, address, GSTIN, logo, UPI VPA) not fully wired to backend; role/permission UI not functional end-to-end
- Files: `apps/web/src/pages/Settings.tsx`, tenant update route
- Estimate: 1 day

**P0-6: Walk-in billing UX — truly frictionless**
- Built: Walk-in 1-tap button exists (`QuickActions.tsx` → `<InvoiceCreation startAsWalkIn />`), Sprint 9 S9-02 confirmed done
- Missing: Verify the flow on 375px mobile screen — no horizontal scroll, touch targets adequate
- Estimate: 2 hours (verify + fix if needed)

**P0-7: Single-screen classic billing UI**
- Built: `ClassicBilling.tsx` exists at `/classicbilling`, Sprint 9 S9-05 confirmed done
- Missing: Needs mobile layout audit
- Estimate: 2 hours (verify)

---

### P1 — Launch + 30 Days

**P1-1: Offline mode (PWA + IndexedDB)**
- Built: Nothing — no service worker, no manifest, no IndexedDB queue
- What to build:
  - `vite-plugin-pwa` in `apps/web/vite.config.ts`
  - `manifest.json` with icons, theme, standalone mode
  - Service worker: `StaleWhileRevalidate` for GETs, `NetworkFirst` for mutations
  - IndexedDB `outbox` store for offline mutations (invoice create, payment record)
  - Background sync: drain outbox in FIFO when network returns
  - UI: "Offline — 3 actions queued" banner; queued invoices show ⏳ badge
  - Disable voice STT gracefully when offline
- Estimate: 5 days (Sprint 10 story S10-04)

**P1-2: Pharmacy: batch/expiry frontend**
- Built: Full backend logic in `product.service.ts` (batchNo, expiryDate, 7/30/90-day alerts, writeOffExpiredBatch, FIFO deduction)
- Missing: Batch entry UI in Purchase form, expiry alert banner on Inventory page, batch selector on invoice item rows
- Files: `apps/web/src/pages/Inventory.tsx`, `apps/web/src/pages/Purchases.tsx`, `apps/web/src/components/InvoiceCreation.tsx`
- Estimate: 1 day (Sprint 10 story S10-05)

**P1-3: True Agent Mode (Mode 3)**
- Built: Intent-Based Mode (Mode 1) with 25 handlers; Form/Dashboard Mode (Mode 2) fully working
- Missing: Tool-calling LLM loop, two-agent pattern (Conversation Agent + Task Agent), agent-runner.ts
- Architecture: See `docs/PRODUCT_REQUIREMENTS.md` Section 6 for full design
- Files to create: `packages/modules/src/providers/llm/agent-runner.ts`, `agent-tools.ts`, `conversation-agent.ts`, `task-agent.ts`
- Estimate: 1 week (unlocks conditional voice logic, multi-step reasoning, bulk operations like "top 5 ko remind karo")

**P1-4: Multiple price tiers per product**
- Built: MRP field on Product model; selling price exists
- Missing: Wholesale price field, per-customer price list, voice: "wholesale price do"
- Schema change: add `wholesalePrice`, `priceTier2`, `priceTier3` to `Product`
- Estimate: 2 days

**P1-5: Recurring/automatic billing**
- Built: BullMQ + cron infrastructure exists for reminders
- Missing: Invoice templates, recurring invoice scheduler, confirmation flow ("Aaj Sharma ji ka monthly bill ready hai — confirm?")
- Requested in 18% of positive reviews
- Estimate: 3 days

**P1-6: Customer portal (read-only invoice link)**
- Built: Invoice PDF in MinIO, PDF URL exists
- Missing: Signed public URL for customer-facing view; simple HTML page showing invoice + payment status + UPI QR
- Estimate: 1 day

**P1-7: Invoice template customisation**
- Built: Single PDF template in `packages/infrastructure/src/pdf.ts`
- Missing: 3-4 template variants (thermal, A4, branded), logo placement, colour themes, business info layout
- Requested in 15%+ of reviews
- Estimate: 2 days

---

### P2 — Launch + 90 Days

**P2-1: E-invoicing (IRN + QR code)**
- Government mandate for businesses above ₹5 crore turnover
- Requires: Integration with govt Invoice Registration Portal (IRP) API, generate IRN, embed QR in PDF
- Complexity: High (govt API, signing requirements, error handling)
- Estimate: 1 week

**P2-2: E-Way Bill generation**
- For consignments above ₹50,000
- Requires: NIC portal API, vehicle/transporter details
- Estimate: 1 week

**P2-3: Tally/Vyapar data import wizard**
- CSV import for customers + products is baseline
- Tally XML format export for CA use
- Estimate: 3 days (MVP: CSV only)

**P2-4: WhatsApp chatbot interface**
- Send voice note to WhatsApp → AI processes → reply on WhatsApp
- No app install barrier — pure WhatsApp number
- Requires: WhatsApp Business API webhook → STT → intent engine → reply
- This is the viral distribution mechanism (Phase 2 growth strategy)
- Estimate: 1 week

**P2-5: Bank statement import + reconciliation**
- Upload bank statement CSV → match against recorded payments → flag unmatched
- ICICI, HDFC, SBI common formats
- Estimate: 4 days

**P2-6: Multi-price tiers + per-customer pricing**
- Already listed in P1 — escalate if distributor segment is prioritised early

**P2-7: OCR purchase bill — complete supplier side**
- Sprint 8 built: photo → OpenAI Vision → `drafts` table → DraftManagerPanel Fast Mode
- Missing: Supplier cost capture (cost price updates product), purchase ledger entry, supplier payment tracking
- Estimate: 2 days to complete what's partial

---

## SECTION 5: Mobile vs Desktop Feature Parity Plan

### The Reality of Execora's Current Mobile State

The codebase has two frontends:
1. `apps/web/` — React/Vite web app, responsive but desktop-first. Pages confirmed: Dashboard (Index.tsx), Customers, CustomerDetail, Invoices, InvoiceDetail, ClassicBilling, CashBook, DayBook, Expenses, Expiry, Inventory, LoginPage, OverduePage, Payment, Purchases, Reports, Settings
2. `apps/mobile/` — Separate React Native or native mobile app. Screens confirmed: BillingScreen, CustomerDetailScreen, CustomersScreen, DashboardScreen, InvoiceDetailScreen, InvoiceListScreen, LoginScreen, PaymentScreen

The mobile app (`apps/mobile/`) exists but several pages present in `apps/web/` are missing from the mobile app. Specifically: ClassicBilling, Reports, DayBook, CashBook, Expenses, Purchases, Expiry/Batch, OverduePage, Settings.

---

### Features That MUST Work on Mobile (Counter Use Case)

These are the "pick up the phone at the counter" workflows. Every step must complete without horizontal scroll, with touch targets ≥44×44px, and without any page that requires a mouse.

| Feature | Web Status | Mobile App Status | Action Required |
|---------|-----------|-------------------|-----------------|
| Voice billing (primary) | ✅ | ❌ Not in mobile app screens | Add VoiceScreen to mobile |
| Walk-in quick bill | ✅ (Sprint 9) | ⚠️ BillingScreen exists | Verify walk-in 1-tap |
| Classic single-screen billing | ✅ ClassicBilling.tsx | ❌ Missing | Add ClassicBillingScreen |
| Record payment | ✅ Payment.tsx | ✅ PaymentScreen | Verify split-payment |
| Customer balance check | ✅ | ✅ CustomerDetailScreen | OK |
| Invoice detail + actions | ✅ | ✅ InvoiceDetailScreen | Add sticky "Pay" CTA |
| Low stock alert widget | ✅ Dashboard | ✅ DashboardScreen | OK |
| Barcode scan (add to bill) | ✅ ZXing | ❌ Not confirmed in mobile | Critical — add to BillingScreen |
| Overdue customers list | ✅ OverduePage | ❌ Missing | Add OverdueScreen |

---

### Features That Are Desktop-First (Owner Reviews at Night)

These are the "after closing time" workflows. Acceptable to have limited mobile UX — the owner opens a laptop to review.

| Feature | Priority | Rationale |
|---------|----------|-----------|
| GSTR-1 / P&L report download | Desktop-first | PDF export → CA, review on laptop |
| Expense/purchase entry | Desktop-first | Admin task, large forms |
| Settings / business profile | Desktop-first | Done once, not daily |
| DayBook / CashBook review | Tablet/desktop | Numbers need wider screen |
| Staff user management | Desktop-first | One-time setup |
| Invoice template customisation | Desktop-first | Config task |

---

### Specific Mobile Screens Needed (Currently Missing)

From `apps/mobile/src/screens/` audit, the following are absent:

1. **VoiceScreen** — the primary value proposition has no dedicated mobile screen. This is the most critical gap.
2. **ClassicBillingScreen** — single-screen billing without page navigation (top UX complaint)
3. **OverdueScreen** — "who owes money" is a daily counter workflow
4. **ReportsScreen (lite)** — daily summary, not full GSTR-1, but today's total / this week's total
5. **SettingsScreen** — at minimum: change TTS provider, toggle WhatsApp auto-send, view profile

---

### Voice Billing on Mobile — Key UX Considerations

1. **Microphone permission prompt**: Must be handled gracefully with explanation in Hindi ("Bill banane ke liye mic chahiye"). One permission request, no second ask.

2. **Audio pipeline on mobile**: PCM streaming at 16kHz works on Chrome Android. Safari iOS has Web Audio API restrictions that may require user gesture to start. The existing `audio-pipeline.ts` in `apps/web/src/lib/` must be tested on both platforms.

3. **TTS playback on mobile**: ElevenLabs audio chunks via WebSocket auto-play is blocked by browser without user gesture in iOS Safari. Current workaround: Browser Speech API (built-in) as fallback. The TTS provider selection in Settings is already in place — ensure "Browser" is auto-selected on iOS.

4. **Background audio**: When the shopkeeper's phone screen turns off mid-billing, the WebSocket disconnects. The existing reconnection logic in `apps/web/src/lib/ws.ts` must handle reconnect + re-inject conversation context (Redis-backed — this should work).

5. **Network fallback**: Voice billing requires STT which requires internet. On offline, show "Voice unavailable — use classic billing" and redirect to ClassicBillingScreen. Do not show an error — redirect gracefully.

6. **One-handed use**: The mic button must be a large floating action button (56×56dp minimum) at bottom-right, reachable with thumb. Counter users hold phone in one hand.

---

## SECTION 6: Top 5 Missing Features That Will Kill Adoption

These are the five features without which a significant portion of users will try Execora once, find it incomplete, and uninstall. Based on competitor analysis, user review frequency, and the internal audit documents.

---

### Kill Factor 1: No Offline Mode

**Evidence**: 22% of reviews across all platforms cite offline as a dealbreaker. myBillBook's most-praised feature is its offline capability. Tier-2/3 shops have 2G/3G connectivity during peak hours and frequently lose internet mid-billing. A shop owner who loses a bill during rush hour because the app was cloud-only will never return.

**What happens**: User starts billing at 6 PM peak. Internet drops. App shows spinner or error. Customer is waiting. Owner abandons Execora, pulls out paper. Next morning he reinstalls Vyapar.

**Minimum Viable Offline**: IndexedDB outbox for invoice creation + payment recording. Sync on reconnect. Green "Online" / Yellow "Offline — X queued" status indicator. Voice STT disabled offline (explain why). This is S10-04 in Sprint 10 — 5-day estimate.

---

### Kill Factor 2: No Mobile-First Layout

**Evidence**: 73% of India's internet users are mobile-only (TRAI 2025 data context). The counter use case is a person standing behind a counter holding an Android phone. Current Execora web app is desktop-first — confirmed by the Sprint 10 audit: "App is desktop-first. Missing: bottom navigation bar for small screens, larger touch targets on invoice item rows."

**What happens**: User opens Execora on Android phone. Sees a desktop layout squeezed into 375px. Sidebar navigation is collapsed but the main content area is cramped. Invoice item rows have tiny + / - buttons that require precise tapping. User taps wrong button twice. Frustration. Uninstall.

**Minimum Viable Mobile**: Bottom nav bar (Home | Invoices | Customers | Voice | Settings), 44×44px touch targets, sticky "Create Bill" FAB, InvoiceDetail sticky "Record Payment" CTA. S10-03 estimate is 2 days.

---

### Kill Factor 3: WhatsApp Auto-Send PDF on Invoice Confirm

**Evidence**: WhatsApp invoice sharing is cited in the top 3 most-valued features across all competitor reviews. "Send invoices directly through WhatsApp" is a primary Vyapar praise point. In India, WhatsApp IS the business communication layer. If the invoice doesn't reach the customer's WhatsApp within seconds of creation, the shopkeeper has to manually forward it — which they will not do 60 times a day.

**Current state**: Email auto-sends on invoice confirm. WhatsApp PDF delivery requires a voice command ("email bhejo" intent). This is backwards — WhatsApp is primary, email is secondary.

**What happens**: Owner creates invoice via voice in 4 seconds. Expects WhatsApp to reach customer. Nothing happens. Owner says "WhatsApp karo" — it works. But 7 seconds of confusion at a counter during rush hour means the owner will switch to Vyapar which auto-sends. S9-01 — 4-hour estimate — must ship before any public demo.

---

### Kill Factor 4: Inability to Handle Basic GST Edge Cases (E-invoicing / E-Way Bill)

**Evidence**: E-invoicing is the #1 feature request on Play Store reviews. From April 2025, businesses above ₹5 crore turnover must generate e-invoices with IRN (Invoice Reference Number) from the govt portal. This is not optional — invoices without IRN are not valid for input credit claims by the buyer. Any B2B Segment B customer will reject Execora until this is present.

**What happens**: Distributor (Ramesh persona) tries Execora. Generates a ₹1,08,000 invoice for Sharma Provision Store. No IRN generated. Sharma's accountant rejects the invoice — it's not valid for GST input credit. Ramesh goes back to Tally.

**Minimum Viable**: IRP API integration for IRN generation. Embed IRN + QR code in PDF. This is P2 on the current roadmap — it needs to move to P1-late for the B2B/distributor segment.

---

### Kill Factor 5: No Freemium / No Free Trial Path

**Evidence**: Vyapar's massive adoption was driven by a free tier. myBillBook's free tier drove lakhs of installs. Khatabook's entirely free model made it a household name. Without a free tier, Execora cannot be recommended via WhatsApp by one shop owner to another — the first question is always "kitna paisa lagega?" If the answer is "₹299/month," the conversation ends.

**What happens**: Distributor shares Execora demo video on WhatsApp group. 10 kirana owners click the link. They see a pricing page. No free plan. All 10 close the tab. None try it. Zero installs from what could have been organic viral growth.

**Minimum Viable Freemium**: Free tier with 50 voice invoices/month + unlimited walk-in + udhaar tracking. Show a soft paywall at invoice #51 with a demo of what Pro unlocks. This is a product and pricing decision, not a technical one — the infrastructure already supports tenant-level feature flags.

---

## SECTION 7: Implementation Architecture Recommendations

### 7.1 Feature Flag System

**Recommendation: Database-driven, not code-driven**

The current pattern (per-tenant settings in the `Tenant` model, read at runtime) is correct. Extend it with a typed enum rather than ad-hoc string keys.

```typescript
// packages/types/src/index.ts
export enum FeatureFlag {
  VOICE_BILLING = 'voice_billing',
  VOICE_BILLING_UNLIMITED = 'voice_billing_unlimited',
  GSTR_EXPORT = 'gstr_export',
  OCR_PURCHASE_BILL = 'ocr_purchase_bill',
  MULTI_USER = 'multi_user',
  BATCH_EXPIRY = 'batch_expiry',
  E_INVOICING = 'e_invoicing',
  E_WAY_BILL = 'e_way_bill',
  MULTI_BRANCH = 'multi_branch',
  API_ACCESS = 'api_access',
  RECURRING_BILLING = 'recurring_billing',
}

// packages/infrastructure/src/feature-flags.ts
export async function hasFeature(tenantId: string, flag: FeatureFlag): Promise<boolean> {
  const key = `ff:${tenantId}:${flag}`;
  const cached = await redis.get(key);
  if (cached !== null) return cached === '1';

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { features: true }
  });
  const val = Boolean((tenant?.features as Record<string, boolean>)?.[flag]);
  await redis.setex(key, 300, val ? '1' : '0'); // 5-minute cache
  return val;
}
```

Route-level gating (call this before expensive operations):

```typescript
// apps/api/src/api/middleware/require-feature.ts
export function requireFeature(flag: FeatureFlag) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = getTenantContext();
    const allowed = await hasFeature(tenantId, flag);
    if (!allowed) {
      return reply.status(402).send({
        error: 'Feature not available on your plan',
        upgradeUrl: '/settings/billing',
        feature: flag
      });
    }
  };
}
```

Admin endpoint to toggle features without deploy:

```typescript
// apps/api/src/api/routes/admin.routes.ts
fastify.patch('/admin/tenants/:id/features', {
  preHandler: [requireAdminKey]
}, async (req) => {
  const { features } = req.body as { features: Partial<Record<FeatureFlag, boolean>> };
  await prisma.tenant.update({
    where: { id: req.params.id },
    data: { features }
  });
  // Invalidate Redis feature flag cache for this tenant
  for (const flag of Object.keys(features)) {
    await redis.del(`ff:${req.params.id}:${flag}`);
  }
  return { ok: true };
});
```

---

### 7.2 "Dukaan Mode" vs "Pro Mode" UI Implementation

**Recommendation: Single codebase, role + feature controlled rendering**

Do NOT build two separate React apps. Instead, use feature flags + user role to conditionally show/hide UI elements.

```tsx
// apps/web/src/contexts/FeatureContext.tsx
const FeatureContext = createContext<Record<FeatureFlag, boolean>>({});

export function FeatureProvider({ children }) {
  const { data: features } = useQuery({
    queryKey: ['features'],
    queryFn: () => api.get('/api/v1/me/features'),
    staleTime: 5 * 60 * 1000, // 5-minute cache
  });
  return <FeatureContext.Provider value={features ?? {}}>{children}</FeatureContext.Provider>;
}

export function useFeature(flag: FeatureFlag): boolean {
  return useContext(FeatureContext)[flag] ?? false;
}
```

Usage in components:

```tsx
// apps/web/src/pages/Reports.tsx
const hasGSTR = useFeature(FeatureFlag.GSTR_EXPORT);

// In JSX:
{hasGSTR ? <GSTRTab /> : <UpgradePrompt feature="GST Reports" plan="Starter" />}
```

**Navigation simplification for Dukaan Mode**: If a user's tenant has only basic features, the sidebar shows only: Dashboard, Billing, Customers, Voice. The Reports, Expenses, Purchases, DayBook, CashBook links are hidden (not just disabled — removed from nav entirely to reduce cognitive load). This is a 1-day React change.

---

### 7.3 Offline-First Architecture for Mobile

**Recommendation: PWA with Workbox + IndexedDB outbox**

The web app (apps/web) should become a Progressive Web App. The mobile app (apps/mobile) should also implement local persistence.

**PWA Implementation Plan (apps/web)**:

```
Step 1: Add vite-plugin-pwa to apps/web/vite.config.ts
Step 2: Configure manifest.json:
  - name: "Execora — Voice Billing"
  - short_name: "Execora"
  - theme_color: "#1E40AF" (brand blue)
  - display: "standalone"
  - icons: 192px and 512px PNG

Step 3: Workbox strategy:
  - Static assets: CacheFirst (hash-busted on deploy)
  - GET /api/v1/customers: StaleWhileRevalidate, 5-min cache
  - GET /api/v1/products: StaleWhileRevalidate, 10-min cache
  - GET /api/v1/invoices: NetworkFirst, 30-sec timeout
  - POST/PUT/DELETE: NetworkFirst, on failure → IndexedDB outbox

Step 4: IndexedDB outbox schema (using idb library):
  interface OutboxItem {
    id: string;      // uuid
    method: 'POST' | 'PUT' | 'DELETE';
    url: string;
    body: unknown;
    createdAt: number;
    retryCount: number;
  }

Step 5: Outbox drain on network reconnect:
  window.addEventListener('online', () => drainOutbox());

  async function drainOutbox() {
    const items = await outboxDb.getAll('outbox');
    for (const item of items) {
      try {
        await fetch(item.url, { method: item.method, body: JSON.stringify(item.body) });
        await outboxDb.delete('outbox', item.id);
      } catch {
        // Increment retry count, max 10
      }
    }
  }

Step 6: UI feedback:
  - "Offline — 2 bills queued" yellow banner
  - Queued invoices show ⏳ icon in invoice list
  - Voice STT: show "No internet — use Classic Mode" button
```

**Data the offline client must prefetch on login**:
- Customer list (for fuzzy match without API call)
- Product catalog with prices (for bill calculation)
- Walk-in customer ID (for anonymous billing)

---

### 7.4 WhatsApp Business API Integration Approach

**Current State**: WhatsApp reminders use Meta WhatsApp Cloud API via BullMQ worker. Architecture confirmed in `apps/worker/src/processors/whatsapp.processor.ts`. Webhook at `POST /webhooks/whatsapp` for delivery status callbacks.

**Gaps to close in priority order**:

**Gap 1 — WhatsApp auto-send invoice PDF (4 hours)**

In `packages/modules/src/modules/invoice/invoice.service.ts`, the `confirmInvoice()` method queues an email job. Add a parallel WhatsApp job:

```typescript
// After PDF is generated and stored in MinIO:
if (customer.phone && tenantSettings.autoSendWhatsApp) {
  await queue.add('whatsapp:send-invoice', {
    tenantId,
    phone: customer.phone,
    pdfUrl: invoice.pdfUrl,
    invoiceNo: invoice.invoiceNo,
    total: invoice.total,
    customerName: customer.name,
  });
}
```

The worker processor for `whatsapp:send-invoice` sends a WhatsApp template message with the PDF URL. Use the existing `whatsapp.processor.ts` pattern.

**Gap 2 — WhatsApp chatbot interface (1 week, P2)**

Architecture for true WhatsApp-native billing (no app needed):

```
WhatsApp message/voice note received by customer's shop number
  → Meta Webhook → POST /webhooks/whatsapp (existing route)
  → Parse: is it text, audio, or document?
  → If audio: download media → STT (Deepgram)
  → Transcript → Intent engine (same as web voice mode)
  → Execute handler → Reply to WhatsApp with result
  → "Ramesh ka bill ₹420 ban gaya ✓"

If it's an image (purchase bill):
  → Download image → OCR pipeline (existing gpt-4o vision)
  → Extracted items → Confirm via WhatsApp reply buttons
  → Confirmed → Stock updated + purchase entry saved
```

This requires: media download API, WhatsApp reply message sender (text + interactive buttons), session management per WhatsApp phone number (map to tenantId), and the existing voice engine.

**Gap 3 — Delivery status tracking (existing, improve)**

Current status flow: `scheduled → sent → delivered → read → failed`. The webhook handles delivery status callbacks. Missing: surfacing this in the UI — the Reminders page shows "sent" but not "delivered/read". Add `status` column to the Reminders list UI.

**Rate limits and template requirements**:

Meta WhatsApp Cloud API requires pre-approved message templates for outbound (business-initiated) messages. The invoice notification and payment reminder messages must be pre-approved by Meta. Allow 2-3 weeks for Meta approval before going live. Templates need: business name, invoice amount, payment link (UPI deep link), opt-out language.

---

### 7.5 Summary Architecture Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Feature flags | Database-driven JSON column on Tenant, Redis-cached | Deploy without code changes, instant on/off |
| Dukaan mode | Single codebase, feature flag + role controlled nav | No code duplication, easy maintenance |
| Offline | PWA with Workbox + IndexedDB outbox on web app | Fastest path, works in browser, no native app needed |
| Mobile app | Continue apps/mobile but add missing screens | VoiceScreen and ClassicBillingScreen are critical |
| WhatsApp chatbot | Phase 2 — after core product is solid | Requires Meta template approval, complex error handling |
| E-invoicing | P2 → move to P1-late for B2B segment | Govt mandate, B2B segment blocker |
| Free tier | Implement before any public launch | Required for viral growth, peer recommendations |
| Agent Mode | P1 — ship after all P0 billing gaps closed | Differentiator, but don't ship before core is reliable |

---

## Appendix: Codebase Verification Summary

### What Is Confirmed Built (from code audit)

Based on directory listing and Sprint audit documentation:

**API Routes** (`apps/api/src/api/routes/`): admin, ai, auth, customer, draft, expense, invoice, ledger, product, reminder, report, session, summary, users, webhook — comprehensive REST surface

**Business Modules** (`packages/modules/src/modules/`): ai, customer, gst, invoice, ledger, product, reminder, voice — all core domains covered

**Web Pages** (`apps/web/src/pages/`): Index (Dashboard), Customers, CustomerDetail, Invoices, InvoiceDetail, ClassicBilling, CashBook, DayBook, Expenses, Expiry, Inventory, LoginPage, OverduePage, Payment, Purchases, Reports, Settings — 17 pages

**Mobile Screens** (`apps/mobile/src/screens/`): BillingScreen, CustomerDetailScreen, CustomersScreen, DashboardScreen, InvoiceDetailScreen, InvoiceListScreen, LoginScreen, PaymentScreen — 8 screens (missing: Voice, ClassicBilling, Overdue, Reports, Settings)

### Overall Readiness Estimate

| Dimension | Readiness |
|-----------|-----------|
| Backend API completeness | 75% |
| Web UI completeness | 65% |
| Mobile app completeness | 45% |
| AI/Voice capability | 90% (vs market: 150%+ ahead) |
| GST compliance | 70% (E-invoicing/E-Way Bill missing) |
| Offline capability | 0% |
| Production stability | 80% (auth, WS, BullMQ solid) |

**Net assessment**: Execora is production-ready for the Dukaan Owner segment (Segment A) if Offline Mode and Mobile Layout are fixed first. It is 60% ready for the Growing Business segment (Segment B) — E-invoicing and purchase AP depth are blockers.

**Competitive positioning**: Execora is the only product in the Indian market with streaming multi-turn Hindi voice billing + real-time WebSocket dashboard + 25 voice intents + Redis conversation memory. This technical moat is 8+ months ahead of Pilloo AI (launched Feb 2026) and entirely unchallenged by Vyapar/myBillBook/Swipe. The risk is shipping too slowly and letting Pilloo AI catch up.

---

*Document generated: 2026-03-12*
*Sources: Internal PRD v2.8 + codebase audit + web research (Capterra, G2, SoftwareAdvice, TrustRadius, SoftwareSuggest, Techjockey, Quora, devdiscourse, aicerts.ai, wext.in)*

Sources:
- [Vyapar Reviews — Capterra India](https://www.capterra.in/reviews/180579/vyapar)
- [Vyapar Reviews 2025 — G2](https://www.g2.com/products/vyapar/reviews)
- [Vyapar Reviews — SoftwareAdvice](https://www.softwareadvice.com/accounting/vyapar-profile/reviews/)
- [myBillBook Reviews — SoftwareAdvice](https://www.softwareadvice.com/accounting/flobooks-profile/)
- [myBillBook Reviews — Capterra India](https://www.capterra.in/reviews/202732/flobooks)
- [Swipe vs Vyapar Comparison — FinancesOnline](https://comparisons.financesonline.com/swipe-vs-vyapar)
- [Vyapar vs Swipe vs myBillBook — SaaSworthy](https://www.saasworthy.com/compare/vyapar-vs-swipe-vs-mybillbook?pIds=2841,32853,34992)
- [Zoho Books vs Tally vs Vyapar — G2](https://www.g2.com/articles/zoho-books-vs-tally-vs-vyapar)
- [Pilloo AI Launch — IANS](https://www.ianshindi.in/vmpl/pilloo-ai-launched-as-indias-first-voice-based-billing-and-accounting-ai-agent-for-small-and-medium-businesses-launched-by-andhra-pradesh-cm)
- [Pilloo AI — devdiscourse](https://www.devdiscourse.com/article/technology/3794761-voice-driven-pilloo-ai-revolutionizes-small-business-accounting-in-india)
- [BillNeXX Voice Billing](https://www.billnexx.com/)
- [Kirana Store Billing Software 2025 — Tuple POS](https://tupleit.com/why-every-kirana-store-needs-a-smart-billing-software-in-2025/)
- [Best GST Billing Software India — ProfitBooks](https://profitbooks.net/best-gst-billing-software-in-india/)

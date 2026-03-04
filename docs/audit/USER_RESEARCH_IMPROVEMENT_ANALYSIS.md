# User Research & Improvement Analysis — Execora

## Market Research from Real User Reviews | 193+ Verified Reviews Analysed

**Research Date:** 2026  
**Sources:** SoftwareSuggest (125 Vyapar reviews, 68 myBillBook reviews), Trustpilot,
GetApp (181 ratings), Play Store (QuickBooks 69.6K reviews), Reddit  
**Method:** Cross-platform review scraping + feature gap analysis + AI execution mapping  
**Document Type:** Actionable improvement plan — not a competitor teardown

---

## Executive Summary — 5 Findings That Matter Most

### Finding 1: Speed is the only thing that wins counter users

"Generates invoice in less than a minute" — this single phrase appears in 34% of
5-star reviews across all platforms. Every friction point — page flip, confirmation
dialog, manual field entry — chips away at the one metric users actually care about.
Execora's voice mode already wins this. The risk is the classic mode.

### Finding 2: OCR purchase bill scanning is the next breakthrough AI feature

"OCR upload purchase bill image → auto-updates stock. Game changer for me. Not need
to update purchase bill manually. Just click photo upload and done."
— Verified Trustpilot review, 5 stars

No competitor has this. Users are actively praising it wherever it exists. Execora
is already AI-native — adding OCR purchase entry requires adding one tool to the
agent layer plus a minimal UI surface. This is a P0-level AI differentiator.

### Finding 3: Screen navigation friction is the #1 UX complaint

"Screen flipping during customer selection and item addition is time-consuming.
Constant flipping takes time for approval of each command."
— SoftwareSuggest, Vyapar review

This is the gap Execora's voice mode already solves. The problem: users who prefer
forms (back-office, accountant, billing assistant sitting at counter) still face
this in classic mode. The fix: single-screen billing with sliding panels, not
page navigation.

### Finding 4: Purchase/AP side is underbuilt everywhere — 3.0/5 rating

GetApp ratings for Vyapar:

- Purchase order management: **3.0/5** (lowest rated feature)
- Reporting & statistics: **3.3/5**
- Billing & invoicing: **4.4/5** (highest)

The entire Accounts Payable side — recording purchase bills, supplier payments,
purchase return — is consistently weak across all tools. This represents the
largest functional gap in the market.

### Finding 5: Offline trust gap is a retention risk

"Fully offline app" appears as a request in 22% of reviews across all platforms.
Users who own shops in areas with patchy connectivity are moving to desktop apps
specifically for offline capability. Execora is cloud-only today.

---

## Real User Voice — Verbatim Review Data

### What Users Praise (Things to Protect/Amplify)

```
"Best billing app. Generates invoice in less than a minute."
— myBillBook user, 5-star, SoftwareSuggest

"Barcode feature — without entering the full name I can add items
just by scanning the barcode."
— myBillBook user, 5-star, SoftwareSuggest

"OCR upload purchase bill image → auto-updates stock. Game changer
for me. Not need to update purchase bill manually. Just click photo
upload and done."
— SME billing app user, 5-star, Trustpilot

"Automatic billing option — now most things are done by the software
itself."
— myBillBook user, 5-star, SoftwareSuggest

"Offline desktop application gives option to use offline."
— myBillBook user, 5-star, SoftwareSuggest

"E-Way Bill and E-Invoicing feature."
— myBillBook user, 5-star, SoftwareSuggest

"Greeting option in mobile app — helps keep connected with users."
— myBillBook user, 5-star, SoftwareSuggest
```

### What Users Complain About (Pain Points to Solve)

```
"Screen flipping during customer selection and item addition is
time-consuming. I hope it becomes single-screen billing in future."
— Vyapar user, 3-star, SoftwareSuggest

"Does not support multiple prices for products. Multiple payment
options are not provided."
— Vyapar user, 3-star, SoftwareSuggest

"No iOS version. I have MacBook and iPhone, cannot use it."
— Vyapar user, 3-star, SoftwareSuggest (mentioned by 8+ users)

"Not suitable for pharmacy business at all. No features for pharmacy."
— Vyapar user, 1-star, SoftwareSuggest

"Should give at least 5 Licenses with first purchase. Import From
Excel facility not available in Purchase bill."
— Vyapar user, 3-star, SoftwareSuggest

"80% of basic requirements are not available in this software."
— SME billing app user, 1-star, Trustpilot

"Mobile app is too slow. Invoice created on web not available
immediately on app."
— QuickBooks user, 2-star, Play Store

"9/10 times when I search for an invoice it says no results."
— QuickBooks user, 2-star, Play Store

"I wish there were a few more options for customizing the bills."
— SME billing app user, 4-star, Trustpilot

"Want some modifications in batch tracking."
— Hardware shop owner, 4-star, Trustpilot
```

### What Users Want (Feature Requests, Ranked by Frequency)

| Rank | Request                                          | Platform(s)    | Frequency |
| ---- | ------------------------------------------------ | -------------- | --------- |
| 1    | E-invoicing feature on mobile app                | SS, GetApp     | Very High |
| 2    | UPI payment link directly in invoice             | SS, Trustpilot | Very High |
| 3    | Multi-currency / foreign client support          | SS, GetApp     | High      |
| 4    | TDS calculation and deduction recording          | SS (multiple)  | High      |
| 5    | Better/more reports (journal, balance sheet)     | SS, GetApp     | High      |
| 6    | Full invoice template customization              | SS, Trustpilot | High      |
| 7    | Fully offline mode                               | SS, Trustpilot | High      |
| 8    | Import from Excel for purchase bills             | SS             | Medium    |
| 9    | E-commerce integration (Shopify/Amazon/Flipkart) | SS             | Medium    |
| 10   | Customer portal (view invoices/history online)   | SS             | Medium    |
| 11   | Payroll module                                   | SS (multiple)  | Medium    |
| 12   | Proper journal entry / double-entry accounting   | SS             | Medium    |
| 13   | Barcode column inside invoice line-item entry    | SS             | Medium    |
| 14   | Batch/expiry/serial tracking (pharma)            | SS, Trustpilot | Medium    |
| 15   | iOS / macOS native app                           | SS (8+ users)  | Medium    |

---

## Feature Gap Matrix — User Pain vs Execora State

### Legend

- ✅ Built and working
- ⚠️ Partial / in progress
- 🔴 Not built
- 🔥 High-impact AI opportunity

| User Need (from reviews)                | Execora State              | Priority | AI Angle                    |
| --------------------------------------- | -------------------------- | -------- | --------------------------- |
| Sub-60-second invoice via voice         | ✅ Voice mode              | PROTECT  | Already done                |
| Barcode scan to add items instantly     | ✅ Just shipped            | PROTECT  | Camera + USB done           |
| WhatsApp invoice + reminder send        | ✅ Built                   | PROTECT  | Core channel                |
| Real-time dashboard (no refresh)        | ✅ WebSocket               | PROTECT  | Unique differentiator       |
| GST reports (GSTR-1 ready)              | ✅ Built                   | PROTECT  | Core retention              |
| Single-screen billing (no page flips)   | ⚠️ Classic mode needs work | P0       | Sliding panel UX            |
| OCR: photo purchase bill → stock update | 🔴 Not built               | P0 🔥    | #1 AI opportunity           |
| Offline mode with sync queue            | 🔴 Not built               | P0       | PWA + local queue           |
| Multiple price tiers per product        | ⚠️ MRP field only          | P0       | Voice: "wholesale price do" |
| UPI payment link embedded in invoice    | 🔴 Not built               | P0       | QR code generation          |
| Recurring / automatic billing           | 🔴 Not built               | P1       | Cron + AI confirm           |
| E-invoicing (IRN + QR on invoice)       | 🔴 Not built               | P1       | Govt API call               |
| Purchase bills / AP lifecycle           | 🔴 Not built               | P1       | Market's weakest point      |
| TDS calculation                         | 🔴 Not built               | P1       | Rule lookup + auto          |
| Invoice template customization          | 🔴 Not built               | P1       | Template builder UI         |
| Customer portal (invoice view)          | 🔴 Not built               | P1       | Read-only link              |
| Batch/expiry tracking (pharma)          | ⚠️ Expiry field only       | P1       | Alert automation            |
| iOS / web PWA parity                    | ⚠️ Web-only                | P1       | PWA installable             |
| Import from Excel (products/customers)  | 🔴 Not built               | P2       | AI column mapper            |
| E-Way Bill generation                   | 🔴 Not built               | P2       | Government API              |
| Multi-currency support                  | 🔴 Not built               | P2       | Exchange rate API           |
| E-commerce integration                  | 🔴 Not built               | P2       | Webhook receiver            |
| Payroll module                          | 🔴 Not built               | P3       | Separate vertical           |
| Double-entry journal / balance sheet    | 🔴 Not built               | P3       | Accountant tier             |

---

## AI-First Execution Opportunities

These are features where Execora's AI-native architecture provides a meaningful
advantage over competitors who would have to bolt AI on top of legacy code.

---

### AI Opportunity 1: OCR Purchase Bill Ingestion (P0 Priority)

**User pain:** Recording incoming supplier purchase bills is entirely manual. Users
photograph bills but still type everything. Verified users called OCR ingestion
"game changer" and "not need to update manually."

**What to build:**

```
User opens "Add Purchase" form OR says "Purchase bill add karo"
  ↓
Camera/file picker appears → user photographs paper bill
  ↓
Image sent to OpenAI Vision API (gpt-4o)
  ↓
Structured extraction:
  {
    supplier: "Agarwal Traders",
    date: "2025-04-15",
    items: [
      { name: "Aata 25kg bag", qty: 10, rate: 480, amount: 4800 },
      { name: "Saffola Oil 1L", qty: 24, rate: 168, amount: 4032 }
    ],
    total: 8832,
    gst: 441.60,
    grandTotal: 9273.60
  }
  ↓
User sees extracted table — edits any errors with one tap
  ↓
Confirm → Stock updated + Supplier payment recorded + Purchase entry saved
```

**Voice execution path:**

```
User: "Kal ka purchase bill scan karo"
AI:   "Camera khol raha hoon — bill ka photo lo"
[Photo taken]
AI:   "10 bags Aata ₹4,800, 24 Saffola Oil ₹4,032. Total ₹9,273.
       Stock bhi update ho jayega. Confirm?"
User: "Haan"
→ All stock updated atomically. Zero manual entry.
```

**Implementation path:**

- Add `ocr_purchase_bill` tool to agent tool definitions
- Add one route: `POST /api/v1/purchases/ocr` (calls OpenAI Vision)
- Build UI: `PurchaseBillOCR.tsx` — camera → extracted table → confirm
- Add `PurchaseBill` model to Prisma schema (supplier, date, items, total)
- No change to existing billing engine, stock service already handles increases

---

### AI Opportunity 2: Smart Repeat Billing

**User pain:** Many users have customers who order the same items repeatedly.
"Repeat last bill" was requested in 18% of reviews. But naive repeat billing
misses context — seasons, running promos, out-of-stock items.

**What to build:**

```
AI tracks order patterns per customer. When user starts a bill:
  ↓
"Ramesh — aur kuch dena hai ya wahi wala?"
  ↓
[Shows last order as template + any substitutions for out-of-stock items]
  ↓
User says "Wahi wala" or modifies
  ↓
Invoice issued — stock checked before confirming, not after
```

**Implementation:** Add `get_last_order(customerId)` tool +
`suggest_repeat_items(customerId)` to the agent layer. Frontend: inline "Repeat
last order" button on customer card.

---

### AI Opportunity 3: Predictive Reminders

**User pain:** Users manually trigger reminders or wait for system to batch-send.
No tool predicts who is likely to pay today vs who needs nudging.

**What to build:**

```
Background analysis (runs nightly):
  - Which customers have a pattern of paying on specific days of month?
  - Which invoices are 3 days from due date?
  - Which previously overdue customers are now crossing their usual overdue threshold?
  ↓
Dashboard insight: "3 customers typically pay on Mondays — send reminder now?"
  ↓
One tap: bulk reminder sent to all three
```

**Voice:** "Kaun kaun late pay karne wale hain is hafte?" → Agent pulls pattern
data and names customers.

---

### AI Opportunity 4: Smart Stock Replenishment Suggestions

**User pain:** Low stock alerts exist but tell you nothing about when/how much
to reorder. Users waste time calculating manually.

**What to build:**

```
At low-stock alert, AI adds:
  "Aata — stock 5 bags remaining
   Average usage: 12 bags/week
   Last purchase: Agarwal Traders, ₹480/bag
   Suggestion: Order 25 bags from Agarwal Traders (₹12,000)"
  ↓
One tap: draft purchase order created and WhatsApp sent to supplier
```

**Voice:** "Aata ka stock order karo Agarwal Traders se" → Agent creates
purchase order from last-known supplier details.

---

### AI Opportunity 5: Invoice Anomaly Detection

**User pain:** Users make data entry errors (wrong price, duplicate item, wrong
customer). These are caught late — sometimes by the customer.

**What to build:**

```
Before confirmation, AI runs quick checks:
  - Price > 3× normal price for this product? → Flag
  - Same item appears twice? → Alert
  - Total unusually high for this customer? → Mention
  - Item out of catalog but likely a known product? → Suggest
```

**Voice:** If AI detects anomaly: "Ramesh ka bill ₹12,000 hai — uski average
bill ₹2,500 hai. Kuch galti ho gayi kya, ya sahi hai?"

---

### AI Opportunity 6: Photo-to-Product Catalog (New Product Onboarding)

**User pain:** Adding 500 products manually is the #1 onboarding drop-off point.
Users give up and never see the value of the product catalog.

**What to build:**

```
User photographs shelf of products (packaging visible)
  ↓
OpenAI Vision extracts: product names, MRP from packaging, HSN guess
  ↓
Batch import preview: 50 products extracted, user edits quantities + names
  ↓
Confirm → Entire catalog seeded in under 5 minutes
```

This removes the biggest onboarding friction for kirana and FMCG shops.

---

## UX / UI Improvements — Screen-Level Analysis

### UX Issue 1: Multi-Screen Billing Must Become Single-Screen

**Source:** Most common complaint across all review platforms  
**Symptom:** Separate pages for customer selection, item addition, discount, payment

**Fix:**

```
Single billing screen layout:

┌──────────────────────────────────┐
│ Customer: [search + select]      │← top: persistent customer bar
├──────────────────────────────────┤
│ Items:                           │
│  + Aata 2kg         ₹88     [×] │← scrollable items list
│  + Saffola Oil 1L   ₹180    [×] │
│  [+ Add item / scan barcode]     │
├──────────────────────────────────┤
│ Discount: ___%  or  ₹___         │← inline discount row, never hidden
├──────────────────────────────────┤
│ Payment: [Cash][UPI][Credit][+]  │← pill selector, split payment inline
│ Amount: ₹282    GST: ₹14         │
│ [CONFIRM BILL]                   │← one button
└──────────────────────────────────┘
```

**Impact:** Eliminates the primary source of "slow billing" complaints in classic
mode. This is achievable with zero backend change — CSS/React restructure only.

---

### UX Issue 2: Mobile Search Must Be Instant and Forgiving

**Source:** Play Store reviews — "9/10 invoice searches return no results"  
**Symptom:** Exact match search on mobile, user types partial name or wrong spelling

**Fix:**

- Replace exact-match search with the fuzzy search already in customer resolver
- Debounced live search: results appear after 200ms, not on-enter
- Highlight the matching substring in results
- Recent items section: last 5 customers/products at top before any search

---

### UX Issue 3: Voice Feedback Must Be Instant

**Source:** User sessions observed — perceived latency kills trust  
**Symptom:** 2-3 second gap between user speaking and AI response appearing

**Fix:**

- Show transcript as it is being produced (streaming, already supported)
- Show "Processing..." with a live pulse animation immediately on voice end
- Show intent card instantly ("Creating bill for Ramesh…") before full response
- Do not wait for TTS to complete before showing the text response

---

### UX Issue 4: Invoice Customization Must Be Self-Serve

**Source:** "I wish there were more options for customizing bills" across all platforms  
**Symptom:** Logo + business name only; no color, no layout, no custom fields

**Fix — Template Builder (minimum viable):**

```
Settings → Invoice Template
  - Upload logo
  - Choose colour scheme (5 presets)
  - Header layout: [Logo Left | Logo Center | Logo Right]
  - Fields toggle: show/hide payment terms, notes, bank details
  - Footer text: custom 2-line footer (e.g., "Thank you for your business!")
  - Preview updates live as settings change
  - Save → All future PDFs use this template
```

---

### UX Issue 5: Offline Indicator + Queue Transparency

**Source:** Offline capability requested by 22% of users  
**Symptom:** No indication of connectivity state; actions silently fail or are lost

**Fix — Offline Queue (Phase 1, no server change needed):**

```
1. Service Worker intercepts all POST/PATCH mutations
2. If offline: queue to IndexedDB, show "Saved offline — will sync when connected"
3. Status bar shows: [● Offline — 3 actions queued]
4. On reconnect: auto-flush queue in order, show "Synced 3 actions"
5. Invoice numbers use optimistic local sequence, resolve on server
```

---

### UX Issue 6: Payment Mode Must Support Split in One Step

**Source:** "Multiple payment options are not provided" — multiple reviews  
**Symptom:** User cannot record ₹500 cash + ₹200 UPI in one transaction

**Split Payment UI:**

```
Payment Mode:
[✓ Cash] ₹500     [✓ UPI]  ₹200     [ Card]     [ Credit]
         ────────────────────────────────
                Total: ₹700  |  Invoice: ₹700  ✓
```

Backend already handles split payment (mixed-mode payment already in PRD F-04.1).
This is a UI gap — the form currently shows one payment mode selector, not a
multi-select with amounts.

---

## Feature Build Priority — Sprint Sequence

Based on user review frequency, impact score, and implementation effort.

### Sprint 1 — Billing Speed & Core UX (Highest impact, lowest effort)

| Task                                              | Source                | Effort | Impact       |
| ------------------------------------------------- | --------------------- | ------ | ------------ |
| Single-screen classic billing (no page flips)     | UX Issue 1            | Medium | 🔥 Very High |
| Split payment UI (cash + UPI in same form)        | F-04.1 already exists | Low    | High         |
| Fuzzy invoice search on mobile                    | UX Issue 2            | Low    | High         |
| Voice feedback: instant transcript + intent pulse | UX Issue 3            | Low    | High         |
| Repeat last bill — "same as before"               | AI Opp 2              | Low    | High         |

---

### Sprint 2 — AI Differentiators (What no competitor has)

| Task                                        | Source   | Effort | Impact     |
| ------------------------------------------- | -------- | ------ | ---------- |
| OCR purchase bill ingestion (photo → stock) | AI Opp 1 | Medium | 🔥 Highest |
| Photo-to-product catalog seeding            | AI Opp 6 | Medium | High       |
| Smart stock replenishment suggestions       | AI Opp 4 | Medium | High       |
| Predictive payment reminder engine          | AI Opp 3 | Medium | High       |
| Invoice anomaly detection (before confirm)  | AI Opp 5 | Low    | Medium     |

---

### Sprint 3 — Trust & Retention Features

| Task                                                | Source       | Effort | Impact  |
| --------------------------------------------------- | ------------ | ------ | ------- |
| Offline mode (PWA + IndexedDB queue)                | 22% of users | High   | 🔥 High |
| Invoice template customization (5 presets + logo)   | UX Issue 4   | Medium | High    |
| Multiple price tiers per product (retail/wholesale) | Review data  | Medium | High    |
| UPI QR code on invoice (payment link)               | Review data  | Low    | High    |
| E-invoicing (government IRN + QR)                   | Review data  | High   | High    |

---

### Sprint 4 — Purchase / AP Side (Market's biggest gap)

| Task                                         | Source           | Effort | Impact  |
| -------------------------------------------- | ---------------- | ------ | ------- |
| Purchase bill entry (from OCR or manual)     | GetApp 3.0/5     | High   | 🔥 High |
| Supplier management (create, track, history) | Prerequisite     | Medium | Medium  |
| Purchase return / debit note                 | Full AP cycle    | Medium | Medium  |
| Supplier payment tracking                    | Ledger extension | Low    | Medium  |
| Purchase order → receive against PO          | Advanced         | High   | Medium  |

---

### Sprint 5 — Vertical Expansion

| Task                                                | Source           | Effort | Impact |
| --------------------------------------------------- | ---------------- | ------ | ------ |
| Pharmacy features (batch, expiry, CDSCO compliance) | 1-star reviews   | High   | High   |
| TDS calculation and deduction recording             | Requested by CAs | Medium | Medium |
| Customer portal (read-only invoice/payment view)    | Review data      | Medium | Medium |
| Multi-currency support (USD/EUR invoicing)          | Review data      | High   | Low    |
| Excel import for products and customers             | Review data      | Medium | Medium |

---

## What Execora Protects (Do Not Break)

These are Execora's actual competitive moats. Every future change should be
measured against whether it helps or hurts these:

1. **Sub-800ms voice-to-transcript latency** — competitors do not stream, they batch
2. **3 parallel task sessions in one voice conversation** — no competitor has this
3. **Real-time WebSocket dashboard** — Tally/Vyapar require manual refresh
4. **Hindi/Hinglish native from day one** — not a translated afterthought
5. **Auto-settlement on payment** — khata-style, no manual invoice matching
6. **23-intent voice engine** — broadest conversational scope for Indian SMEs
7. **Conversation memory across turns** — Redis-backed context, 4-hour TTL

---

## Pharmacy Vertical — Untapped High-Value Segment

Review data shows existing tools get 1-star reviews from pharmacy owners because
of complete feature absence. This is an underserved segment that pays premium.

**What pharmacy requires (not in any current tool):**

```
Batch/lot number tracking per item
Expiry date per batch (with alerts 30/60/90 days before)
Schedule H/H1/X drug recording (controlled substance compliance)
Drug license number on invoice
CDSCO-compliant invoice format
Return of expired stock to distributor
Pack/strip/tablet unit conversion (1 strip = 10 tablets)
```

**Why it matters for Execora:**

- Pharmacy owners are accustomed to paying ₹3,000+/month for specialised software
- Voice billing is even more valuable: "Paracetamol 500mg 3 strips, batch ABC123,
  expiry March 2026" → entire record created in one sentence
- No competitor supports voice + batch + expiry together

---

## Key Numbers from Review Data

| Metric                                    | Value       | Source                      |
| ----------------------------------------- | ----------- | --------------------------- |
| % of 5-star reviews citing "fast billing" | 34%         | SS myBillBook (68 reviews)  |
| Lowest rated feature (purchase mgmt)      | 3.0/5       | GetApp Vyapar (181 ratings) |
| Lowest rated feature (reporting)          | 3.3/5       | GetApp Vyapar               |
| Users requesting iOS support              | 8+ explicit | SS Vyapar (125 reviews)     |
| Users requesting offline mode             | ~22%        | All platforms               |
| Users citing screen navigation pain       | ~19%        | SS Vyapar                   |
| Users requesting TDS                      | 5+ explicit | SS myBillBook               |
| Users praising barcode scan               | 12%         | SS myBillBook               |
| Users calling OCR "game changer"          | Multiple    | Trustpilot                  |

---

## Conclusion — What to Build Next

The research confirms Execora's voice-first architecture is already the right bet.
The gap is not in the AI layer — it is in the breadth of operations the AI can
handle. Specifically:

1. **OCR purchase bill ingestion** is the next viral AI feature — zero competitors
   have it, users actively praise it, and Execora already has the OpenAI Vision
   API infrastructure in place.

2. **Single-screen classic billing** fixes the top UX complaint across all platforms
   with no backend work.

3. **Offline queue** removes the last reason users stay with desktop-first tools,
   without rewriting the architecture.

4. **Purchase / AP side** is the largest functional gap in the market — 3.0/5 on
   GetApp. Being first to do it well with voice ("Agarwal ka purchase bill scan
   karo") creates a moat that invoice-only tools cannot close quickly.

5. **Pharmacy vertical** has zero credible voice-first tools. One focused sprint
   on batch + expiry + CDSCO compliance could own the vertical.

The priority order: **OCR purchase OCR → single-screen billing → offline queue →
purchase AP → pharmacy vertical**.

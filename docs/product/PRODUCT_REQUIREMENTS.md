> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora — Master Product Requirements & Context Document

> **Purpose**: This document is the single source of truth for every agent, developer, and contributor working on Execora.
> Read this before writing any code, designing any feature, or planning any sprint.
> It covers **what we are building, why, for whom, and exactly how** — grounded in real Indian SME use cases.
>
> **Maintained by**: Update this document whenever a feature ships, a use case is validated, or competitive landscape shifts.
> **Version**: 2.10 — 2026-03-17
>
> **Invoice requirements**: See `docs/INVOICE_REQUIREMENTS.md` for full improvement checklist (quick wins, GST compliance, user-requested, competitor parity).

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Target Users — Real Personas](#2-target-users--real-personas)
3. [Real-World Use Cases by Time Horizon](#3-real-world-use-cases-by-time-horizon)
4. [Complete Feature Requirements](#4-complete-feature-requirements)
5. [Billing Scenarios — All Variants](#5-billing-scenarios--all-variants)
6. [Three Execution Modes — Architecture Deep Dive](#6-three-execution-modes--architecture-deep-dive)
7. [Live Dashboard & WebSocket Architecture](#7-live-dashboard--websocket-architecture)
8. [Language Support — Multilingual Engine](#8-language-support--multilingual-engine)
9. [Competitor Analysis & Differentiation](#9-competitor-analysis--differentiation)
10. [Technology Architecture](#10-technology-architecture)
11. [Feature Priority Matrix](#11-feature-priority-matrix)
12. [Growth Strategy](#12-growth-strategy)
13. [What Is Built vs What Is Pending](#13-what-is-built-vs-what-is-pending)
14. [User Research Findings](#14-user-research-findings--review-backed-priority-updates-v24)
15. [Sprint 9 — Plan](#15-sprint-9--plan-2026-03-05-onwards)
16. [Sprint 10 — Plan](#16-sprint-10--plan-2026-03-07-onwards)

---

## 1. Product Vision

### One-Line

> **"Bolo aur becho"** — Speak and sell. Execora is the voice-first business operating system for India's 12 million kirana stores and small merchants who prefer speaking over typing.

### The Core Problem

A kirana store owner in Kanpur serves 300 customers per day:

- Bills are written on paper or not written at all
- GST means nothing to them — non-compliance is a daily risk
- Udaar (credit to customers) is tracked in a notebook that gets lost
- WhatsApp is how they talk to everyone — but there's no business intelligence in it
- Tally is too expensive (₹26,550 one-time) and requires a trained accountant
- Zoho/Odoo are built for offices, not shops
- Vyapar works but forces typing product names on a mobile keyboard mid-rush hour

**Execora solves this by making the shop owner's voice the only interface they need.**

### What Execora Is

Execora is a **real-time voice-driven business operating system** that:

- Understands Hindi, Hinglish, and regional language commands
- Creates GST-compliant invoices from spoken words in under 3 seconds
- Tracks inventory, customer credit (udaar), and payments automatically
- Sends WhatsApp payment reminders automatically
- Shows a live business dashboard that updates in real time via WebSocket
- Works in both **Agent Mode** (voice AI) and **Classic Mode** (manual forms/UI)
- Runs on mobile, tablet, and desktop

---

## 2. Target Users — Real Personas

### Persona 1: Suresh — Kirana Store Owner (Primary)

- **Location**: Tier-2 city (Kanpur, Bhopal, Indore, Patna, Surat)
- **Business**: General grocery store, 300-500 customers/day, ₹50,000-2,00,000 daily turnover
- **Tech level**: Uses WhatsApp heavily, UPI daily, but types slowly on phones
- **Language**: Hindi primary, some English words
- **Pain points**:
  - Creating bills mid-rush is too slow with any typing app
  - GST filing is outsourced to a CA at extra cost because he can't operate Tally
  - 50-100 customers on credit (udaar) — he forgets who owes what
  - Stock runs out without warning (especially flour, oil, salt)
  - Collecting payments from credit customers requires awkward phone calls
- **What he needs**: Say the order in Hindi → invoice done → WhatsApp reminder sent → stock updated → no more paper

### Persona 2: Meena — Cosmetics/FMCG Shop Owner

- **Location**: Tier-1 suburb (Malad Mumbai, Dilsukhnagar Hyderabad, Rajajinagar Bangalore)
- **Business**: Beauty products, skincare, cosmetics — 80-150 customers/day
- **Language**: Hindi + regional (Marathi/Telugu/Kannada)
- **Pain points**:
  - Product names are complex (English brand names + Hindi quantities)
  - Product expiry tracking is manual
  - Small margin business — GST input credit matters a lot
  - Many loyal customers on monthly credit

### Persona 3: Ramesh — Small Wholesaler/Distributor

- **Location**: Mandi area or industrial estate
- **Business**: Supplies 50-200 kirana stores, ₹5-50 lakh daily B2B turnover
- **Language**: Hindi + local language
- **Pain points**:
  - Orders come via WhatsApp voice notes all day
  - Each kirana store has different pricing (volume discounts)
  - Credit cycles of 15-30 days make cash flow hard to track
  - Delivery tracking is manual
  - B2B invoices must be GST-compliant with proper GSTIN of buyer

### Persona 4: Priya — Pharmacy Owner

- **Location**: Any tier city
- **Business**: Pharmacy, 100-200 daily prescriptions + OTC
- **Language**: Hindi + English
- **Pain points**:
  - Drug names are complex (brand + generic + dose)
  - Expiry date tracking is mandatory
  - Batch number tracking for returns/recalls
  - GST rates vary per drug category (0%, 5%, 12%)

---

## 3. Real-World Use Cases by Time Horizon

### Daily Use Cases (Every Single Day)

#### Morning (7-9 AM) — Opening Procedures

```
UC-D-01: Morning stock check
  - Shopkeeper says "aaj ka stock dikhao" or opens dashboard
  - System shows overnight out-of-stock items, low stock alerts
  - System shows pending payments due today
  - System shows today's reminders scheduled

UC-D-02: Open reminder queue
  - System auto-sends WhatsApp reminders for due payments at configured time
  - Shopkeeper reviews list: "Ramesh ka ₹1,200 due hai aaj"
```

#### Peak Hours (10 AM - 1 PM, 5 PM - 8 PM) — Billing Rush

```
UC-D-03: Voice bill creation — known customer with name
  Input: "Raju ka bill banao — do kilo aata, ek packet Maggi, ek Amul butter"
  Flow: Name resolved (fuzzy match) → items parsed → stock checked →
        draft created → "Raju ka bill ₹186 ready hai, confirm?"
        → Confirmed → Invoice issued → Stock deducted → PDF generated
        → WhatsApp link sent to Raju

UC-D-04: Voice bill — walk-in customer (NO NAME)
  Input: "Bina naam ka bill — ek kilo chawal, ek tel"
  Flow: Walk-in customer record used (generic "Walk-in Customer") →
        No customer lookup → Invoice created directly → Printed/shown
  Critical: Most kirana stores do 40-60% of business with anonymous customers.
            System MUST support name-less billing. Do NOT require name.

UC-D-05: Voice bill — direct amount with discount
  Input: "Seema ko 500 ka saman diya, 10% discount de do"
  Flow: ₹500 bill → 10% discount applied (₹50 off) → ₹450 total → Invoice

UC-D-06: Quick counter bill — no GST
  Input: "3 kilo pyaaz 60 rupay kilo, cash bill do"
  Flow: Non-GST bill for fresh produce (GST exempt) → Quick invoice
        Customer does NOT want GST, just a cash memo / pucca bill

UC-D-07: Bill with custom product (not in catalog)
  Input: "Ek naya maal aaya hai — 'Surf Excel 1kg' 95 rupay, do packet Ramesh ko"
  Flow: Product not found → Auto-create with name "Surf Excel 1kg" @ ₹95 →
        Add to catalog → Bill created → Owner can update details later

UC-D-08: Partial payment at billing
  Input: "Raju ka ₹500 ka bill, usne ₹300 diya abhi"
  Flow: Invoice created ₹500 → Payment of ₹300 recorded immediately →
        Balance ₹200 added to Raju's udaar → Status: partial

UC-D-09: Bulk/wholesale order voice entry
  Input: "Godown ke liye — 50 bags aata @ 480 each, 30 boxes tel @ 1100 each"
  Flow: Large quantity parsed → Stock availability checked →
        Draft shows ₹56,500 total → Confirm → Issue

UC-D-10: GST bill with customer GSTIN
  Input: "Sharma Provision Store ka GST bill — GSTIN 09AABCS1429B1Z1 daalo"
  Flow: GSTIN validated → B2B invoice created with buyer GSTIN →
        IGST/CGST/SGST applied based on same-state/different-state →
        PDF has all GST fields required for input credit claim
```

#### Afternoon (1-4 PM) — Admin and Reconciliation

```
UC-D-11: Record payment received
  Input: "Ramesh ne ₹2,000 diye — UPI se"
  Flow: Payment recorded → Oldest pending invoice marked paid →
        Remaining applied to next → Customer balance updated →
        WhatsApp confirmation sent to Ramesh

UC-D-12: Check who owes money
  Input: "Aaj kiski payment pending hai?"
  Flow: List of customers with outstanding balance > 0 shown →
        Sorted by amount or days overdue

UC-D-13: Add new customer
  Input: "Ek naya customer add karo — Sunita Devi, phone 9876543210, Gandhi Nagar wali"
  Flow: Customer created with name, phone, landmark →
        System checks for duplicates first

UC-D-14: Edit existing invoice (classic mode)
  - User opens invoice from dashboard → Edit items, quantities, prices →
    Re-calculate totals → Save → Stock adjusted for the difference

UC-D-15: Cancel invoice
  Input: "Invoice IN2024-0042 cancel karo, Ramesh ne maal wapas kiya"
  Flow: Invoice cancelled → Stock restored → Customer balance adjusted →
        Cancellation noted with reason

UC-D-16: Stock adjustment — manual
  Input: "50 kilo aata aaya — supplier se"
  Flow: Stock addition → Movement recorded (purchase) → Low stock alert cleared

UC-D-17: Check specific product stock
  Input: "Amul butter kitna bacha hai?"
  Flow: Product found (fuzzy) → Stock count shown → Low/out badge shown
```

#### Evening (6-10 PM) — Daily Close

```
UC-D-18: Daily summary
  Input: "Aaj ka hisaab sunao" OR opens Dashboard
  Flow: Total invoices, total sales, cash received, UPI received,
        pending/udaar added today, new customers, top products sold

UC-D-19: Reconcile cash
  Input: "Aaj cash mein kitna aaya?"
  Flow: All cash payments for today totaled → Compare with what's in drawer

UC-D-20: End-of-day reminder scheduling
  Input: "Kal subah Ramesh ko reminder bhejo — ₹1,500 baki hai"
  Flow: Reminder scheduled → BullMQ job created → WhatsApp sent at scheduled time
```

---

### Weekly Use Cases

```
UC-W-01: Weekly sales report
  - "Is hafte ka report dikhao"
  - Total sales, daily breakdown bar chart, top 5 products, top 5 customers
  - Payment method breakdown (cash vs UPI vs credit)
  - Week-over-week comparison

UC-W-02: Pending payments review
  - "7 din se zyada purane pending payments kaun se hain?"
  - List with customer name, amount, days overdue
  - Bulk WhatsApp reminder to all overdue customers

UC-W-03: Inventory replenishment
  - "Is hafte kya khatam hua?"
  - Products that hit zero stock this week → Order suggestion
  - Fast-moving products report (top sellers by units sold)

UC-W-04: Customer activity review
  - New customers added this week
  - Inactive customers (not bought in 7 days, but had history)
  - Customers who paid this week

UC-W-05: Staff task reminders
  - "Shaniwar ko sabhi shelf check karo" → Reminder to staff
  - Recurring weekly reminders for cleaning, stock count, price updates
```

---

### Monthly Use Cases

```
UC-M-01: GST summary for filing
  - Total taxable sales, CGST collected, SGST collected, IGST collected
  - Grouped by HSN code
  - Export for CA / GSTR-1 preparation
  - B2B invoice list with buyer GSTINs

UC-M-02: Monthly P&L overview
  - Total revenue, total cost of goods (if purchase prices entered),
  - Gross margin estimate, pending collections, refunds/cancellations

UC-M-03: Top customers of the month
  - By purchase value, by frequency
  - Identify VIP customers for loyalty/discount

UC-M-04: Slow-moving inventory
  - Products not sold in 30 days → Consider promotion or removal
  - Stock aging report

UC-M-05: Recurring payment reminders (monthly credit)
  - Some customers pay on 1st of month
  - Recurring reminder: auto-schedule for 1st of each month
  - "Har mahine ki 1 tarikh ko Sharma ji ko ₹5,000 ka reminder bhejo"

UC-M-06: New product catalog update
  - Add new products from supplier invoices in bulk
  - Update prices for existing products (wholesale price change)

UC-M-07: Customer credit limit review
  - Customers exceeding credit limit → Alert on new invoice
  - Monthly audit of udaar balances
```

---

### Yearly Use Cases

```
UC-Y-01: Annual GST audit preparation
  - Full year GSTR-1 data export
  - HSN-wise summary for annual return
  - B2B vs B2C split

UC-Y-02: Yearly revenue comparison
  - This year vs last year, month-by-month chart
  - Best month, worst month, seasonal patterns

UC-Y-03: Customer loyalty analysis
  - Top 20 customers by annual spend
  - Customer retention rate (came back vs churned)
  - New customer acquisition per month

UC-Y-04: Product performance annual
  - Best sellers, worst sellers, never-sold products
  - Profitability by product category

UC-Y-05: Financial year rollover
  - Invoice counter resets on April 1 (Indian FY)
  - New sequence: INV/2025-26/001
  - Previous FY data archived but searchable

UC-Y-06: Annual report for CA/auditor
  - Exportable ledger, invoice list, payment history
  - Structured for GST audit assistance
```

---

## 4. Complete Feature Requirements

### F-01: Billing & Invoice Engine

#### F-01.1 — Invoice Creation Modes

| Mode                 | Description                                        | Priority |
| -------------------- | -------------------------------------------------- | -------- |
| Voice (Agent Mode)   | Speak in Hindi/English → AI parses → invoice draft | P0       |
| Form (Classic Mode)  | Manual form with customer + items                  | P0       |
| Quick Bill (Walk-in) | No customer name required                          | P0       |
| Repeat Last Bill     | "Same as Ramesh's last bill"                       | P1       |
| Barcode Scan         | Scan product → auto-add to bill                    | P2       |
| Template Bill        | Pre-saved bill for frequent orders                 | P2       |

#### F-01.2 — Invoice Types

| Type              | Description                                      | GST Treatment           |
| ----------------- | ------------------------------------------------ | ----------------------- |
| B2C with GST      | Retail customer, GSTIN not required              | CGST+SGST (intra-state) |
| B2B with GST      | Business customer with GSTIN                     | CGST+SGST or IGST       |
| Non-GST cash memo | Fresh produce, exempt items, unregistered seller | No GST                  |
| Credit note       | Goods returned, invoice cancelled                | Negative amounts        |
| Proforma invoice  | Quote/estimate, not final                        | No tax collection       |

#### F-01.3 — Invoice Fields

```
Required: customer (or walk-in), items (name + qty + price), date
Optional: GSTIN, HSN codes, discount %, payment mode, notes, email
Auto-computed: subtotal, GST breakup, total, invoice number (FY-based sequence)
```

#### F-01.4 — Discount Handling

```
Item-level discount: each item has its own discount %
Bill-level discount: applied after subtotal (before GST)
Round-off: ±₹1 rounding for cash bills
Trade discount: applies before GST (reduces taxable value)
Cash discount: applies after GST (shown separately)
```

#### F-01.5 — Multi-Turn Draft Flow (Voice)

```
Turn 1: "Ramesh ka bill"  → "Ramesh Sharma? Kya dena hai?"
Turn 2: "2 aata 1 tel"   → "2 kg Aata ₹88, 1L Saffola ₹180. Aur kuch?"
Turn 3: "Ek Maggi bhi"   → "Maggi ₹14 add. Total ₹282. GST lagaun?"
Turn 4: "Haan confirm"   → Invoice issued, stock deducted, WhatsApp sent
OR Turn 4: "GST mat lagao, naya price ₹250 kar"  → "₹250 fixed. Confirm?"
```

#### F-01.6 — Invoice Editing (Post-Creation)

```
- Edit items (add/remove/change qty) on PENDING invoices
- Change customer on PENDING invoices
- Apply discount to existing invoice
- Change payment status
- Add notes
- CANNOT edit PAID or CANCELLED invoices (only admins can)
- Every edit creates an audit trail entry
```

#### F-01.7 — Invoice Numbering

```
Format: INV/2025-26/00001
Resets: April 1 every year (Indian Financial Year)
Sequence: Per-tenant, atomic, gap-free
B2B format: Can be customized per business (e.g., prefix with shop code)
```

---

### F-02: Customer Management

#### F-02.1 — Customer Profile

```
Core: name, phone, email (optional)
Identity helpers: nickname ("Chhote bhaiya"), landmark ("market ke paas wala")
Business: GSTIN (for B2B), credit limit, payment terms (net 7/15/30 days)
Analytics: total purchases, total payments, balance, last visit date
Tags: VIP, blacklisted, new, wholesale
```

#### F-02.2 — Customer Search / Resolution

```
- Exact phone match (highest priority)
- Fuzzy name match (Levenshtein distance + token overlap)
- Nickname match ("Chhote" → "Ramesh Chhote Lal Sharma")
- Landmark match ("Gandhi Nagar wala" → "Suresh Gandhi Nagar")
- Recent interaction priority (more recent = ranked higher)
- Disambiguation: if 2+ matches, ask "Ramesh Sharma ya Ramesh Gupta?"
```

#### F-02.3 — Walk-In Customer

```
- System has a pre-created "Walk-in Customer" record per tenant
- All anonymous bills link to this record
- Daily walk-in total tracked separately
- Walk-in customer cannot have udaar balance
- Optional: ask "naam denge?" at end of each walk-in bill
```

#### F-02.4 — Customer Credit (Udaar)

```
- Balance field: positive = customer owes shop, negative = shop owes customer
- Credit limit: alert when customer tries to exceed limit
- Credit history: every udaar transaction listed chronologically
- Oldest-first settlement when payment received (khata style)
- Credit freeze: block new sales if customer exceeds credit limit (configurable)
```

---

### F-03: Inventory & Stock Management

#### F-03.1 — Product Catalog

```
Fields: name, category, HSN code, GST rate, unit (kg/g/ltr/ml/piece/packet/box/dozen/bundle)
Price: selling price, MRP, purchase price (cost), wholesale price tier
Stock: current stock, minimum stock level (reorder point)
Identity: barcode (EAN/QR), SKU code
Variants: size variants (250g, 500g, 1kg packs of same product)
Expiry: best-before date tracking (for pharma/FMCG)
```

#### F-03.2 — Stock Movements (Audit Trail)

| Movement Type        | Trigger                    | Stock Change         |
| -------------------- | -------------------------- | -------------------- |
| sale                 | Invoice confirmed          | Decrease             |
| purchase             | Supplier invoice entered   | Increase             |
| return_from_customer | Credit note / cancellation | Increase             |
| return_to_supplier   | Supplier return            | Decrease             |
| damage               | Manual entry               | Decrease             |
| expiry               | Manual or auto-detected    | Decrease             |
| adjustment           | Physical count mismatch    | Increase or Decrease |
| opening_stock        | Initial entry              | Set to value         |

#### F-03.3 — Low Stock & Alerts

```
- Configurable per product: minStock threshold
- Real-time alert when stock ≤ minStock
- Dashboard widget: Low Stock Alerts (P0)
- Voice alert: "Aata ka stock kam ho gaya — 2 bags bacha hai"
- Auto-suggest reorder from last supplier
- WebSocket push to dashboard on stock crossing threshold
```

#### F-03.4 — Fast-Moving Products Report

```
- Top N products by units sold (configurable: last 7/30/90 days)
- Real data from SUM(invoice_items.quantity) — NOT sorted by lowest stock
- Shown on dashboard with stock remaining
- Alert if fast-moving product has low stock
```

---

### F-04: Payment & Ledger

#### F-04.1 — Payment Recording

```
Payment methods: Cash, UPI (PhonePe/GPay/Paytm), Card (debit/credit),
                 Bank transfer (NEFT/RTGS/IMPS), Credit (udaar), Cheque
Multi-mode: one payment can be split (₹500 cash + ₹500 UPI)
Partial payment: record ₹X against invoice of ₹Y → balance remains
Excess payment: customer pays more than due → credit added to account
Advance payment: before invoice is raised (deposit)
```

#### F-04.2 — Auto-Settlement (Khata Style)

```
When payment received:
1. Apply to oldest PENDING invoice first
2. If payment > that invoice → mark paid, carry remaining forward
3. Apply remaining to next oldest PENDING invoice
4. Continue until payment exhausted or all invoices paid
5. Any remaining amount → customer credit balance (advance)
```

#### F-04.3 — Ledger Entries

```
Immutable (no edits after creation)
Every entry has: type, amount, description, created_at, payment_mode
Types: invoice (debit), payment (credit), credit_note (credit), advance (credit)
Audit trail: every financial event is a ledger row
```

#### F-04.4 — Payment Analytics

```
Daily: cash vs UPI vs credit breakdown
Weekly: payment collection chart
Monthly: DSO (days sales outstanding) per customer
Overdue tracking: invoices > 7/15/30/60 days unpaid
```

---

### F-05: Reminder & Notification Engine

#### F-05.1 — Reminder Types

| Type             | Use Case                   | Channel              |
| ---------------- | -------------------------- | -------------------- |
| payment_due      | "₹500 due today"           | WhatsApp             |
| payment_overdue  | "₹500 overdue 7 days"      | WhatsApp             |
| invoice_reminder | "Invoice #123 pending"     | WhatsApp             |
| low_stock        | "Aata running low"         | Internal dashboard   |
| expiry_alert     | "Batch expires in 7 days"  | WhatsApp / dashboard |
| birthday         | Customer birthday greeting | WhatsApp             |
| follow_up        | Custom follow-up           | WhatsApp             |
| gst_filing       | Monthly GST filing due     | Internal dashboard   |
| staff_task       | "Clean shelves Saturday"   | Internal dashboard   |
| custom           | Any free-text reminder     | WhatsApp / dashboard |

#### F-05.2 — Scheduling Formats (Natural Language)

```
"Kal subah 9 baje"           → tomorrow 09:00
"Parso shaam 5 baje"         → day after tomorrow 17:00
"Shukravar ko dopahar 2 baje" → Friday 14:00
"15 tarikh ko"               → 15th of current month
"Har mahine ki 1 tarikh"     → recurring, 1st of month, 10:00 default
"Har hafte Shaniwar"         → recurring, every Saturday
"Aaj raat 8 baje"            → today 20:00
"3 din baad"                 → now + 72 hours
```

#### F-05.3 — Bulk Reminders

```
"Saare pending customers ko reminder bhejo" →
  All customers with balance > 0 → WhatsApp sent with their specific amount
Configurable message template with {customer_name}, {amount}, {shop_name}
```

#### F-05.4 — Reminder Delivery & Status

| Channel                   | Status     | Notes                                           |
| ------------------------- | ---------- | ----------------------------------------------- |
| WhatsApp (Meta Cloud API) | ✅ Built   | Primary channel, delivery status tracked        |
| Email (Nodemailer/SMTP)   | 🔴 TODO    | Secondary channel, formal reminders             |
| In-app dashboard          | ✅ Built   | Staff tasks, GST alerts, internal notifications |
| SMS                       | 🔴 TODO P2 | Fallback if WhatsApp + email both fail          |

```
Status tracking: scheduled → sent → delivered → read → failed
Retry on failure: 3 attempts, exponential backoff (5m, 30m, 2h)
Fallback chain: WhatsApp fails → retry 3x → then trigger email reminder
Failed after all retries = alert on dashboard
```

---

### F-06: Voice Engine (Agent Mode)

#### F-06.1 — Speech-to-Text Pipeline

```
Input: Raw PCM audio (16kHz, mono) streamed via WebSocket
STT providers: Deepgram (primary), ElevenLabs (secondary), Browser WebSpeech (free fallback)
Output: Real-time transcript streaming to browser (< 800ms latency)
Language detection: auto-detect Hindi vs English vs mixed
Hinglish handling: native support for code-switching
```

#### F-06.2 — Intent Classification (23 Intents)

```
CREATE_INVOICE       — "Ramesh ka bill banao"
CONFIRM_INVOICE      — "Haan", "Confirm", "Theek hai"
CANCEL_INVOICE       — "Ruko", "Cancel", "Nahi chahiye"
MODIFY_INVOICE_ITEM  — "Ek aur Maggi add karo", "Aata 3 kilo karo"
SHOW_PENDING_INVOICE — "Abhi ka bill dikhao"
TOGGLE_GST           — "GST lagao", "GST hatao"
ADD_DISCOUNT         — "10% discount do", "₹50 kam karo"
RECORD_PAYMENT       — "Ramesh ne ₹500 diye"
ADD_CREDIT           — "Ramesh ko ₹200 credit do"
CHECK_BALANCE        — "Ramesh ka balance kya hai?"
CHECK_STOCK          — "Aata kitna bacha hai?"
UPDATE_STOCK         — "50 kilo aata aaya"
CREATE_CUSTOMER      — "Naya customer add karo"
UPDATE_CUSTOMER      — "Ramesh ka phone number update karo"
GET_CUSTOMER_INFO    — "Ramesh ki history dikhao"
DELETE_CUSTOMER_DATA — "Ramesh ka data delete karo" (admin only)
CREATE_REMINDER      — "Kal Ramesh ko reminder bhejo"
CANCEL_REMINDER      — "Reminder cancel karo"
LIST_REMINDERS       — "Aaj ke reminders dikhao"
LIST_CUSTOMER_BALANCES — "Kiski payment pending hai?"
TOTAL_PENDING_AMOUNT — "Kul kitna baaki hai?"
DAILY_SUMMARY        — "Aaj ka hisaab"
SWITCH_LANGUAGE      — "English mein baat karo"
```

#### F-06.3 — Conversation Memory (Context)

```
- Redis-backed, 4-hour TTL, per session
- Last 20 turns in context for every LLM call
- Active customer tracking: "Ramesh" in turn 1 stays active for next 10 turns
- Pending draft injection: if invoice draft exists, it's in every LLM prompt
- Recent customer list: last 5 mentioned customers for disambiguation
```

#### F-06.4 — Real-Time Multi-Task

```
- Up to 3 parallel tasks per session
- Priority-based: new task = higher priority interrupts
- Each task has: id, intent, status (queued/running/completed/failed)
- Real-time status pushed via WebSocket
- Context preserved: each task remembers its own customer + draft
- Task cancellation: "Ye wala task cancel karo"
```

#### F-06.5 — TTS (Text-to-Speech) Response

```
Providers: ElevenLabs (Hindi voice), OpenAI TTS, Browser Speech API
Language: matches detected input language
Voice: configurable per tenant
User setting: stored in localStorage, echoed to backend on session start
Streaming: audio chunks sent via WebSocket as they are generated
```

---

### F-07: Classic Mode (Non-Voice UI)

#### F-07.1 — Dashboard

```
Real-time widgets (all WebSocket-powered):
- Today's revenue (₹)
- Today's invoice count
- Pending collections total
- New customers today
- Low stock alerts count
- Business health score

Charts:
- Weekly sales bar chart (daily revenue by payment method)
- Monthly revenue trend line
- Payment method pie chart (cash vs UPI vs credit)
- Top 5 products this month

Quick actions:
- New Invoice button
- Record Payment button
- Add Customer button
- Check Stock button
```

#### F-07.2 — Invoice Management Page

```
List view: all invoices with filters (status, date range, customer)
Detail view: full invoice with all line items, payment history
Actions: view PDF, send WhatsApp, mark paid, cancel, edit (if PENDING)
Search: by invoice number, customer name, amount
Bulk actions: export to CSV, bulk mark paid
```

#### F-07.3 — Customer Page

```
List: all customers, searchable, with outstanding balance badge
Detail: profile, invoice history, payment history, ledger
Quick actions: Record payment, Send reminder, Create invoice for this customer
```

#### F-07.4 — Inventory Page

```
Product list: search, filter by category, stock status
Low stock view: only products at or below reorder point
Actions: Edit product, adjust stock (add/remove), view movement history
Add product form: all fields
Bulk update: import from Excel/CSV (P2)
```

#### F-07.5 — Reports Page

```
Daily report: single day P&L
Date range report: custom from-to period
GST report: tax collected by rate, ready for GSTR-1 input
Top customers: by revenue, by frequency
Top products: by units sold, by revenue
Payment method report: cash vs UPI vs credit
Export: PDF and CSV
```

#### F-07.6 — Settings Page

```
Business profile: name, address, GSTIN, logo
Invoice settings: prefix, starting number, terms & conditions
Voice settings: TTS provider selection (Browser/ElevenLabs/OpenAI)
Notification settings: WhatsApp number, reminder defaults
User management: invite staff, set roles/permissions
Integrations: WhatsApp API key, email SMTP
```

---

## 5. Billing Scenarios — All Variants

### Scenario Matrix

| #    | Customer      | GST      | Discount        | Payment        | Scenario Name                 |
| ---- | ------------- | -------- | --------------- | -------------- | ----------------------------- |
| S-01 | Named         | With GST | None            | Cash           | Standard kirana bill          |
| S-02 | Walk-in       | With GST | None            | UPI            | Anonymous GST bill            |
| S-03 | Named         | No GST   | None            | Credit (udaar) | Fresh produce / exempt items  |
| S-04 | Walk-in       | No GST   | None            | Cash           | Quick cash memo               |
| S-05 | Named         | With GST | Item discount   | Cash+UPI       | Mixed payment with discount   |
| S-06 | Named         | With GST | Bill discount % | Credit         | Wholesale % discount          |
| S-07 | Named (GSTIN) | With GST | None            | Bank transfer  | B2B GST invoice               |
| S-08 | Named         | With GST | None            | Partial        | Part payment at billing       |
| S-09 | Walk-in       | No GST   | ₹X off          | Cash           | Fixed amount discount         |
| S-10 | Named         | With GST | None            | Advance        | Customer paid advance, deduct |
| S-11 | Named         | With GST | None            | UPI            | Same day bill + payment       |
| S-12 | Named         | No GST   | None            | Cash           | Agriculture/composite scheme  |

### Scenario S-01 Voice Example — Standard Bill

```
User: "Ramesh ka bill — 2 aata, ek chawal, ek tel, Amul butter"
AI:   "Ramesh Sharma? 2kg Aata ₹88, 1kg Chawal ₹72, 1L Saffola ₹180, Amul Butter ₹52. Total ₹392 + GST = ₹420. Confirm?"
User: "Haan"
→ Invoice IN/2025-26/00342 created → Stock deducted → WhatsApp sent to Ramesh
```

### Scenario S-04 Voice Example — Walk-In, No GST

```
User: "Bina naam ke — do pyaaz kilo 40 rupay, ek packet namak"
AI:   "Walk-in customer. 2kg Pyaaz ₹80, 1 Namak ₹20. Total ₹100. Cash bill, GST nahi. Confirm?"
User: "Ha de do"
→ Quick cash memo created → No stock deduction if not in catalog → Print/show
```

### Scenario S-05 Voice Example — Mixed Payment + Discount

```
User: "Seema ka bill — 5 soap, 2 shampoo, 10% discount, 500 cash diye baaki UPI se"
AI:   "Seema Gupta? 5 Lux Soap ₹225, 2 Dove Shampoo ₹380. Subtotal ₹605.
       10% discount ₹60.50. Total ₹544.50 + GST = ₹570.
       ₹500 cash, ₹70 UPI. Confirm?"
User: "Haan"
→ Invoice with split payment recorded
```

### Scenario S-07 Voice Example — B2B GST Invoice

```
User: "Sharma Provision Store ka GST bill — unka GSTIN 09AABCS1429B1Z1 —
       100 aata bags 480 rupay each, 50 tel can 1100 rupay"
AI:   "B2B invoice for Sharma Provision Store (GSTIN confirmed).
       100x Aata ₹48,000 + 50x Tel ₹55,000. Subtotal ₹1,03,000.
       Same state — CGST ₹2,575 + SGST ₹2,575. Total ₹1,08,150. Confirm?"
User: "Haan"
→ B2B invoice with full GST breakdown → PDF emailed → Credit in ledger
```

---

## 6. Three Execution Modes — Architecture Deep Dive

Execora has **three distinct execution modes**. Understanding the difference between them is critical before writing any code or designing any feature.

---

### Mode 1: Intent-Based Mode (Current Voice Implementation)

> ⚠️ This is what Execora currently calls "voice mode". It is **NOT** a true AI Agent. It is a deterministic intent dispatcher where the LLM is only used for structured extraction and response phrasing.

#### How It Works (Current)

```
[Browser Mic] ──PCM audio──► [WebSocket /ws]
                                    │
                          [STT: Deepgram/ElevenLabs/Browser]
                                    │
                          [Raw transcript: "Ramesh ka bill do aata"]
                                    │
                          [LLM Call 1: Intent Extraction]
                          Prompt: "Extract intent + entities as JSON"
                          Context: last 20 turns + active customer + pending draft
                                    │
                          [Structured JSON output]
                          {
                            "intent": "CREATE_INVOICE",
                            "entities": {
                              "customerName": "Ramesh",
                              "items": [{ "name": "aata", "qty": 2 }]
                            }
                          }
                                    │
                          [switch(intent) → fixed handler]
                          executeCreateInvoice(entities, conversationId)
                                    │
                    ┌──────────────┴──────────────────┐
                    │                                  │
          [Business Services]                [BullMQ async jobs]
    (invoice.service, customer.service,     (WhatsApp, PDF,
     ledger.service, product.service)        email delivery)
                    │
                    ▼
          [PostgreSQL + Redis]
                    │
          [WebSocket broadcast → all tenant clients]
                    │
          [LLM Call 2: Response Generation]
          Prompt: "Generate a natural Hindi reply to the user"
                    │
          [TTS: ElevenLabs/OpenAI → Audio → Client]
```

#### Characteristics of Intent-Based Mode

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| LLM role             | Extraction only (input) + phrasing only (output). Does NOT decide logic. |
| Execution path       | 100% deterministic — `switch(intent)` in `engine/index.ts`               |
| Tool calling         | None — handler code is pre-written, not dynamically selected             |
| Multi-step reasoning | None — one intent = one handler = one result                             |
| Error recovery       | None — if intent unknown, returns `UNKNOWN_INTENT` error                 |
| Context injection    | Manual — conversation history + draft injected into prompt as text       |
| Reliability          | Very high — no hallucination in execution path                           |
| Speed                | Fast — one extraction call + one response call                           |

#### When It Fails

```
User: "Ramesh ka bill banao... nahi ruko, pehle uska balance check karo,
       phir agar 1000 se zyada hai toh bill mat banao"

Intent-based mode: Extracts only ONE intent (CHECK_BALANCE or CREATE_INVOICE).
Cannot chain: check balance → conditional logic → create/reject invoice.
Cannot reason: "if X then Y else Z" is not in the intent schema.
```

---

### Mode 2: Form/Dashboard Mode (Classic UI)

> This is the traditional web dashboard. No AI in the execution path. Direct REST API calls from React components. This is what competitors like Vyapar and Khatabook call their "product".

#### How It Works

```
[Browser: React UI forms/buttons]
        │ HTTP REST
        ▼
[Fastify API Routes: /api/v1/...]
        │
[Business Services (same as above)]
        │
[PostgreSQL + Redis]
        │
[WebSocket broadcast `event:name` to all tenant clients]
        │
[React Query cache invalidation → UI re-renders]
```

#### Characteristics of Form/Dashboard Mode

| Property        | Value                                    |
| --------------- | ---------------------------------------- |
| AI involvement  | None                                     |
| Execution       | Direct service calls from route handlers |
| Speed for forms | 30-90 seconds per operation              |
| Hands-free      | No                                       |
| Bulk operations | Easy (checkboxes, filters)               |
| Complex edits   | Easy (visual forms)                      |
| Offline-ready   | Yes (can cache with service worker)      |

#### The Killer Feature: Same WebSocket = Real-Time Sync

```
User A speaks in Intent-Based Mode (shop counter, mobile).
User B watches Form/Dashboard Mode (back office, tablet).

When User A creates an invoice via voice:
→ Invoice saved to DB (same service, same transaction)
→ WebSocket broadcasts `invoice:created` to ALL tenant clients
→ User B's dashboard: new invoice row appears, revenue ticks up, stock updates
→ Zero refresh. Real-time. Neither Tally, Vyapar, Zoho, nor Odoo can do this.
```

---

### Mode 3: True AI Agent Mode (Planned — High Priority)

> This is what Pilloo AI claims to have. This is what separates a "voice interface" from an "AI agent". The LLM does not just extract — it **reasons, plans, and selects tools dynamically**.

#### The Core Difference

|                   | Intent-Based Mode                      | True Agent Mode                        |
| ----------------- | -------------------------------------- | -------------------------------------- |
| LLM role          | Extract JSON, then step aside          | Orchestrate the entire execution       |
| Execution control | Pre-written switch/case                | LLM decides which tool(s) to call      |
| Multi-step        | No — one intent per turn               | Yes — LLM chains tools                 |
| Conditional logic | No                                     | Yes — "if balance > X then..."         |
| Error recovery    | No                                     | Yes — LLM retries with different tool  |
| New capabilities  | Requires code change (new intent case) | Describe tool in English → LLM uses it |
| Unpredictability  | Zero (safe)                            | Low but exists                         |
| Power             | Limited to predefined intents          | Anything expressible in language       |

#### True Agent Architecture (OpenAI Tool Calling)

```
[STT → Transcript]
        │
        ▼
[Agent System Prompt]
"You are Execora, a business assistant for Indian shopkeepers.
You have these tools available: [tool definitions...]
Given the user's message and conversation history, decide which
tool(s) to call, in what order, to fulfill the user's request."
        │
        ▼
[LLM: Reason + select tool(s)]
→ May call 0 tools (just respond conversationally)
→ May call 1 tool: create_invoice(customer, items)
→ May call 2 tools: check_balance(customer) → create_invoice(...)
→ May call 3 tools: resolve_customer() → check_stock() → create_invoice()
        │
        ▼
[Tool execution — same business services, same DB]
        │
        ▼
[Tool results fed back to LLM]
"Customer Ramesh has balance ₹850. Stock of Aata: 12 bags."
        │
        ▼
[LLM: Generate final response OR call more tools]
        │
        ▼
[TTS → Audio response to user]
```

#### Tool Definitions (What Agent Mode Exposes)

Each tool is a typed function the LLM can call. These map 1:1 to existing business services:

```typescript
const AGENT_TOOLS = [
  {
    name: "resolve_customer",
    description: "Find a customer by name, phone, or nickname. Returns customer ID and profile.",
    parameters: { name?: string; phone?: string; nickname?: string }
  },
  {
    name: "create_invoice_draft",
    description: "Create a new invoice draft for a customer with items.",
    parameters: { customerId: string; items: Array<{name: string; qty: number; price?: number}> }
  },
  {
    name: "confirm_invoice",
    description: "Confirm and issue a pending invoice draft.",
    parameters: { conversationId: string }
  },
  {
    name: "check_customer_balance",
    description: "Get current outstanding balance for a customer.",
    parameters: { customerId: string }
  },
  {
    name: "record_payment",
    description: "Record a payment from a customer.",
    parameters: { customerId: string; amount: number; method: string }
  },
  {
    name: "check_stock",
    description: "Get current stock level for a product.",
    parameters: { productName: string }
  },
  {
    name: "schedule_reminder",
    description: "Schedule a WhatsApp payment reminder.",
    parameters: { customerId: string; amount: number; when: string; message?: string }
  },
  {
    name: "get_daily_summary",
    description: "Get today's sales summary.",
    parameters: {}
  },
  // ... all 23 intents become tools + new composable ones
];
```

#### What Agent Mode Unlocks — Examples

```
Example 1: Conditional business logic
User: "Ramesh ka balance check karo, agar 500 se zyada hai toh usko
       kal reminder bhejo aur naya bill mat banao"

Intent-based: FAILS — can't express "if condition then X else Y"

Agent mode:
→ Tool: check_customer_balance(customerId: "ramesh-id")
→ Result: balance = ₹1,200 (> ₹500)
→ LLM reasons: condition met, take action A (reminder), skip action B (bill)
→ Tool: schedule_reminder(customerId, amount: 1200, when: "tomorrow 10am")
→ Response: "Ramesh ka balance ₹1,200 hai. Kal reminder schedule kar diya.
             Nayi bill nahi banai."

Example 2: Multi-step research before action
User: "Sabse zyada udhar wale top 3 customers ko aaj reminder bhejo"

Intent-based: LIST_CUSTOMER_BALANCES shows data, then user must manually trigger reminders

Agent mode:
→ Tool: list_customers_by_balance(limit: 3)
→ Results: [Ramesh ₹2,100, Seema ₹1,800, Gopal ₹1,500]
→ Tool: schedule_reminder(ramesh, 2100, "today 6pm")
→ Tool: schedule_reminder(seema, 1800, "today 6pm")
→ Tool: schedule_reminder(gopal, 1500, "today 6pm")
→ Response: "Top 3 customers ko reminder schedule ho gaya:
             Ramesh ₹2,100, Seema ₹1,800, Gopal ₹1,500 — aaj shaam 6 baje."

Example 3: Error recovery
User: "Raju ka 50 kilo aata ka bill banao"

Agent mode:
→ Tool: check_stock(productName: "aata")
→ Result: stock = 30 (insufficient for 50 kg)
→ LLM reasons: cannot fulfill as-is
→ Response: "Aata ka stock sirf 30 kilo hai. Kya 30 kilo ka bill banau,
             ya baaki 20 kilo ke liye order lagao?"
(User: "30 ka bill banao")
→ Tool: create_invoice_draft(...)
```

---

### Two-Agent Pattern (Recommended Architecture for Agent Mode)

Rather than a single monolithic agent, use two specialized agents that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION AGENT                           │
│  (Guide / Facilitator)                                          │
│                                                                 │
│  Role: Manages dialog. Understands user intent at high level.   │
│  Asks clarifying questions. Explains results. Handles errors.   │
│  Suggests next actions. Never calls business services directly. │
│  Has: conversation history, user context, active customer       │
│  Does NOT have: tools for data mutation                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Decides: "User wants to create invoice"
                           │ Passes: structured task request
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TASK AGENT (EXECUTOR)                      │
│  (Silent Worker)                                                │
│                                                                 │
│  Role: Executes business operations. Has ALL tools.             │
│  Receives structured task from Conversation Agent.             │
│  Calls tools in correct order. Returns structured result.       │
│  Handles retries. Validates data. Checks constraints.           │
│  Has: all business tools (create_invoice, record_payment, etc.) │
│  Does NOT have: conversation history, TTS output               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Returns: {success, data, error?}
                           │
                           ▼
                   Conversation Agent formats
                   result into natural language
                   response → TTS → User
```

#### Why Two Agents?

| Concern          | Single Agent                                               | Two-Agent                               |
| ---------------- | ---------------------------------------------------------- | --------------------------------------- |
| Tool explosion   | LLM gets confused with 30+ tools + conversation            | Executor has tools, Guide has context   |
| Response quality | Hard to be both "good at tasks" and "good at conversation" | Specialist agents do one thing well     |
| Error messages   | Generic LLM error handling                                 | Guide crafts human-friendly explanation |
| Suggestions      | Baked into task execution (messy)                          | Guide always suggests next step         |
| Cost             | One big prompt                                             | Two smaller focused prompts (cheaper)   |
| Debugging        | Hard to trace: conversation or execution issue?            | Clear separation                        |

#### Conversation Agent — Responsibilities

```
1. Language detection (Hindi/Marathi/Tamil/etc.)
2. Clarify ambiguous input: "Kaun sa Ramesh? Sharma wala ya Gupta wala?"
3. Confirm before destructive actions: "Sach mein delete karna hai?"
4. Format Task Agent results into natural language + Hindi TTS
5. Suggest next action: "Bill confirm ho gaya. Kya reminder bhi schedule karu?"
6. Handle off-topic: "Mausam ka pata nahi, lekin aaj ka hisaab bata sakta hoon"
7. Handle errors gracefully: "Stock nahi mila — naam dobara batao?"
8. Maintain active customer context across turns
9. Maintain conversation tone (formal/informal based on user style)
```

#### Task Agent — Tool Categories

```
Query tools (read-only):
  - resolve_customer(name/phone/nickname) → {id, name, balance, phone}
  - check_stock(productName) → {stock, unit, minStock}
  - check_balance(customerId) → {balance, lastPayment}
  - list_pending_invoices(customerId?) → Invoice[]
  - get_daily_summary() → {revenue, invoiceCount, payments}
  - list_customers_by_balance(limit) → Customer[]

Mutation tools (write operations — require conversation agent confirmation):
  - create_invoice_draft(customerId, items) → {draftId, total}
  - confirm_invoice(conversationId) → Invoice
  - cancel_invoice(invoiceId, reason) → Invoice
  - record_payment(customerId, amount, method) → LedgerEntry
  - adjust_stock(productId, quantity, operation) → Product
  - create_customer(name, phone?, landmark?) → Customer
  - schedule_reminder(customerId, amount, when, message?) → Reminder
  - bulk_remind(customerIds, message?) → Reminder[]
```

---

### How to Add a New Feature to Agent Mode

```typescript
// Step 1: Implement in business service (same as always)
// packages/modules/src/modules/X/x.service.ts
async function newBusinessFunction(params): Promise<Result> { ... }

// Step 2: Add REST route (Form/Dashboard mode works immediately)
// packages/api/src/api/routes/x.routes.ts
fastify.post('/api/v1/x/new-thing', async (req) => {
  const result = await xService.newBusinessFunction(req.body);
  return { result };
});

// Step 3: Add Intent-Based Mode handler (current voice mode works)
// packages/modules/src/modules/voice/engine/x.handler.ts
export async function executeNewThing(entities, conversationId) {
  const result = await xService.newBusinessFunction(entities);
  return { success: true, message: "Hindi response", data: result };
}
// Add case to engine/index.ts switch statement

// Step 4: Add Agent Mode tool (True Agent Mode works)
// packages/modules/src/providers/llm/agent-tools.ts
{
  name: "new_thing",
  description: "What this does in plain English — LLM reads this",
  parameters: { /* typed schema */ }
}
// Task Agent automatically discovers and uses this tool

// Result: All three modes (Intent/Form/Agent) have this feature.
// Zero code duplication. Same business logic layer serves all modes.
```

---

### Mode Comparison — Full Matrix

| Capability             | Intent-Based (Current Voice) | Form/Dashboard (UI)   | True Agent Mode (Planned) |
| ---------------------- | ---------------------------- | --------------------- | ------------------------- |
| Speed for common task  | ⚡ 3s                        | 30-90s                | ⚡ 3-5s                   |
| Learning curve         | Near zero                    | Low                   | Zero                      |
| Multi-step reasoning   | ❌ One intent per turn       | ❌ N/A                | ✅ LLM chains steps       |
| Conditional logic      | ❌                           | ✅ (user does it)     | ✅ Agent reasons          |
| Error recovery         | ❌ Returns error             | ✅ User fixes form    | ✅ Agent retries          |
| Complex edits          | ❌                           | ✅ Visual forms       | ✅ Conversational edits   |
| Hands-free counter use | ✅                           | ❌                    | ✅                        |
| Bulk operations        | ❌                           | ✅ Checkboxes         | ✅ "Top 5 ko remind karo" |
| New capabilities       | New code required            | New route required    | Describe in English       |
| Offline support        | ❌ STT needs internet        | ✅ (with cache)       | ❌ LLM needs internet     |
| Predictability         | ✅ 100% deterministic        | ✅ 100% deterministic | ✅ High (tools are safe)  |
| Multi-language         | ✅ Via LLM prompt            | ❌ Hindi UI only      | ✅ Any language           |
| Suggestions            | ❌                           | ❌                    | ✅ "Aur kuch chahiye?"    |
| Cost per interaction   | Low (2 LLM calls)            | Zero (no LLM)         | Medium (3-5 LLM calls)    |

---

### Delivery Channels — Email + WhatsApp

Every document, notification, and alert in Execora has **two delivery channels**. Both must work.

#### Invoice Delivery

| Trigger                           | Channel          | Content                       | Status                          |
| --------------------------------- | ---------------- | ----------------------------- | ------------------------------- |
| Invoice confirmed (voice or form) | WhatsApp         | PDF download link + amount    | ✅ Built                        |
| Invoice confirmed (voice or form) | Email            | PDF attachment + invoice HTML | ✅ Built                        |
| Invoice confirmed                 | In-app WebSocket | Live dashboard update         | ✅ Built                        |
| User says "email bhejo"           | Email            | PDF to customer email         | ✅ Built (PROVIDE_EMAIL intent) |
| User says "WhatsApp karo"         | WhatsApp         | PDF link to customer phone    | 🔴 TODO (auto-send)             |

#### Reminder Delivery

| Channel          | Use Case                                        | Status                       |
| ---------------- | ----------------------------------------------- | ---------------------------- |
| WhatsApp         | Primary: payment reminders, overdue alerts      | ✅ Built (BullMQ + Meta API) |
| Email            | Secondary: formal reminders, monthly statements | 🔴 TODO                      |
| In-app dashboard | Staff tasks, GST filing alerts, low stock       | ✅ Built                     |
| SMS              | Fallback when WhatsApp fails                    | 🔴 TODO (P2)                 |

#### Delivery Preference Settings

```
Per tenant configuration:
  invoice_delivery: ["whatsapp", "email"] — both, one, or none
  reminder_delivery: ["whatsapp"] — WhatsApp first, email as fallback

Per customer configuration:
  preferred_channel: "whatsapp" | "email" | "both" | "none"
  email: stored on customer profile (optional)
  phone: required for WhatsApp

Voice command examples:
  "Ramesh ko email bhi bhejo" → adds email delivery for this invoice
  "Is customer ka email add karo — ramesh@gmail.com"
  "Saare reminders WhatsApp pe bhejne hain, email nahi"
```

#### Email System Architecture (Existing)

```
Trigger: invoice.service.ts → buildAndStoreInvoicePdf() → email job queued
Queue: BullMQ job → packages/infrastructure/src/email.ts (Nodemailer)
Content: HTML template + PDF attachment
Provider: SMTP (configurable: Gmail, SendGrid, Amazon SES, Mailgun)
Config: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
```

#### WhatsApp System Architecture (Existing)

```
Trigger: reminder.service.ts → BullMQ job
Queue: BullMQ → apps/worker/src/processors/whatsapp.processor.ts
Provider: Meta WhatsApp Cloud API
Auth: WHATSAPP_TOKEN + WHATSAPP_PHONE_ID in .env
Webhook: POST /webhooks/whatsapp (delivery status callbacks)
Status: scheduled → sent → delivered → read → failed
```

#### What Is Missing (TODO)

```
1. WhatsApp auto-send for invoices (currently only email auto-sends;
   WhatsApp only sends via voice command "email bhejo" intent)
2. Email reminders (currently only WhatsApp for reminders)
3. Customer email on profile (currently optional, not prompted during onboarding)
4. Delivery preference per customer in settings UI
5. Fallback: if WhatsApp fails → retry → then fallback to email
```

---

## 7. Live Dashboard & WebSocket Architecture

### WebSocket Event Types

#### Server → Client Events

| Event                | Triggered By      | Payload                        | UI Action             |
| -------------------- | ----------------- | ------------------------------ | --------------------- |
| `voice:transcript`   | STT chunk         | `{text, isFinal}`              | Show live transcript  |
| `voice:start`        | Session starts    | `{ttsProvider, ttsAvailable}`  | Init audio pipeline   |
| `voice:end`          | Session ends      | `{}`                           | Close mic             |
| `voice:response`     | AI responds       | `{text, audioUrl?}`            | Show + play response  |
| `task:status`        | Task state change | `{taskId, status, intent}`     | Show task indicator   |
| `invoice:created`    | Invoice saved     | `{invoiceId, total, customer}` | Add to invoice list   |
| `invoice:updated`    | Invoice edited    | `{invoiceId, changes}`         | Update invoice detail |
| `invoice:cancelled`  | Invoice cancelled | `{invoiceId}`                  | Mark cancelled        |
| `payment:recorded`   | Payment saved     | `{customerId, amount, method}` | Update ledger         |
| `product:updated`    | Stock changed     | `{productId, stock}`           | Update stock widget   |
| `reminder:scheduled` | Reminder saved    | `{reminderId}`                 | Update reminder count |
| `customer:created`   | New customer      | `{customerId, name}`           | Add to customer list  |
| `stock:low`          | Stock ≤ minStock  | `{productId, name, stock}`     | Alert badge           |

#### Client → Server Events

| Event         | Triggered By         | Payload                                  |
| ------------- | -------------------- | ---------------------------------------- |
| `voice:audio` | Mic input            | PCM audio buffer                         |
| `voice:start` | User starts speaking | `{audioFormat, sampleRate, ttsProvider}` |
| `voice:stop`  | User stops           | `{}`                                     |
| `ping`        | Heartbeat (30s)      | `{timestamp}`                            |

### React Query Integration (Cache Invalidation)

```typescript
// WSContext.tsx handles all server events and invalidates React Query cache
// This ensures Classic Mode UI always shows fresh data after any Agent Mode action

wsClient.on("invoice:created", () => {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["summary"] });
});

wsClient.on("product:updated", () => {
  qc.invalidateQueries({ queryKey: ["products"] });
  qc.invalidateQueries({ queryKey: ["products", "low-stock"] });
});

wsClient.on("payment:recorded", () => {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["customers"] });
  qc.invalidateQueries({ queryKey: ["ledger"] });
  qc.invalidateQueries({ queryKey: ["summary"] });
});
```

### Real-Time Dashboard Widgets Priority

| Widget                | Refresh Trigger         | Priority |
| --------------------- | ----------------------- | -------- |
| Today's Revenue       | Every invoice + payment | P0       |
| Pending Collections   | Every invoice + payment | P0       |
| Low Stock Alerts      | Every stock change      | P0       |
| Recent Invoices       | Every invoice           | P0       |
| Top Selling Products  | Every 2 minutes         | P1       |
| Weekly Sales Chart    | Every day midnight      | P1       |
| Business Health Score | Every hour              | P2       |
| Customer Activity     | Every 5 minutes         | P2       |

---

## 8. Language Support — Multilingual Engine

### Supported Languages (Priority Order)

| Language                     | Script             | Speakers   | Priority |
| ---------------------------- | ------------------ | ---------- | -------- |
| Hindi                        | Devanagari / Roman | 528M       | P0       |
| Hinglish (Hindi+English mix) | Roman              | ~350M      | P0       |
| English                      | Roman              | 125M urban | P0       |
| Marathi                      | Devanagari         | 83M        | P1       |
| Gujarati                     | Gujarati script    | 57M        | P1       |
| Tamil                        | Tamil script       | 69M        | P1       |
| Telugu                       | Telugu script      | 83M        | P1       |
| Bengali                      | Bengali script     | 97M        | P1       |
| Kannada                      | Kannada script     | 44M        | P2       |
| Malayalam                    | Malayalam script   | 38M        | P2       |
| Punjabi                      | Gurmukhi           | 33M        | P2       |
| Odia                         | Odia script        | 38M        | P2       |

### Hinglish Handling — Real Examples

```
"Do kilo aata lao"     → 2 kg wheat flour
"Ek packet Maggi"      → 1 packet Maggi noodles
"Tees rupay wala"      → ₹30 item
"Chhota packet"        → small size variant
"Kal ka bill"          → yesterday's bill
"Uska phone number"    → his/her phone number
"Wahi wala"            → same as before / the usual
"Haan bilkul"          → yes confirm
"Nahi ruko"            → no wait / hold on
"Thoda kam karo"       → give some discount / reduce price
"Baki kal dena"        → pay the rest tomorrow (= create udaar)
"Seedha 500 le lo"     → take ₹500 directly (= payment)
```

### Number Normalization

```
"Ek"     → 1    "Gyarah"   → 11   "Ikkis"  → 21
"Do"     → 2    "Barah"    → 12   "Pachis" → 25
"Teen"   → 3    "Terah"    → 13   "Pachaas"→ 50
"Chaar"  → 4    "Chaudah"  → 14   "Sau"    → 100
"Paanch" → 5    "Pandrah"  → 15   "Haazar" → 1000
"Chhe"   → 6    "Solah"    → 16   "Lakh"   → 100000
"Saat"   → 7    "Satrah"   → 17   "Karod"  → 10000000
"Aath"   → 8    "Atharah"  → 18   "Paav"   → 0.25 (250g)
"Nau"    → 9    "Unnis"    → 19   "Aadha"  → 0.5 (500g)
"Das"    → 10   "Bees"     → 20   "Pona"   → 0.75 (750g)
```

### Devanagari Transliteration

```
रामेश → Ramesh (for entity extraction)
आटा   → Aata / Atta (product matching)
तेल   → Tel (product matching)
पेमेंट → Payment
```

### Multi-Language Intent Examples

| Language | User says                            | Extracted intent |
| -------- | ------------------------------------ | ---------------- |
| Hindi    | "Ramesh ka bill banao — 2 aata"      | CREATE_INVOICE   |
| Marathi  | "Ramesh cha bill kara — 2 kilo pith" | CREATE_INVOICE   |
| Tamil    | "Ramesh bill pottu — 2 kilo maavu"   | CREATE_INVOICE   |
| Telugu   | "Ramesh bill veyyi — 2 kilo pindi"   | CREATE_INVOICE   |
| Gujarati | "Ramesh no bill banavo — 2 kilo lot" | CREATE_INVOICE   |
| Hinglish | "Ramesh ko invoice do 2kg flour"     | CREATE_INVOICE   |

_The LLM handles all of these with the same prompt + conversation context — no separate parsers needed per language._

---

## 9. Competitor Analysis & Differentiation

### Feature Comparison Matrix

| Feature                       | Execora | Tally   | Vyapar | Khatabook  | Zoho Books | Odoo    | Pilloo AI |
| ----------------------------- | ------- | ------- | ------ | ---------- | ---------- | ------- | --------- |
| Voice commands                | ✅ P0   | ❌      | ❌     | ❌         | ❌         | ❌      | ✅ (new)  |
| Hindi/Hinglish native         | ✅      | ❌      | ❌     | Partial    | ❌         | ❌      | ✅        |
| Real-time streaming voice     | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Unknown   |
| Multi-turn conversation       | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Unknown   |
| Conversation memory (Redis)   | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Unknown   |
| Active customer context       | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Unknown   |
| GST invoicing                 | ✅      | ✅      | ✅     | ❌         | ✅         | ⚠️      | ✅        |
| Walk-in billing (no name)     | ✅      | ✅      | ✅     | ❌         | ✅         | ✅      | Unknown   |
| Customer ledger (udaar)       | ✅      | ✅      | ✅     | ✅         | ✅         | ✅      | Unknown   |
| WhatsApp reminders            | ✅      | ❌      | ❌     | ✅ (basic) | ❌         | ❌      | Unknown   |
| Real-time WebSocket dashboard | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Unknown   |
| Multi-task parallel voice     | ✅ (3)  | ❌      | ❌     | ❌         | ❌         | ❌      | ❌        |
| Auto payment settlement       | ✅      | ❌      | Manual | Manual     | Manual     | ❌      | Unknown   |
| Inventory management          | ✅      | ✅      | ✅     | ❌         | ✅         | ✅      | Unknown   |
| PDF invoice + email           | ✅      | ✅      | ✅     | ❌         | ✅         | ✅      | Unknown   |
| Multi-user / RBAC             | ✅      | ✅      | ⚠️     | ❌         | ✅         | ✅      | Unknown   |
| Open source / self-host       | ❌      | ❌      | ❌     | ❌         | ❌         | ✅      | ❌        |
| Mobile-first                  | ✅      | ❌      | ✅     | ✅         | Partial    | ❌      | Unknown   |
| Monthly cost (India)          | TBD     | ₹1,875+ | ₹108+  | Free       | ₹899+      | ₹4,500+ | Unknown   |
| Offline capability            | ⚠️      | ✅      | ✅     | ✅         | ❌         | Partial | Unknown   |
| Agent mode (AI-driven)        | ✅      | ❌      | ❌     | ❌         | ❌         | ❌      | Partial   |

### Where Execora Wins

**1. The only real-time streaming voice engine for Indian SMEs**
Pilloo AI launched Feb 2026 and is brand new. Its tech depth is unknown. Execora has:

- Sub-800ms transcript latency (streaming, not batch upload)
- Multi-turn drafts that survive reconnects (Redis-backed)
- 3 parallel tasks in a single session
- Language-agnostic intent via GPT-4 (not rule-based)

**2. Agent Mode is a category of its own**
No competitor has an AI agent that:

- Maintains customer context across turns
- Injects pending invoice state into every LLM call
- Auto-settles payments khata-style
- Supports 23 business intents in natural conversation

**3. Real-time WebSocket dashboard (no competitor has this)**
Tally/Vyapar/Zoho all show data that requires refresh.
Execora's dashboard ticks in real time — invoice count goes up as you confirm via voice.

**4. Hindi-first vs English-first**
All competitors (including Zoho, Odoo) built in English and added Hindi as an afterthought (UI translation only).
Execora's entire AI pipeline is built for Hindi/Hinglish from the start.

**5. WhatsApp-native reminders**
Khatabook has basic WhatsApp reminders. Execora has:

- 10 reminder types
- Natural language scheduling ("kal 9 baje")
- Recurring reminders
- Bulk reminders to all overdue customers
- Delivery status tracking

### Where Competitors Win Today

| Gap                          | Competitor       | Our Plan                    |
| ---------------------------- | ---------------- | --------------------------- |
| Offline mode                 | Vyapar, Tally    | PWA with local queue (P2)   |
| Barcode scanning             | Vyapar, Marg     | Mobile camera barcode (P2)  |
| Tally import                 | Busy, Zoho       | CSV/Tally XML import (P2)   |
| CA/accountant ecosystem      | Tally            | Partner program (v3)        |
| Name recognition (all India) | None             | More regional training data |
| Cheaper entry price          | Vyapar (₹108/mo) | Freemium tier (v2)          |

---

## 10. Technology Architecture

### Full Stack Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                           │
│  React 18 + Vite + TypeScript + Tailwind CSS + Radix UI        │
│  TanStack Query v5 (server state) + React Hook Form            │
│  WebSocket client (ws.ts) + Audio pipeline (PCM streaming)     │
│  Charts: Recharts  |  Icons: Lucide React                      │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTP/REST + WebSocket
┌────────────────────────▼───────────────────────────────────────┐
│                        API LAYER                               │
│  Fastify 4 (HTTP server, WebSocket handler)                    │
│  @execora/api — packages/api/src/                                  │
│  Routes: customer, invoice, product, ledger, reminder, summary │
│  Middleware: JWT auth, RBAC, rate limit                        │
│  WebSocket: packages/api/src/ws/enhanced-handler.ts               │
└────────────────────────┬───────────────────────────────────────┘
                         │ imports
┌────────────────────────▼───────────────────────────────────────┐
│                     MODULES LAYER                              │
│  @execora/modules — packages/modules/src/                      │
│  Business: customer, invoice, ledger, product, reminder, gst   │
│  Voice: engine, conversation, session, task-queue              │
│  Providers: LLM (OpenAI), STT (Deepgram/ElevenLabs), TTS      │
└────────────────────────┬───────────────────────────────────────┘
                         │ imports
┌────────────────────────▼───────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                          │
│  @execora/infrastructure — packages/infrastructure/src/        │
│  DB: Prisma + PostgreSQL  |  Cache: Redis (ioredis)            │
│  Queue: BullMQ  |  Storage: MinIO (S3)  |  Email: Nodemailer  │
│  Auth: JWT (Node crypto)  |  Logger: Pino  |  Metrics: Prom   │
└───────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
execora/
├── apps/
│   ├── api/        — @execora/api    (Fastify server + WebSocket)
│   ├── web/        — vite_react_shadcn_ts (React dashboard)
│   └── worker/     — @execora/worker (BullMQ job processor)
├── packages/
│   ├── types/          — @execora/types          (shared TS types)
│   ├── infrastructure/ — @execora/infrastructure (DB, Redis, auth)
│   └── modules/        — @execora/modules        (all business logic)
├── prisma/             — schema.prisma + migrations (at workspace root)
└── docs/               — all documentation
```

### Key Files Every Agent Must Know

| File                                                            | Purpose                                                |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `packages/modules/src/modules/voice/engine/index.ts`            | Intent dispatcher (switch/case) — add new intents here |
| `packages/modules/src/modules/voice/engine/invoice.handler.ts`  | Invoice intent handlers                                |
| `packages/modules/src/modules/voice/engine/customer.handler.ts` | Customer intent handlers                               |
| `packages/modules/src/modules/voice/engine/payment.handler.ts`  | Payment intent handlers                                |
| `packages/modules/src/modules/voice/engine/reminder.handler.ts` | Reminder intent handlers                               |
| `packages/modules/src/modules/voice/engine/report.handler.ts`   | Report/stock intent handlers                           |
| `packages/modules/src/modules/voice/conversation.ts`            | Conversation memory, context building                  |
| `packages/modules/src/modules/invoice/invoice.service.ts`       | Invoice CRUD, GST calc, PDF, top-selling               |
| `packages/modules/src/modules/customer/customer.service.ts`     | Customer CRUD, fuzzy matching                          |
| `packages/modules/src/modules/ledger/ledger.service.ts`         | Payment recording, auto-settlement                     |
| `packages/modules/src/modules/product/product.service.ts`       | Stock management, low-stock query                      |
| `packages/modules/src/modules/reminder/reminder.service.ts`     | Scheduling, WhatsApp delivery                          |
| `packages/api/src/ws/enhanced-handler.ts`                           | WebSocket message routing, multi-task                  |
| `apps/web/src/contexts/WSContext.tsx`                           | WebSocket → React Query invalidation                   |
| `apps/web/src/hooks/useQueries.ts`                              | All React Query hooks                                  |
| `apps/web/src/lib/api.ts`                                       | All API types + fetch helpers                          |
| `packages/db/schema.prisma`                                          | Source of truth for all DB models                      |

### Database Models (Key)

```prisma
Tenant         — multi-tenant support (1 per business)
User           — staff accounts with roles
Customer       — with udaar balance, credit limit, aliases
Product        — catalog with HSN, GST rate, stock, minStock
Invoice        — with status (draft/pending/partial/paid/cancelled)
InvoiceItem    — line items with quantity, price, GST breakdown
Payment        — payment records per customer
Ledger         — immutable audit trail of all financial events
StockMovement  — every stock change with reason and actor
Reminder       — scheduled WhatsApp messages
ConversationSession — voice session metadata
ConversationTurn    — turn-by-turn history for AI context
WhatsAppMessage     — delivery status tracking
```

### Invoice Status State Machine

```
draft ──confirm──► pending ──payment received──► paid
  │                   │
  └──cancel──► cancelled    ──partial payment──► partial
                              (partial also → paid when fully paid)
```

### Payment Flow State Machine

```
Payment received
       │
       ▼
Find oldest PENDING/PARTIAL invoice for this customer
       │
   [remaining ≥ invoice_due]──► Mark PAID, carry remaining forward
       │                             │
   [remaining < invoice_due]         └──► Apply to next invoice
       │
   Mark PARTIAL (paidAmount updated)
       │
       ▼
Remaining = 0 → done. Any leftover → customer credit advance.
```

---

## 11. Feature Priority Matrix

### P0 — Must Have (Core Product, Ship First)

| Feature                                                | Status                                  |
| ------------------------------------------------------ | --------------------------------------- |
| Voice invoice creation (Hindi/Hinglish)                | ✅ Built                                |
| Walk-in billing (no customer name)                     | ✅ Built                                |
| GST invoice (B2C intra-state)                          | ✅ Built                                |
| Non-GST cash memo                                      | ✅ Built                                |
| Customer ledger (udaar)                                | ✅ Built                                |
| Payment recording (cash/UPI/card)                      | ✅ Built                                |
| Auto-settlement (khata style)                          | ✅ Built                                |
| WhatsApp payment reminders                             | ✅ Built                                |
| Real-time dashboard (WebSocket)                        | ✅ Built                                |
| Low stock alerts                                       | ✅ Built                                |
| Top selling products (real units sold)                 | ✅ Built                                |
| Invoice status tracking (paid/partial/pending)         | ✅ Built                                |
| Multi-turn voice drafts with Redis persistence         | ✅ Built                                |
| TTS voice response (ElevenLabs/OpenAI/Browser)         | ✅ Built                                |
| Bill-level discount (voice "10% discount karo" + form) | ✅ Built                                |
| Item-level discount                                    | ⚠️ UI only — backend not wired (S10-01) |
| B2B invoice with buyer GSTIN                           | ✅ Built                                |
| IGST (inter-state) calculation                         | ✅ Built                                |
| Invoice PDF via WhatsApp (auto-send on confirm)        | ✅ Built                                |
| Mobile-responsive UI                                   | ⚠️ Partial (S10-03)                     |

### P1 — Should Have (Differentiation, Ship Second)

| Feature                                                  | Status                     |
| -------------------------------------------------------- | -------------------------- |
| ~~Barcode scan to add product~~                          | ✅ Built                   |
| Repeat last bill ("same as before")                      | ✅ Built                   |
| Customer credit limit enforcement                        | ✅ Built                   |
| Partial payment at billing time ("500 diye baki kal")    | ✅ Built                   |
| Mixed-mode payment voice intent (cash + UPI split)       | ✅ Built                   |
| Expiry date tracking                                     | ✅ Partially built (S9-06) |
| GST report (GSTR-1 ready) — B2B/B2CS/HSN + PDF/CSV/email | ✅ Built                   |
| Date range reports + export (CSV/PDF/email) — P&L        | ✅ Built                   |
| Bulk WhatsApp reminders                                  | ✅ Built                   |
| Regional language support (Marathi, Tamil, etc.)         | ⚠️ Partial                 |
| Proforma invoice / quotation (form + voice CONFIRM flow) | ✅ Built                   |
| Invoice editing (post-creation)                          | ✅ Built                   |
| Customer tags (VIP, wholesale, blacklist)                | ✅ Built                   |
| Stock batch/expiry tracking                              | ✅ Partially built (S9-06) |
| WhatsApp chatbot interface                               | 🔴 TODO                    |

### P2 — Nice to Have (Scale Features)

| Feature                                      | Status  |
| -------------------------------------------- | ------- |
| Offline mode (PWA + local queue)             | 🔴 TODO |
| Tally/Vyapar data import                     | 🔴 TODO |
| Barcode label printing                       | 🔴 TODO |
| Thermal receipt printer support              | 🔴 TODO |
| Supplier invoice entry (purchase management) | 🔴 TODO |
| Staff attendance tracking                    | 🔴 TODO |
| Customer loyalty points                      | 🔴 TODO |
| Price lists (wholesale vs retail)            | 🔴 TODO |
| Multi-branch support                         | 🔴 TODO |
| Freemium tier                                | 🔴 TODO |
| Analytics AI ("explain my sales drop")       | 🔴 TODO |
| E-commerce integration (Shopify/WooCommerce) | 🔴 TODO |

---

## 12. Growth Strategy

### Phase 1 — Product-Market Fit (0-6 months)

**Target**: 100 paying kirana stores, ₹99-299/month
**Focus**: North India, Hindi belt (UP, MP, Rajasthan, Delhi NCR)
**Channel**: Direct WhatsApp outreach to kirana owners via their distributors

**The demo hook**:

> Record a 60-second video: Owner speaks "2 aata 1 tel ek Maggi" → invoice appears in 3 seconds with GST breakdown. Share on WhatsApp. Watch it spread.

**Pilot approach**:

1. Find 10 kirana stores in one locality
2. Onboard free for 30 days
3. Collect stories: "before = paper, after = Execora"
4. Use their testimonial videos (in Hindi) for next batch

### Phase 2 — Distribution Scale (6-18 months)

**WhatsApp-native interface**: Add WhatsApp Business API so owner can send voice note "Ramesh ko 500 ka bill bhejo" → system processes → sends confirmation back on WhatsApp

This removes the app install barrier entirely. Growth = viral WhatsApp sharing.

**Distributor/FMCG partner channel**: Partner with 2-3 regional FMCG distributors who supply kirana stores. Bundle Execora as a free tool for their retailers. Get 1000 stores via one B2B deal.

### Phase 3 — Market Leadership (18+ months)

**Wholesale/distributor tier**: Higher ARPU (₹5,000-15,000/year), requires B2B sales
**Pharmacy vertical**: Batch tracking, expiry alerts, prescription records
**Regional language expansion**: Marathi, Tamil, Telugu — unlock South India

### YouTube Content Strategy

| Video                                   | Format                | Hook                    |
| --------------------------------------- | --------------------- | ----------------------- |
| "Kirana store never types again"        | 60-sec Short          | Hindi demo video        |
| "Why Tally doesn't work for kirana"     | 7-min explainer       | Pain story + solution   |
| "Building India's first voice billing"  | 15-min tech deep dive | Architecture for devs   |
| "12 crore shops, zero billing software" | 5-min market story    | Investor/media hook     |
| "Regional language billing demo"        | Short                 | Show Marathi/Tamil demo |

### LinkedIn Content Strategy

| Post Type           | Content                                     | Expected Reach                   |
| ------------------- | ------------------------------------------- | -------------------------------- |
| Demo GIF            | Voice → GST invoice in 3s                   | Viral in India startup community |
| Market data         | "0/10 billing tools support Hindi voice"    | Shared by VCs, journalists       |
| Builder story       | "3 months talking to kirana owners"         | Personal brand, community        |
| Architecture        | "WebSocket → STT → GPT-4 → DB"              | Developer sharing                |
| Competitor teardown | "Why ₹26,550 Tally doesn't work for kirana" | Controversy = reach              |

---

## Section 13 — Medium-Scale Business Feature Audit (March 13, 2026)

> Last audited: 2026-03-13. Full code review of all route files, page components, service modules, and infrastructure packages. Every status is code-confirmed against actual source. Medium-scale target: 5–50 staff, ₹50L–₹10Cr revenue, GST-registered.

---

### 13.1 Master Feature Status Table (125 Features)

Legend: ✅ Built | ⚙️ Backend Only (no UI) | 🖥️ Frontend Only (placeholder) | 🔄 Partial | ❌ Not Built
Priority: 🔴 Critical | 🟡 Important | 🟢 Nice-to-have

| # | Feature | Category | Backend | Frontend | Mobile | Status | Med-Biz Priority |
|---|---------|----------|---------|----------|--------|--------|-----------------|
| 1 | GST invoice (CGST+SGST intrastate) | Billing | ✅ gstService.calculateLineItem | ✅ ClassicBilling + InvoiceCreation | ✅ BillingScreen | ✅ BUILT | 🔴 Critical |
| 2 | IGST invoice (interstate B2B) | Billing | ✅ supplyType=INTERSTATE in invoice.service | ✅ IGST toggle in ClassicBilling | — | ✅ BUILT | 🔴 Critical |
| 3 | B2B invoice with buyer GSTIN | Billing | ✅ buyerGstin field, PATCH/POST /invoices | ✅ ClassicBilling B2B field | — | ✅ BUILT | 🔴 Critical |
| 4 | HSN/SAC codes per line item | Billing | ✅ product.hsnCode stored + sent to PDF | ✅ ClassicBilling shows hsnCode | — | ✅ BUILT | 🔴 Critical |
| 5 | Item-level discount (%) | Billing | 🔄 service.ts applies lineDiscountPercent correctly; but POST /invoices route schema only accepts {productName,quantity,unitPrice} — lineDiscountPercent stripped at route level | 🔄 ClassicBilling UI has discount column; not submitted to API | — | 🔄 PARTIAL — 1-line API route fix needed | 🔴 Critical |
| 6 | Bill-level discount (% and flat) | Billing | ✅ discountPercent/discountAmount fields | ✅ ClassicBilling + InvoiceCreation | ✅ | ✅ BUILT | 🔴 Critical |
| 7 | Multiple tax rates per item (0–28%) | Billing | ✅ product.gstRate per SKU in gstService | ✅ Product catalog rate fields | — | ✅ BUILT | 🔴 Critical |
| 8 | Proforma invoice / quotation | Billing | ✅ POST /invoices/proforma | ✅ InvoiceDetail toggle | — | ✅ BUILT | 🟡 Important |
| 9 | Proforma → invoice conversion | Billing | ✅ POST /invoices/:id/convert | ✅ InvoiceDetail | — | ✅ BUILT | 🟡 Important |
| 10 | Credit note / debit note | Billing | ❌ No model or route | ❌ No UI | — | ❌ NOT BUILT | 🔴 Critical |
| 11 | Invoice PDF generation | Billing | ✅ generateInvoicePdf + MinIO | ✅ PDF download button | — | ✅ BUILT | 🔴 Critical |
| 12 | Invoice email delivery | Billing | ✅ dispatchInvoicePdfEmail + SMTP | ✅ Auto-send + manual re-send | — | ✅ BUILT | 🔴 Critical |
| 13 | WhatsApp invoice share (auto) | Billing | ✅ dispatchInvoicePdfEmail() reads autoSendWhatsApp setting → whatsappService.sendDocumentMessage() | ✅ Settings toggle persisted to API + localStorage | — | ✅ BUILT (requires Meta Cloud API env vars) | 🔴 Critical |
| 14 | Customer portal (shareable link) | Billing | ✅ GET /pub/invoice/:id/:token | ✅ InvoicePortal.tsx | — | ✅ BUILT | 🟡 Important |
| 15 | Partial payment at invoice creation | Billing | ✅ initialPayment field in POST /invoices | ✅ ClassicBilling payment split | ✅ | ✅ BUILT | 🔴 Critical |
| 16 | Invoice edit after creation | Billing | ✅ PATCH /invoices/:id | ✅ InvoiceDetail edit | — | ✅ BUILT | 🟡 Important |
| 17 | Invoice cancel | Billing | ✅ POST /invoices/:id/cancel | ✅ | — | ✅ BUILT | 🟡 Important |
| 18 | Invoice number sequence (per-tenant, FY) | Billing | ✅ generateInvoiceNo, atomic upsert | ✅ Displayed on all invoices | ✅ | ✅ BUILT | 🔴 Critical |
| 19 | Round-off on total | Billing | ❌ No round-off field or service | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 20 | Amount in words (Indian format) | Billing | ✅ pdf.ts lines 119–432 — toIndianWords() + printed on all PDF templates | ✅ ClassicBilling shows it | — | ✅ BUILT | 🟡 Important |
| 21 | 4 invoice templates | Billing | ✅ PDF generation service | ✅ TEMPLATES selector in ClassicBilling + Settings | — | ✅ BUILT | 🟢 Nice-to-have |
| 22 | Bank details on invoice | Billing | ❌ Not stored or printed on PDF | ❌ No settings field | — | ❌ NOT BUILT | 🔴 Critical |
| 23 | Terms & conditions on invoice | Billing | ❌ Not stored or printed | ❌ No field | — | ❌ NOT BUILT | 🟡 Important |
| 24 | Recurring invoice | Billing | ❌ No backend model/worker | 🖥️ RecurringBilling.tsx placeholder | — | 🖥️ FRONTEND ONLY | 🟡 Important |
| 25 | Bulk invoice export (CSV/Excel) | Billing | ❌ No bulk export endpoint | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 26 | Cash payment recording | Payment & Ledger | ✅ POST /ledger/payment method=cash | ✅ Payment page | ✅ | ✅ BUILT | 🔴 Critical |
| 27 | UPI payment recording | Payment & Ledger | ✅ POST /ledger/payment method=upi | ✅ | ✅ | ✅ BUILT | 🔴 Critical |
| 28 | Card payment recording | Payment & Ledger | ✅ POST /ledger/payment method=card | ✅ | ✅ | ✅ BUILT | 🟡 Important |
| 29 | Mixed payment (cash+UPI split) | Payment & Ledger | ✅ POST /ledger/mixed-payment | ✅ Payment page splits | ✅ | ✅ BUILT | 🟡 Important |
| 30 | Partial payment tracking | Payment & Ledger | ✅ initialPayment + ledger.service | ✅ InvoiceDetail partial badge | ✅ | ✅ BUILT | 🔴 Critical |
| 31 | Credit (advance) payment | Payment & Ledger | ✅ POST /ledger/credit | ✅ | — | ✅ BUILT | 🟡 Important |
| 32 | Customer ledger / statement | Payment & Ledger | ✅ GET /ledger/:customerId | ✅ CustomerDetail ledger tab | ✅ | ✅ BUILT | 🔴 Critical |
| 33 | Payment reminders (auto-scheduled) | Payment & Ledger | ✅ BullMQ + reminder.service (10 types) | ✅ Reminders CRUD | — | ✅ BUILT | 🔴 Critical |
| 34 | Payment webhook (9 gateways) | Payment & Ledger | ✅ Razorpay/PhonePe/Cashfree/PayU/Paytm/Instamojo/Stripe/EaseBuzz/BharatPe | — | — | ✅ BUILT | 🟡 Important |
| 35 | Payment Sound Box (voice announce) | Payment & Ledger | ✅ WS broadcast payment:recorded | ✅ PaymentSoundBox.tsx | — | ✅ BUILT | 🟢 Nice-to-have |
| 36 | Overdue tracking + aging buckets | Payment & Ledger | ✅ GET /customers/overdue | ✅ OverduePage | ✅ OverdueScreen | ✅ BUILT | 🔴 Critical |
| 37 | Credit limit enforcement | Payment & Ledger | ✅ 422 CREDIT_LIMIT_EXCEEDED | ✅ Modal on breach | — | ✅ BUILT | 🟡 Important |
| 38 | Customer CRUD | Customer Mgmt | ✅ GET/POST/PATCH/DELETE /customers | ✅ Customers.tsx | ✅ CustomersScreen | ✅ BUILT | 🔴 Critical |
| 39 | Customer tags (VIP/Wholesale/Blacklist) | Customer Mgmt | ✅ tags[] field on Customer model | ✅ Tag input in customer form | — | ✅ BUILT | 🟡 Important |
| 40 | Customer credit limit | Customer Mgmt | ✅ creditLimit field + enforcement | ✅ Settings in customer form | — | ✅ BUILT | 🟡 Important |
| 41 | Customer opening balance (migration) | Customer Mgmt | ✅ openingBalance at POST /customers | ✅ Customer creation form | — | ✅ BUILT | 🟡 Important |
| 42 | Customer contact history | Customer Mgmt | ✅ ActivityLog model in schema | ❌ No UI for activity timeline | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 43 | Customer portal access | Customer Mgmt | ✅ HMAC token + /pub/invoice route | ✅ InvoicePortal.tsx | — | ✅ BUILT | 🟡 Important |
| 44 | Customer WhatsApp / phone quick-dial | Customer Mgmt | ✅ phone stored | ✅ CustomerDetail shows phone | ✅ | ✅ BUILT | 🟡 Important |
| 45 | Customer statement / ledger export (PDF/CSV) | Customer Mgmt | ❌ No export endpoint | ❌ No export button | — | ❌ NOT BUILT | 🔴 Critical |
| 46 | Bulk customer import (CSV) | Customer Mgmt | ❌ No import endpoint | 🖥️ ImportData.tsx placeholder | — | 🖥️ FRONTEND ONLY | 🟡 Important |
| 47 | Customer segmentation / groups | Customer Mgmt | ❌ No grouping model | ❌ | — | ❌ NOT BUILT | 🟢 Nice-to-have |
| 48 | Product CRUD | Inventory | ✅ GET/POST/PUT/PATCH/DELETE /products | ✅ Inventory.tsx | — | ✅ BUILT | 🔴 Critical |
| 49 | Stock tracking (current qty) | Inventory | ✅ product.stock + StockMovement model | ✅ Inventory shows qty | — | ✅ BUILT | 🔴 Critical |
| 50 | Stock adjustment with reason | Inventory | ✅ PATCH /products/:id/stock + reason field | ✅ | — | ✅ BUILT | 🟡 Important |
| 51 | Low stock alerts | Inventory | ✅ product.service getLowStockProducts | ✅ Dashboard widget | — | ✅ BUILT | 🟡 Important |
| 52 | Dead stock tracking (30/60/90 day) | Inventory | ❌ No sales velocity aging query | ❌ | — | ❌ NOT BUILT | 🟢 Nice-to-have |
| 53 | Sales velocity / top sellers | Inventory | ✅ GET /products/top-selling?days=30 | ✅ Dashboard top-sellers widget | — | ✅ BUILT | 🟡 Important |
| 54 | Barcode scan (mobile) | Inventory | ✅ GET /products/barcode/:barcode | ✅ BarcodeScanner.tsx web | ❌ RN not wired | 🔄 Partial | 🟡 Important |
| 55 | Batch / lot number tracking | Inventory | ✅ ProductBatch model + batchNo | ✅ Expiry.tsx page | — | 🔄 Partial | 🟡 Important |
| 56 | Expiry date tracking | Inventory | ✅ expiryDate + getExpiringBatches() | ✅ Expiry page + alerts | — | ✅ BUILT | 🟡 Important |
| 57 | Multi-unit (kg/litre/piece/box) | Inventory | ✅ product.unit field, all units supported | ✅ Unit selector in ClassicBilling | — | ✅ BUILT | 🟡 Important |
| 58 | Product categories | Inventory | ✅ product.category field | ✅ Category filter in Inventory | — | ✅ BUILT | 🟡 Important |
| 59 | Product variants (size/color) | Inventory | ❌ No variant model | ❌ | — | ❌ NOT BUILT | 🟢 Nice-to-have |
| 60 | Cost price / margin tracking | Inventory | ❌ No costPrice field on Product | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 61 | Reorder point + auto-alert | Inventory | ✅ product.minStock threshold + alert | ✅ Dashboard low-stock alerts | — | ✅ BUILT | 🟡 Important |
| 62 | AI catalog import (photo → products) | Inventory | ✅ OCR ocrJobQueue + draft.routes | ✅ DraftManagerPanel | — | 🔄 Partial | 🟢 Nice-to-have |
| 63 | Bulk product import (CSV) | Inventory | ❌ No import endpoint | 🖥️ ImportData.tsx placeholder | — | 🖥️ FRONTEND ONLY | 🟡 Important |
| 64 | Supplier linking per product | Inventory | ✅ Supplier model in schema | ❌ No UI for product-supplier link | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 65 | Purchase bill entry | Purchases & Expenses | ✅ POST /purchases | ✅ Purchases.tsx | — | ✅ BUILT | 🔴 Critical |
| 66 | Supplier management | Purchases & Expenses | ✅ Supplier model in schema | ❌ No dedicated Supplier UI | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 67 | Purchase order | Purchases & Expenses | ❌ No PO model or route | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 68 | Expense categories | Purchases & Expenses | ✅ expense.category string field | ✅ Expenses.tsx category filter | — | ✅ BUILT | 🟡 Important |
| 69 | Expense entry (with receipt) | Purchases & Expenses | ✅ POST /expenses | ✅ Expenses.tsx | — | ✅ BUILT | 🟡 Important |
| 70 | Cash book | Purchases & Expenses | ✅ GET /cashbook (payments in + expenses out) | ✅ CashBook.tsx | — | ✅ BUILT | 🟡 Important |
| 71 | Day book (all transactions) | Purchases & Expenses | ✅ DayBook service | ✅ DayBook.tsx | — | ✅ BUILT | 🟡 Important |
| 72 | GSTR-1 report (B2B/B2CS/HSN summary) | GST & Compliance | ✅ gstr1Service.getGstr1Report() | ✅ Reports.tsx | — | ✅ BUILT | 🔴 Critical |
| 73 | GSTR-1 JSON export (GST portal upload) | GST & Compliance | ❌ CSV only; no official JSON schema export | ❌ | — | ❌ NOT BUILT | 🔴 Critical |
| 74 | GSTR-3B (output tax liability) | GST & Compliance | ❌ No backend | 🖥️ Gstr3b.tsx placeholder | — | 🖥️ FRONTEND ONLY | 🔴 Critical |
| 75 | E-invoicing (IRN + QR code) | GST & Compliance | ❌ No IRP/GSTN API integration | 🖥️ EInvoicing.tsx placeholder | — | 🖥️ FRONTEND ONLY | 🔴 Critical |
| 76 | E-way bill generation | GST & Compliance | ❌ Not built | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 77 | HSN-wise summary | GST & Compliance | ✅ gstr1Service HSN section | ✅ Reports GSTR1 HSN tab | — | ✅ BUILT | 🔴 Critical |
| 78 | Input tax credit (ITC) tracking | GST & Compliance | ❌ No ITC model or tracking | ❌ | — | ❌ NOT BUILT | 🔴 Critical |
| 79 | P&L report (month-wise) | Reports & Analytics | ✅ gstr1Service.getPnlReport() | ✅ Reports.tsx P&L section | — | ✅ BUILT | 🔴 Critical |
| 80 | Balance sheet | Reports & Analytics | ✅ summary API (derived) | ✅ BalanceSheet.tsx | — | ✅ BUILT | 🟡 Important |
| 81 | Cash flow statement | Reports & Analytics | ❌ No dedicated cash flow report | ❌ (CashBook is not a cash flow statement) | — | ❌ NOT BUILT | 🟡 Important |
| 82 | Sales report (by product/customer/category) | Reports & Analytics | ❌ No dedicated sales breakdown endpoint | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 83 | Collection efficiency report | Reports & Analytics | ✅ P&L has collectionRate% | ✅ Reports.tsx shows collection rate | — | ✅ BUILT | 🟡 Important |
| 84 | Overdue aging report | Reports & Analytics | ✅ GET /customers/overdue | ✅ OverduePage aging bands | ✅ | ✅ BUILT | 🔴 Critical |
| 85 | Inventory valuation report | Reports & Analytics | ❌ No stock × cost price report | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 86 | Profit margin by product | Reports & Analytics | ❌ No costPrice tracking | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 87 | Bank reconciliation | Reports & Analytics | ❌ No backend matching engine | 🖥️ BankReconciliation.tsx placeholder (mock CSV parser) | — | 🖥️ FRONTEND ONLY | 🟡 Important |
| 88 | Hindi/Hinglish voice billing | Voice & AI | ✅ Deepgram STT + GPT-4 intent | ✅ VoiceBar + Sessions page | ✅ VoiceScreen | ✅ BUILT | 🔴 Critical |
| 89 | Voice payment recording | Voice & AI | ✅ RECORD_PAYMENT intent handler | ✅ | ✅ | ✅ BUILT | 🔴 Critical |
| 90 | Voice customer lookup | Voice & AI | ✅ GET_CUSTOMER_INFO + CHECK_BALANCE | ✅ | ✅ | ✅ BUILT | 🟡 Important |
| 91 | Voice stock check | Voice & AI | ✅ CHECK_STOCK intent | ✅ | ✅ | ✅ BUILT | 🟡 Important |
| 92 | Voice reminder creation | Voice & AI | ✅ CREATE_REMINDER intent | ✅ | ✅ | ✅ BUILT | 🟡 Important |
| 93 | Multi-turn conversation memory | Voice & AI | ✅ ConversationSession + Redis draft (4h TTL) | ✅ VoiceBar shows draft state | ✅ | ✅ BUILT | 🔴 Critical |
| 94 | Devanagari number support | Voice & AI | ✅ devanagari.ts normalizer | ✅ | ✅ | ✅ BUILT | 🟡 Important |
| 95 | True AI agent mode (LLM tool-calling) | Voice & AI | ❌ Not built (Mode 1 only — switch/case) | ❌ | ❌ | ❌ NOT BUILT | 🟢 Nice-to-have |
| 96 | Multi-user (owner + staff) | User & Team | ✅ POST /users + role assignment | ✅ Settings team section | — | ✅ BUILT | 🔴 Critical |
| 97 | Role-based access (5 roles) | User & Team | ✅ requireRole / requirePermission middleware | ✅ Role selector in add-user dialog | — | ✅ BUILT | 🔴 Critical |
| 98 | 22 granular permissions | User & Team | ✅ ROLE_DEFAULT_PERMISSIONS in types | ✅ Permissions listed on user card | — | ✅ BUILT | 🔴 Critical |
| 99 | User activity audit log | User & Team | ✅ ActivityLog model in schema | ❌ No UI to view audit log | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 100 | Password reset for team members | User & Team | ✅ POST /users/:id/reset-password | ✅ Settings page | — | ✅ BUILT | 🟡 Important |
| 101 | Business profile (name, address, GSTIN, logo) | Settings | ✅ Tenant.gstin, legalName, tradeName, logoUrl | ✅ Settings business profile section | — | ✅ BUILT | 🔴 Critical |
| 102 | Invoice template selection | Settings | ✅ PDF template in pdf.ts | ✅ Settings + ClassicBilling thumbnail picker | — | ✅ BUILT | 🟢 Nice-to-have |
| 103 | Bank account details (for invoice footer) | Settings | ❌ No bankAccount field on Tenant | ❌ No settings field | — | ❌ NOT BUILT | 🔴 Critical |
| 104 | Tax configuration (HSN defaults, return freq) | Settings | ✅ product.hsnCode + product.gstRate | ❌ No global HSN defaults page | — | 🔄 Partial | 🟡 Important |
| 105 | Email settings (SMTP) | Settings | ✅ emailService with SMTP env vars | ❌ No SMTP config UI in Settings | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 106 | WhatsApp settings (Meta Cloud API) | Settings | ✅ whatsappService configured via env | ✅ Settings shows WA card | — | ✅ BUILT | 🟡 Important |
| 107 | Payment gateway config (9 gateways) | Settings | ✅ Per-tenant settings JSON | ✅ Settings shows 9 gateway cards | — | ✅ BUILT | 🟡 Important |
| 108 | Auto-send invoice toggle | Settings | ✅ autoSendEmail + autoSendWhatsApp saved to Tenant.settings JSON via updateProfile API + localStorage | ✅ Settings.tsx has toggles; persisted to both localStorage and backend | — | ✅ BUILT | 🟡 Important |
| 109 | Feature flags per tenant | Settings | ✅ feature-flags.ts + Tenant.features JSON | ❌ No admin UI for flag toggling | — | ⚙️ BACKEND ONLY | 🟡 Important |
| 110 | Multi-language (Hindi/English/Gujarati/Tamil) | Settings | ✅ tenant.language field + Devanagari STT | ✅ Language selector in Settings | — | 🔄 Partial | 🟢 Nice-to-have |
| 111 | Email reminders (BullMQ scheduled) | Notifications | ❌ Not built (WA reminders only) | ❌ | — | ❌ NOT BUILT | 🟡 Important |
| 112 | WhatsApp reminders (auto) | Notifications | ✅ BullMQ + Meta Cloud API (10 types) | ✅ Reminders CRUD UI | — | ✅ BUILT | 🔴 Critical |
| 113 | In-app notifications (WebSocket) | Notifications | ✅ broadcaster.ts 12+ event types | ✅ WSContext real-time invalidation | ✅ | ✅ BUILT | 🟡 Important |
| 114 | Payment received push notification | Notifications | ✅ WS payment:recorded → PaymentSoundBox | ✅ PaymentSoundBox TTS + banner | — | ✅ BUILT | 🟡 Important |
| 115 | Low stock push notification | Notifications | ✅ WS stock:updated event | ✅ Dashboard widget update | — | ✅ BUILT | 🟡 Important |
| 116 | JWT auth with refresh tokens | Security | ✅ HS256 + timingSafeEqual + refresh rotation | ✅ AuthContext refresh handling | ✅ | ✅ BUILT | 🔴 Critical |
| 117 | RBAC permission gating | Security | ✅ requirePermission middleware on all routes | ✅ | — | ✅ BUILT | 🔴 Critical |
| 118 | Multi-tenancy data isolation | Security | ✅ tenantContext AsyncLocalStorage (mostly) | — | — | 🔄 Partial (IDOR risk on getById) | 🔴 Critical |
| 119 | Audit trail (deletedAt soft delete) | Security | ✅ deletedAt on Invoice/Customer/Product | — | — | ✅ BUILT | 🟡 Important |
| 120 | API rate limiting | Security | ✅ Fastify rate-limit plugin | — | — | ✅ BUILT | 🟡 Important |
| 121 | WebSocket real-time sync | Security | ✅ broadcaster.ts per-tenant fan-out | ✅ WSContext | ✅ | ✅ BUILT | 🔴 Critical |
| 122 | Prometheus metrics | Security | ✅ metrics.ts HTTP/voice/LLM/queue | — | — | ✅ BUILT | 🟡 Important |
| 123 | Structured logging (pino) | Security | ✅ logger.ts JSON structured | — | — | ✅ BUILT | 🟡 Important |
| 124 | Docker production deployment | Security | ✅ Dockerfiles + docker-compose.prod.yml | — | — | ✅ BUILT | 🔴 Critical |
| 125 | Database backups (pg_dump) | Security | ✅ GitHub Actions backup (30-day S3) | — | — | ✅ BUILT | 🔴 Critical |

---

### 13.2 Medium-Scale Business Coverage Summary

## Medium-Scale Business Coverage: 80/125 features built or partially built
> Reverified March 13, 2026 — 3 features moved from ❌/⚙️ to ✅ (WhatsApp auto-send, amount-in-words PDF, auto-send toggle); item-level discount blocker clarified.

### ✅ Built & Working (71 features)

**Billing & Invoicing:** GST/IGST/B2B invoices, HSN codes, bill-level discount, multiple tax rates, proforma, proforma→invoice, invoice edit, invoice cancel, invoice PDF, invoice email, WhatsApp auto-send (with Meta credentials), customer portal, partial payment, invoice number sequence, 4 templates, amount-in-words on PDF, walk-in billing, mixed payment, credit limit enforcement, repeat last bill.

**Payment & Ledger:** Cash/UPI/card/mixed payment recording, partial payment tracking, credit (advance) payment, customer ledger, auto-scheduled WhatsApp reminders (10 types), 9-gateway webhook system, Payment Sound Box, overdue tracking + aging.

**Customer Management:** Customer CRUD, tags, credit limit, opening balance, customer portal access, phone quick-dial, customer invoice history.

**Inventory & Products:** Product CRUD, stock tracking, stock adjustment with reason, low stock alerts, top sellers/sales velocity, expiry date tracking, multi-unit, product categories, reorder point, barcode scan (web).

**Purchases & Expenses:** Purchase bill entry, expense categories, expense entry, cash book, day book.

**GST & Compliance:** GSTR-1 report (B2B/B2CS/HSN), HSN-wise summary, P&L month-wise report.

**Reports & Analytics:** P&L report, balance sheet, collection efficiency, overdue aging report.

**Voice & AI:** Hindi/Hinglish voice billing (35 intents), voice payment, voice customer lookup, voice stock check, voice reminder creation, multi-turn conversation memory, Devanagari number support.

**User & Team:** Multi-user, 5 roles, 22 permissions, password reset.

**Settings:** Business profile (GSTIN/name/logo), invoice templates, WhatsApp settings, 9 payment gateway cards, auto-send email + WhatsApp toggles (persisted to API).

**Security & Infrastructure:** JWT + refresh, RBAC, soft delete audit trail, rate limiting, WebSocket real-time sync, Prometheus, pino, Docker, pg_dump backups.

### 🔄 Partial (8 features — backend exists, UI missing OR vice versa)

| Feature | What's Missing |
|---------|---------------|
| Item-level discount (#5) | ClassicBilling submit doesn't pass lineDiscountPercent |
| Batch/lot tracking (#55) | Backend full; frontend batch-entry on purchase form missing |
| Barcode scan — mobile (#54) | Web works; React Native camera not wired |
| Multi-tenancy isolation (#118) | IDOR risk on getCustomerById/getInvoiceById |
| Tax configuration (#104) | Product-level HSN works; no global defaults page |
| Language support (#110) | Hindi voice works; Gujarati/Tamil STT not built |
| Supplier linking (#64) | Supplier model exists; product-supplier UI not built |
| AI catalog import (#62) | OCR draft pipeline works; review/confirmation UX incomplete |

### ❌ Not Built — Critical for Medium-Scale (Top 20 Gaps, Priority Order)

| Priority | # | Feature | Why It Blocks Medium-Scale | Effort Estimate |
|----------|---|---------|--------------------------|----------------|
| 1 | 10 | Credit note / debit note | Mandatory for B2B returns; GST compliance requires CN/DN | 3 days |
| 2 | 22 | Bank details on invoice | No business sends invoices without their bank account printed | 2h |
| 3 | 73 | GSTR-1 JSON export | GST portal upload requires specific JSON schema; CSV is not sufficient | 2 days |
| 4 | 74 | GSTR-3B (output tax liability) | Monthly mandatory filing; businesses get penalized without it | 4 days |
| 5 | 78 | Input tax credit (ITC) tracking | Medium-scale businesses need to claim GST paid on purchases | 3 days |
| 6 | 45 | Customer statement / ledger export | Accountants require PDF/CSV for reconciliation | 1 day |
| 7 | 103 | Bank account details in Settings | Required for invoices + payment collection instructions | 2h |
| 8 | 75 | E-invoicing (IRN generation) | Mandatory for businesses with turnover >₹5Cr | 5 days |
| 9 | 25 | Bulk invoice export (CSV/Excel) | Accountants and CAs need bulk data for reconciliation | 1 day |
| 10 | 23 | Terms & conditions on invoice | Standard on all B2B invoices for legal protection | 4h |
| 11 | 13 | WhatsApp invoice auto-send | Primary communication channel; backend ready, just unwired | 4h |
| 12 | 67 | Purchase order management | Wholesale distributors live on POs | 3 days |
| 13 | 82 | Sales report by product/customer/category | Month-end review requires product-wise revenue breakdown | 2 days |
| 14 | 19 | Round-off on total | Standard on all Indian invoices (rounded to nearest rupee) | 2h |
| 15 | 20 | Amount in words (PDF) | Mandatory on GST invoices above ₹50,000 | 4h (backend PDF) |
| 16 | 66 | Supplier management UI | Purchase orders need a supplier database | 2 days |
| 17 | 111 | Email reminders | Secondary channel when WhatsApp delivery fails | 1 day |
| 18 | 81 | Cash flow statement | Monthly cash flow planning for growing SME | 2 days |
| 19 | 99 | User activity audit log UI | CA and auditors need to see who did what | 1 day |
| 20 | 108 | Auto-send invoice toggle in Settings | Tenant should control if invoices auto-send via WhatsApp/email | 2h |

---

### 13.3 Medium-Scale Business Launch Readiness Score

| Category | Built | Partial | Missing | Total | Coverage % |
|----------|-------|---------|---------|-------|------------|
| Billing & Invoicing (25) | 16 | 1 | 8 | 25 | 68% |
| Payment & Ledger (12) | 12 | 0 | 0 | 12 | 100% |
| Customer Management (10) | 7 | 1 | 2 | 10 | 75% |
| Inventory & Products (17) | 11 | 3 | 3 | 17 | 76% |
| Purchases & Expenses (7) | 5 | 0 | 2 | 7 | 71% |
| GST & Compliance (7) | 2 | 0 | 5 | 7 | 29% |
| Reports & Analytics (9) | 5 | 0 | 4 | 9 | 56% |
| Voice & AI (8) | 7 | 0 | 1 | 8 | 88% |
| User & Team Management (5) | 4 | 1 | 0 | 5 | 90% |
| Settings & Configuration (10) | 7 | 1 | 2 | 10 | 75% |
| Notifications (5) | 3 | 0 | 2 | 5 | 60% |
| Security & Infrastructure (10) | 9 | 1 | 0 | 10 | 95% |
| **TOTAL** | **88** | **8** | **29** | **125** | **70%** |

> **Reverified March 13, 2026:** WhatsApp auto-send (#13), amount-in-words on PDF (#20), and auto-send toggle in Settings (#108) moved from ❌/⚙️ → ✅. Item-level discount (#5) clarified: service.ts is correct, blocker is the API route schema not passing `lineDiscountPercent` per item — a 10-minute fix.

**Interpretation:** At 70% coverage, Execora is production-ready for small kirana/retail (Segment A) but requires the top 10 gaps above to be credible for medium-scale B2B businesses (Segment B). Specifically, GST & Compliance at 29% is the most critical gap — no medium-scale GST-registered business can operate without GSTR-3B, ITC tracking, and proper JSON export.

---

### 13.4 Build Sequence for Medium-Scale Coverage

#### Week 1 — GST Compliance Foundation (reach 75% coverage)
- Bank details on invoice — Settings field + PDF footer (2h)
- Amount in words on PDF — backend pdf.ts update (4h)
- Round-off field on invoice (2h)
- Terms & conditions field on invoice (4h)
- Auto-send invoice toggle in Settings (2h)
- WhatsApp auto-send invoice PDF wire-up from confirmInvoice() (4h)
- Customer statement / ledger export PDF+CSV endpoint (1 day)
- Bulk invoice export CSV endpoint + download button (1 day)

#### Week 2 — GST & Compliance Gap (reach 82% coverage)
- GSTR-1 JSON export in official GSTN schema format (2 days)
- GSTR-3B output tax summary with backend (3 days)
- ITC (input tax credit) tracking from purchase entries (3 days)

#### Week 3 — B2B Features (reach 87% coverage)
- Credit note / debit note (model + routes + PDF + UI) (3 days)
- Purchase order management (model + routes + UI) (3 days)
- Supplier management UI (2 days)

#### Week 4 — Reports & Data Access (reach 91% coverage)
- Sales report by product/customer/category (2 days)
- Cash flow statement (2 days)
- User activity audit log UI (1 day)
- E-invoicing IRN generation — GSTN sandbox integration (5 days, start early for B2B >₹5Cr)

#### Post-Launch Q3 2026
- Bank reconciliation backend (3 days)
- Recurring billing backend (2 days)
- Product variants (size/color) (2 days)
- Bulk customer + product import CSV (2 days)
- E-way bill (2 days)

---

### 13.5 Voice Engine Intents — All 35 Built Intents

All intents route through `packages/modules/src/modules/voice/engine/index.ts`.

| Intent | Handler File | Status |
|--------|-------------|--------|
| CREATE_INVOICE | invoice.handler.ts | ✅ |
| CONFIRM_INVOICE | invoice.handler.ts | ✅ |
| CANCEL_INVOICE | invoice.handler.ts | ✅ |
| SHOW_PENDING_INVOICE | invoice.handler.ts | ✅ |
| TOGGLE_GST | invoice.handler.ts | ✅ |
| PROVIDE_EMAIL / SEND_INVOICE | invoice.handler.ts | ✅ |
| ADD_DISCOUNT | invoice.handler.ts | ✅ |
| SET_SUPPLY_TYPE | invoice.handler.ts | ✅ |
| RECORD_MIXED_PAYMENT | invoice.handler.ts | ✅ |
| TOTAL_PENDING_AMOUNT | customer.handler.ts | ✅ |
| LIST_CUSTOMER_BALANCES | customer.handler.ts | ✅ |
| CHECK_BALANCE | customer.handler.ts | ✅ |
| CREATE_CUSTOMER | customer.handler.ts | ✅ |
| UPDATE_CUSTOMER / UPDATE_CUSTOMER_PHONE | customer.handler.ts | ✅ |
| GET_CUSTOMER_INFO | customer.handler.ts | ✅ |
| DELETE_CUSTOMER_DATA | customer.handler.ts | ✅ |
| RECORD_PAYMENT | payment.handler.ts | ✅ |
| ADD_CREDIT | payment.handler.ts | ✅ |
| CREATE_REMINDER | reminder.handler.ts | ✅ |
| CANCEL_REMINDER | reminder.handler.ts | ✅ |
| LIST_REMINDERS | reminder.handler.ts | ✅ |
| MODIFY_REMINDER | reminder.handler.ts | ✅ |
| DAILY_SUMMARY | report.handler.ts | ✅ |
| CHECK_STOCK | report.handler.ts | ✅ |
| EXPORT_GSTR1 | report.handler.ts | ✅ |
| EXPORT_PNL | report.handler.ts | ✅ |
| UPDATE_STOCK | product.handler.ts | ✅ |

**Not yet as voice intents (❌ missing):**
- APPLY_ITEM_DISCOUNT (item-level per-line discount via voice)
- CREATE_CREDIT_NOTE (no CN/DN model)
- SET_SUPPLY_TYPE already handled; IGST switch via "inter-state" phrasing works

---

### 13.6 Previously Built Features Reference (Sprint History)

| # | Feature | Category | Status |
|---|---------|----------|--------|
| 3 | TTS voice response (ElevenLabs/OpenAI/Browser) | Voice | ✅ TTS providers | ✅ Audio playback | ✅ VoiceScreen | ✅ BUILT | P0 |
| 4 | 35 voice intents (CREATE_INVOICE … UPDATE_STOCK) | Voice | ✅ engine/index.ts switch | ✅ All handled | ✅ | ✅ BUILT | P0 |
| 5 | Intent extraction via GPT-4 | Voice | ✅ LLM provider | ✅ | ✅ | ✅ BUILT | P0 |
| 6 | Deepgram STT (primary) + Browser WebSpeech (fallback) | Voice | ✅ STT providers | ✅ | ✅ | ✅ BUILT | P0 |
| 7 | 3 parallel voice tasks per session | Voice | ✅ task-queue | ✅ | — | ✅ BUILT | P1 |
| 8 | True Agent Mode (LLM tool-calling) | Voice | ❌ not built | ❌ | ❌ | ❌ NOT BUILT | P2 |
| 9 | B2C GST invoice (CGST+SGST intra-state) | Billing | ✅ invoice.service | ✅ InvoiceCreation | ✅ BillingScreen | ✅ BUILT | P0 |
| 10 | Non-GST cash memo | Billing | ✅ withGst=false | ✅ | ✅ | ✅ BUILT | P0 |
| 11 | B2B invoice with buyer GSTIN | Billing | ✅ buyerGstin field | ✅ | — | ✅ BUILT | P0 |
| 12 | IGST (inter-state) auto-switch | Billing | ✅ supplyType=INTERSTATE | ✅ | — | ✅ BUILT | P0 |
| 13 | Walk-in billing (no customer name) | Billing | ✅ Walk-in customer | ✅ QuickActions 1-tap | — | ✅ BUILT | P0 |
| 14 | Partial payment at invoice creation | Billing | ✅ initialPayment field | ✅ | ✅ | ✅ BUILT | P0 |
| 15 | Bill-level discount (voice + form) | Billing | ✅ discountPercent/Amount | ✅ | ✅ | ✅ BUILT | P0 |
| 16 | Item-level (per-line) discount | Billing | ✅ lineDiscountPercent in type | ✅ UI column exists | — | ⚙️ BACKEND ONLY | P0 |
| 17 | Proforma invoice / quotation | Billing | ✅ POST /invoices/proforma | ✅ InvoiceDetail toggle | — | ✅ BUILT | P1 |
| 18 | Proforma → invoice convert (with initial payment) | Billing | ✅ POST /invoices/:id/convert | ✅ | — | ✅ BUILT | P1 |
| 19 | Invoice edit (PATCH — items, discounts, GST flags) | Billing | ✅ PATCH /invoices/:id | ✅ InvoiceDetail edit | — | ✅ BUILT | P1 |
| 20 | Invoice cancel (stock restored, balance adjusted) | Billing | ✅ POST /invoices/:id/cancel | ✅ | — | ✅ BUILT | P1 |
| 21 | Invoice PDF generation + UPI QR in footer | Billing | ✅ pdf.ts + qrcode | ✅ PDF download | — | ✅ BUILT | P0 |
| 22 | Invoice PDF auto-email on confirm | Billing | ✅ dispatchInvoicePdfEmail | ✅ | — | ✅ BUILT | P0 |
| 23 | Invoice PDF auto-WhatsApp on confirm | Billing | ❌ not wired | ❌ no toggle | — | ❌ NOT BUILT | P0 |
| 24 | Invoice numbering (INV/FY/seq, per-tenant, atomic) | Billing | ✅ generateInvoiceNo | ✅ | ✅ | ⚠️ PARTIAL (IDOR risk) | P0 |
| 25 | Repeat last bill ("same as before") | Billing | ✅ GET /customers/:id/last-order | ✅ | — | ✅ BUILT | P1 |
| 26 | Mixed-mode payment (cash+UPI split) | Billing | ✅ POST /ledger/mixed-payment | ✅ Payment page | ✅ PaymentScreen | ✅ BUILT | P1 |
| 27 | Credit limit enforcement on invoice | Billing | ✅ CREDIT_LIMIT_EXCEEDED 422 | ✅ modal shown | — | ✅ BUILT | P1 |
| 28 | Single-screen ClassicBilling (/billing) | Billing | ✅ all routes | ✅ ClassicBilling.tsx | — | ✅ BUILT | P0 |
| 29 | Customer creation (name, phone, email, nickname, tags) | Customer Mgmt | ✅ POST /customers | ✅ Customers.tsx | ✅ CustomersScreen | ✅ BUILT | P0 |
| 30 | Customer fuzzy search (name/phone/nickname/landmark) | Customer Mgmt | ✅ Levenshtein + token | ✅ | ✅ | ✅ BUILT | P0 |
| 31 | Customer profile update (credit limit, tags, notes) | Customer Mgmt | ✅ PATCH /customers/:id | ✅ | ✅ CustomerDetailScreen | ✅ BUILT | P0 |
| 32 | Customer delete (soft delete, GDPR) | Customer Mgmt | ✅ DELETE /customers/:id | ✅ | — | ✅ BUILT | P1 |
| 33 | Customer communication preferences (WhatsApp/email/SMS) | Customer Mgmt | ✅ GET/PUT /comm-prefs | ✅ | — | ✅ BUILT | P1 |
| 34 | Customer invoice history | Customer Mgmt | ✅ GET /customers/:id/invoices | ✅ CustomerDetail | ✅ | ✅ BUILT | P0 |
| 35 | Customer overdue list (balance > 0) | Customer Mgmt | ✅ GET /customers/overdue | ✅ OverduePage | ✅ OverdueScreen | ✅ BUILT | P0 |
| 36 | Customer portal (read-only, HMAC token) | Customer Mgmt | ✅ GET /pub/invoice/:id/:token | ✅ InvoicePortal.tsx | — | ✅ BUILT | P1 |
| 37 | Customer portal PDF redirect (presigned URL) | Customer Mgmt | ✅ GET /pub/.../pdf | ✅ | — | ✅ BUILT | P1 |
| 38 | Customer portal UPI payment link | Customer Mgmt | ❌ not built | ❌ | — | ❌ NOT BUILT | P1 |
| 39 | Payment recording (cash/UPI/card/other) | Ledger/Payments | ✅ POST /ledger/payment | ✅ Payment page | ✅ PaymentScreen | ✅ BUILT | P0 |
| 40 | Credit addition to customer account | Ledger/Payments | ✅ POST /ledger/credit | ✅ | — | ✅ BUILT | P0 |
| 41 | Auto-settlement (oldest-first, khata style) | Ledger/Payments | ✅ ledger.service | ✅ | ✅ | ✅ BUILT | P0 |
| 42 | Customer ledger view (full audit trail) | Ledger/Payments | ✅ GET /ledger/:customerId | ✅ CustomerDetail | ✅ | ✅ BUILT | P0 |
| 43 | UPI webhook — Razorpay (HMAC-SHA256) | Ledger/Payments | ✅ webhook.routes.ts | — | — | ✅ BUILT | P1 |
| 44 | UPI webhook — PhonePe (SHA256+saltKey) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 45 | UPI webhook — Cashfree (HMAC+timestamp) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 46 | UPI webhook — PayU (SHA512 reverse hash) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 47 | UPI webhook — Paytm (TXN_SUCCESS) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 48 | UPI webhook — Instamojo (HMAC-SHA1) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 49 | UPI webhook — Stripe India (stripe-signature) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 50 | UPI webhook — EaseBuzz (SHA512 reverse) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 51 | UPI webhook — BharatPe (HMAC-SHA256) | Ledger/Payments | ✅ | — | — | ✅ BUILT | P1 |
| 52 | Payment Sound Box (Paytm-style voice announcement) | Ledger/Payments | ✅ WS broadcast | ✅ PaymentSoundBox.tsx | — | ✅ BUILT | P1 |
| 53 | Product catalog (name, HSN, GST rate, barcode, stock) | Inventory | ✅ product.routes | ✅ Inventory.tsx | — | ✅ BUILT | P0 |
| 54 | Stock movements (sale/purchase/return/damage/adjustment) | Inventory | ✅ StockMovement model | ✅ | — | ✅ BUILT | P0 |
| 55 | Low stock alerts (minStock threshold, WebSocket push) | Inventory | ✅ product.service | ✅ Dashboard widget | — | ✅ BUILT | P0 |
| 56 | Barcode scan (ZXing EAN-13/QR, web camera) | Inventory | ✅ GET /products/barcode/:barcode | ✅ BarcodeScanner.tsx | — | ✅ BUILT | P1 |
| 57 | Barcode scan (React Native native camera) | Inventory | ✅ same API | — | ❌ not wired | ⚙️ BACKEND ONLY | P1 |
| 58 | OCR purchase bill ingestion (OpenAI Vision, 9-field) | Inventory | ✅ ocrJobQueue + draft.routes | ✅ DraftManagerPanel | — | ⚠️ PARTIAL | P1 |
| 59 | Batch/expiry tracking (batchNo, expiryDate, FIFO) | Inventory | ✅ product.service | ✅ Expiry.tsx page | — | ⚠️ PARTIAL | P1 |
| 60 | Expiry alerts (7/30/90-day) + writeOff | Inventory | ✅ product.service | ✅ Expiry page | — | ⚠️ PARTIAL | P1 |
| 61 | UPDATE_STOCK voice intent ("50 kilo aata aaya") | Inventory | ✅ product.handler.ts | — (no voice UI) | — | ⚙️ BACKEND ONLY | P0 |
| 62 | WhatsApp payment reminders (10 types) | Notifications | ✅ BullMQ + Meta Cloud API | ✅ Reminders CRUD | — | ✅ BUILT | P0 |
| 63 | Natural language reminder scheduling ("kal 9 baje") | Notifications | ✅ reminder.service | ✅ | — | ✅ BUILT | P0 |
| 64 | Recurring reminders (monthly, weekly) | Notifications | ✅ reminder.service | ✅ | — | ✅ BUILT | P1 |
| 65 | Bulk WhatsApp reminders (all overdue customers) | Notifications | ✅ bulk remind endpoint | ✅ OverduePage | ✅ OverdueScreen | ✅ BUILT | P0 |
| 66 | WhatsApp delivery status tracking (delivered/read) | Notifications | ✅ MessageLog + webhook | ✅ | — | ✅ BUILT | P1 |
| 67 | Email invoice delivery (SMTP, BullMQ-queued) | Notifications | ✅ email.ts + mediaQueue | ✅ send-email endpoint | — | ✅ BUILT | P1 |
| 68 | Email reminders (secondary channel) | Notifications | ❌ not built | ❌ | — | ❌ NOT BUILT | P2 |
| 69 | SMS fallback | Notifications | ❌ not built | ❌ | — | ❌ NOT BUILT | P2 |
| 70 | GSTR-1 export (B2B/B2CL/B2CS/HSN, Indian FY) | GST | ✅ report.routes | ✅ Reports.tsx | — | ✅ BUILT | P1 |
| 71 | GSTR-1 PDF + CSV + email delivery | GST | ✅ /gstr1/pdf,/csv,/email | ✅ | — | ✅ BUILT | P1 |
| 72 | P&L date-range report (month-wise, period comparison) | Reports | ✅ /pnl | ✅ Reports.tsx | — | ✅ BUILT | P1 |
| 73 | P&L PDF + CSV + email | Reports | ✅ | ✅ | — | ✅ BUILT | P1 |
| 74 | Balance Sheet page (assets/liabilities/equity) | Reports | ✅ summary API | ✅ BalanceSheet.tsx | — | ✅ BUILT | P1 |
| 75 | CashBook (daily cash in/out ledger) | Reports | ✅ /cashbook | ✅ CashBook.tsx | — | ✅ BUILT | P1 |
| 76 | DayBook (day-wise journal) | Reports | ✅ | ✅ DayBook.tsx | — | ✅ BUILT | P1 |
| 77 | Expenses CRUD | Reports | ✅ expense.routes | ✅ Expenses.tsx | — | ✅ BUILT | P1 |
| 78 | Purchases CRUD | Reports | ✅ expense.routes | ✅ Purchases.tsx | — | ✅ BUILT | P1 |
| 79 | GSTR-3B placeholder | GST | ❌ no backend | 🖥️ Gstr3b.tsx (placeholder) | — | 🖥️ FRONTEND ONLY | P2 |
| 80 | E-invoicing (IRN from GSTN API) | GST | ❌ no backend | 🖥️ EInvoicing.tsx (placeholder) | — | 🖥️ FRONTEND ONLY | P2 |
| 81 | E-way bill | GST | ❌ not built | ❌ | — | ❌ NOT BUILT | P2 |
| 82 | JWT auth (HS256, Node crypto, timingSafeEqual) | Auth/RBAC | ✅ auth.routes | ✅ LoginPage | ✅ LoginScreen | ✅ BUILT | P0 |
| 83 | Refresh token rotation (anti-replay) | Auth/RBAC | ✅ POST /auth/refresh | ✅ AuthContext | ✅ | ✅ BUILT | P0 |
| 84 | 5 roles (owner/admin/manager/staff/viewer), 22 permissions | Auth/RBAC | ✅ require-auth.ts | ✅ | — | ✅ BUILT | P1 |
| 85 | Multi-user management (invite, role assignment) | Auth/RBAC | ✅ users.routes | ✅ Settings page | — | ✅ BUILT | P1 |
| 86 | Feature flags (FeatureFlag enum + TIER_FEATURES + featureGate) | Auth/RBAC | ✅ feature-flags.ts | ✅ (402 on gated) | — | ✅ BUILT | P1 |
| 87 | Platform admin routes (x-admin-api-key) | Admin | ✅ admin.routes | — | — | ✅ BUILT | P1 |
| 88 | BullMQ queue dashboard at /admin/queues (Bull Board) | Admin | ✅ Bull Board | — | — | ✅ BUILT | P1 |
| 89 | Real-time WebSocket dashboard (per-tenant fan-out) | Infrastructure | ✅ broadcaster.ts | ✅ WSContext | ✅ | ✅ BUILT | P0 |
| 90 | Prometheus metrics (HTTP, voice, LLM cost, queue depth) | Infrastructure | ✅ metrics.ts | — | — | ✅ BUILT | P1 |
| 91 | Pino structured JSON logging | Infrastructure | ✅ logger.ts | — | — | ✅ BUILT | P0 |
| 92 | BullMQ queues (reminder, whatsapp, media, ocr) | Infrastructure | ✅ queue.ts | — | — | ✅ BUILT | P0 |
| 93 | MinIO object storage (PDF storage + presigned URLs) | Infrastructure | ✅ storage.ts | — | — | ✅ BUILT | P0 |
| 94 | HMAC portal token (makePortalToken/verifyPortalToken) | Infrastructure | ✅ portal-token.ts | ✅ InvoicePortal | — | ✅ BUILT | P1 |
| 95 | Tenant AsyncLocalStorage context | Infrastructure | ✅ tenant-context.ts | — | — | ✅ BUILT | P0 |
| 96 | Docker multi-stage builds + docker-compose.prod.yml | Infrastructure | ✅ Dockerfiles | — | — | ✅ BUILT | P0 |
| 97 | GitHub Actions pg_dump backup (30-day S3 retention) | Infrastructure | ✅ | — | — | ✅ BUILT | P0 |
| 98 | LLM response cache (Redis, dedup identical prompts) | Infrastructure | ✅ llm-cache.ts | — | — | ✅ BUILT | P1 |
| 99 | Sentry error tracking | Infrastructure | ❌ not in codebase | ❌ | — | ❌ NOT BUILT | P0 |
| 100 | Offline mode (PWA + IndexedDB sync queue) | Infrastructure | ❌ no service worker | ❌ no manifest.json | ❌ | ❌ NOT BUILT | P0 |
| 101 | Bank reconciliation | Reports | ❌ no backend | 🖥️ BankReconciliation.tsx (placeholder) | — | 🖥️ FRONTEND ONLY | P2 |
| 102 | Recurring billing | Billing | ❌ no backend | 🖥️ RecurringBilling.tsx (placeholder) | — | 🖥️ FRONTEND ONLY | P2 |
| 103 | Import data (CSV/Tally XML) | Admin | ❌ no backend | 🖥️ ImportData.tsx (placeholder) | — | 🖥️ FRONTEND ONLY | P2 |
| 104 | Settings page (business profile, GST, voice, 9 gateway cards) | Admin | ✅ tenant update endpoints | ✅ Settings.tsx | — | ✅ BUILT | P0 |
| 105 | Confetti overlay on payment | UX | — | ✅ ConfettiOverlay.tsx | — | 🖥️ FRONTEND ONLY | P2 |
| 106 | Razorpay subscription (SaaS plan billing) | Admin | ❌ not integrated | ❌ | — | ❌ NOT BUILT | P0 |
| 107 | Guided onboarding flow | Admin | ❌ | ❌ | ❌ | ❌ NOT BUILT | P1 |
| 108 | Multi-branch support | Admin | ❌ | ❌ | — | ❌ NOT BUILT | P2 |
| 109 | CA partner mode | Admin | ❌ | ❌ | — | ❌ NOT BUILT | P2 |
| 110 | Mobile ClassicBillingScreen (React Native) | Mobile | ✅ all backend | — | ❌ not built | ⚙️ BACKEND ONLY | P0 |
| 111 | Mobile dashboard charts | Mobile | ✅ summary API | — | ❌ | ⚙️ BACKEND ONLY | P1 |
| 112 | Mobile offline / AsyncStorage queue | Mobile | — | — | ❌ | ❌ NOT BUILT | P0 |

---

### 13.6 What Was Built This Sprint Cycle (Since Last Doc Update)

Features completed across Sprints 8–10 (February–March 2026) that are new since the last documentation update:

**Customer Portal** (`packages/api/src/api/routes/portal.routes.ts`, `apps/web/src/pages/InvoicePortal.tsx`)
- Public invoice view at `/pub/invoice/:id/:token` — no auth required, HMAC-SHA256 token, sanitised JSON (no tenant IDs)
- PDF redirect via fresh 1-hour presigned MinIO URL at `/pub/invoice/:id/:token/pdf`
- `GET /api/v1/invoices/:id/portal-token` endpoint generates the token
- `packages/infrastructure/src/portal-token.ts` — deterministic HMAC, no DB column needed

**Payment Sound Box** (`apps/web/src/components/PaymentSoundBox.tsx`)
- Paytm-style voice announcement: listens to `payment:recorded` WS events
- Green slide-in banner + Web Speech API TTS (prefers hi-IN, falls back to en-IN)
- Queue-safe: back-to-back payments don't overlap
- Also triggers React Query cache invalidation for invoices, customers, ledger, summary

**Feature Flag System** (`packages/infrastructure/src/feature-flags.ts`, `packages/types/src/index.ts`)
- `FeatureFlag` enum: 14 flags across free/starter/business/enterprise tiers
- `TIER_FEATURES` map: tier → flag set, used to seed `Tenant.features` on plan change
- `hasFeature()`, `enableFeature()`, `disableFeature()`, `setTierFeatures()`, `featureGate()` (returns HTTP 402)
- Per-tenant JSON column `Tenant.features` is the live state, updated without deployment

**Balance Sheet Page** (`apps/web/src/pages/BalanceSheet.tsx`)
- Simplified SME assets/liabilities/equity from live API data
- Route `/balance-sheet` registered in App.tsx

**Invoice Edit (PATCH)** — `PATCH /api/v1/invoices/:id`
- Edit items, notes, discounts, GST flags, supply type on PENDING invoices
- Broadcasts `invoice:updated` WS event; ReacrtQuery invalidates InvoiceDetail

**Proforma → Invoice Convert** — `POST /api/v1/invoices/:id/convert`
- Accepts optional `initialPayment` (amount + method) for partial payment at time of conversion
- Fires PDF/email job; broadcasts `invoice:confirmed` WS event

**9-Aggregator UPI Webhook System** (`packages/api/src/api/routes/webhook.routes.ts`)
- Razorpay, PhonePe, Cashfree, PayU, Paytm, Instamojo, Stripe, EaseBuzz, BharatPe
- Each has its own HMAC/signature verification, duplicate-payment guard, `WebhookEvent` store
- Auto-records ledger payment + fires `payment:recorded` WS event for Sound Box

**Mobile React Native App** (`apps/mobile/`)
- 21 screens: Login, Dashboard, BillingScreen, InvoiceList, InvoiceDetail, CustomerList, CustomerDetail, Payment, Overdue, Items, Voice, More, Expenses, CashBook, DayBook, Reports, Purchases, Recurring, Monitoring, Settings, ComingSoon
- Tab bar: Dashboard, Billing, Customers, Invoices, Items, More
- Design system (Button, Input, Card, Badge, Chip, Skeleton, EmptyState, Header, StatusBadge, AmountText)
- WebSocket layer (ws.ts, useWsInvalidation, WSProvider)
- See [MOBILE_APP_IMPLEMENTATION_STATUS.md](MOBILE_APP_IMPLEMENTATION_STATUS.md) for full status

**ClassicBilling Single-Screen Counter UI** — `apps/web/src/pages/ClassicBilling.tsx`
- Route `/billing`, walk-in 1-tap, all billing on one screen

**Overdue Management** — `apps/web/src/pages/OverduePage.tsx`
- Live table of all customers with pending balance, per-row actions, bulk remind

**Expiry Tracking** — `apps/web/src/pages/Expiry.tsx`
- Backend: `batchNo`, `expiryDate`, FIFO deduction, `writeOffExpiredBatch()`, 7/30/90-day alert queries
- Frontend: Expiry page shows expiring-soon products with alert count

**GSTR-1 + P&L Reports with Email**
- `GET /api/v1/reports/gstr1` — B2B/B2CL/B2CS/HSN, Indian FY, PDF+CSV+email
- `GET /api/v1/reports/pnl` — date range, month-wise comparison, PDF+CSV+email

**Email Auto-Delivery on Invoice Confirm**
- `dispatchInvoicePdfEmail()` fires after every `createInvoice()` and `convertProformaToInvoice()`
- Manual re-send: `POST /api/v1/invoices/:id/send-email`

**Customer Communication Preferences**
- `GET/PUT /api/v1/customers/:id/communication-prefs` — per-customer WhatsApp/email/SMS toggles

---

### 13.7 P0 Blockers — Must Fix Before Launch (Security)

These 4 issues are **ship-blocking**. Production must not serve real customer data until all 4 are fixed.

#### Blocker 1 — IDOR in getCustomerById / getInvoiceById

**Severity:** Critical (data breach)
**Location:** `packages/modules/src/modules/customer/customer.service.ts` → `getCustomerById()`, `packages/modules/src/modules/invoice/invoice.service.ts` → `getInvoiceById()`
**Problem:** Both methods do `prisma.X.findUnique({ where: { id } })` without filtering by `tenantId`. Any authenticated user with a valid JWT can fetch any other tenant's customer or invoice by guessing or enumerating UUIDs.
**Fix:** Add `tenantId: tenantContext.get().tenantId` to the `where` clause in both methods. Return `null` (which the route handler converts to 404) if the record belongs to a different tenant.
**Test:** Create Tenant A + Tenant B. Tenant A should receive 404 when requesting Tenant B's customer UUID.

#### Blocker 2 — InvoiceCounter Missing tenantId

**Severity:** Critical (invoice number collision between tenants)
**Location:** `packages/modules/src/modules/invoice/invoice.service.ts` → `generateInvoiceNo()`
**Problem:** `InvoiceCounter` table (used for `$queryRaw` sequence generation) may not partition by `tenantId`. Two tenants in the same financial year could receive the same invoice number — a GST audit failure.
**Fix:** Verify `InvoiceCounter` has a `tenantId` column. If not, add it via a Prisma migration. Update `generateInvoiceNo()` to filter by `tenantId`. Add a unique constraint on `(tenantId, fiscalYear)`.
**Test:** Tenant A and Tenant B both create invoices — they must get independent sequences.

#### Blocker 3 — MinIO World-Readable Bucket

**Severity:** High (invoice PDFs publicly accessible without authentication)
**Location:** MinIO bucket policy, `packages/infrastructure/src/storage.ts`
**Problem:** If the MinIO bucket is configured with anonymous read access (public policy), any invoice PDF is accessible to anyone who knows or guesses the object key. Invoice PDFs contain customer names, phone numbers, GST details, and purchase amounts.
**Fix:** Remove anonymous read access from the MinIO bucket. The portal route already generates fresh presigned 1-hour URLs (`minioClient.getPresignedUrl()`). All other PDF delivery goes through the email queue — no direct public URL needed.
**Test:** Copy the `pdfObjectKey` from an invoice and attempt to GET it directly from MinIO without a presigned URL — should return 403.

#### Blocker 4 — WebSocket Unauthenticated Voice Commands

**Severity:** High (unauthenticated voice command execution)
**Location:** `packages/api/src/ws/enhanced-handler.ts`
**Problem:** The WebSocket endpoint at `/ws` may not verify JWT before accepting voice audio streams. If unauthenticated connections are accepted, an attacker could send fabricated voice intent payloads and execute business operations (create invoices, record payments) on any tenant's account.
**Fix:** On WebSocket upgrade request, extract and verify the JWT (passed as `?token=` query param or `Authorization` header). Close the connection with code 4001 if the JWT is missing, expired, or invalid. Set `request.user` on the connection for downstream use.
**Test:** Open a raw WebSocket connection to `/ws` without a token — should be rejected with close code 4001.

---

### 13.8 P0 Feature Gaps — Must Build Before Paid Launch

Features that are critical for the kirana/SME launch but are missing or unwired:

| # | Feature | What's Missing | Effort | Segment |
|---|---------|---------------|--------|---------|
| 1 | Item-level discount backend wiring | `resolveItemsAndTotals()` not applying `lineDiscountPercent`; submit form drops it | 3h | Both |
| 2 | WhatsApp auto-send invoice PDF on confirm | `confirmInvoice()` doesn't queue WA job; no per-tenant autoWhatsapp toggle | 4h | Segment A |
| 3 | UPDATE_STOCK voice intent wired | `executeUpdateStock` handler exists in product.handler.ts but voice engine switch and LLM prompt not updated | 3h | Both |
| 4 | Sentry / error tracking | No `@sentry/node` in API, no `@sentry/react` in web; production errors invisible | 1h | All |
| 5 | Mobile-responsive layout (S10-03) | Web app desktop-first; BottomNav exists but breakpoints not enforced; touch targets < 44px | 2d | Segment A |
| 6 | Mobile ClassicBillingScreen (React Native) | ✅ BillingScreen 3-step wizard exists; further polish possible | — | Segment A |
| 7 | Offline mode — PWA + IndexedDB | No service worker, no manifest.json, no IndexedDB outbox; 22% of users cite as dealbreaker | 5d | Segment A |
| 8 | Razorpay subscription integration | Webhook handler exists; plan billing (subscriptions) not integrated; zero monetization | 2d | All |
| 9 | GSTIN checksum validation | B2B invoice accepts any 15-char string as GSTIN; no format/state-code validation | 2h | Segment B |
| 10 | listAllCustomers uses JS slice, not DB pagination | `customerService.listAllCustomers()` loads all records then slices in memory — will break at scale | 1h | All |

---

### 13.9 P1 Feature Gaps — Build in First 30 Days Post-Launch

| # | Feature | Notes | Effort |
|---|---------|-------|--------|
| 1 | Guided onboarding flow | No step-by-step onboarding (business profile → first invoice < 5 min); new tenants land on empty dashboard | 3d |
| 2 | Customer portal UPI payment link | Portal shows invoice but no UPI deep link or pay button | 1d |
| 3 | WhatsApp delivery failure → email fallback | Currently no fallback chain; failed WA = silent failure | 2h |
| 4 | Referral program | "Invite 3 friends → 3 months free" not built | 2d |
| 5 | True Agent Mode (Mode 3) | LLM tool-calling voice; two-agent pattern; planned Q3 2026 | 3w |
| 6 | Batch/expiry frontend completion (S10-05) | Backend complete; batch entry on Purchase form and batch selector on invoice rows needed | 1d |
| 7 | Push notifications for payment reminders (mobile) | BullMQ handles WA; native push not integrated | 2d |
| 8 | React ErrorBoundary in App.tsx | No crash boundary; uncaught React errors show blank screen | 1h |
| 9 | Barcode scan on React Native (native camera) | Web ZXing works; RN needs react-native-vision-camera | 1d |
| 10 | Mobile dashboard charts | DashboardScreen exists; recharts/SVG charts not wired | 2d |
| 11 | PWA "Quick Bill" shortcut (manifest.json) | ClassicBilling exists; home screen shortcut and auto-focus on load not set up | 2h |
| 12 | Log rotation for logs/app.log | Pino writes to file; no rotation configured; disk fill risk in production | 1h |

---

### 13.10 P2 Backlog — Future Roadmap

| Feature | Tier | Quarter |
|---------|------|---------|
| E-invoicing (IRN + QR code from GSTN API) | Enterprise | Q4 2026 |
| E-way bill generation | Enterprise | Q4 2026 |
| Multi-branch support (consolidated reporting) | Enterprise | Q4 2026 |
| Bank reconciliation backend | Enterprise | Q4 2026 |
| CA partner mode (external accountant dashboard) | Enterprise | Q4 2026 |
| API webhooks + REST access for ERP integration | Enterprise | Q4 2026 |
| WhatsApp chatbot interface (voice note → AI → reply) | Enterprise | Q4 2026 |
| Tally XML import (migration tool for Tally defectors) | Enterprise | Q4 2026 |
| Desktop Electron wrapper (for Windows Tally replacers) | Enterprise | Q4 2026 |
| GSTR-3B (output tax liability reconciliation) | Business+ | Q4 2026 |
| GSTR-2A / ITC reconciliation | Business+ | Q4 2026 |
| Email reminders (secondary channel after WhatsApp) | Starter+ | Q3 2026 |
| SMS fallback (Twilio/Textlocal) | All | Q3 2026 |
| Offline mode (PWA + IndexedDB) | All | Q3 2026 |
| True Agent Mode (Mode 3 — LLM tool-calling) | Business+ | Q3 2026 |
| Multi-language STT (Marathi, Gujarati, Tamil, Telugu) | Business+ | Q3 2026 |
| Recurring billing backend | Starter+ | Q2 2026 |
| Customer loyalty points | Enterprise | Q4 2026 |
| Thermal receipt printer support | Business+ | Q4 2026 |
| Barcode label printing | Business+ | Q4 2026 |
| Staff attendance tracking | Business+ | Q4 2026 |
| Price lists (wholesale vs retail tiers) | Business+ | Q3 2026 |
| Analytics AI ("explain my sales drop") | Enterprise | Q4 2026 |
| E-commerce integration (Shopify/WooCommerce) | Enterprise | 2027 |
| Credit scoring from transaction history | Enterprise | 2027 |
| Bank current account integration | Enterprise | 2027 |

---

### 13.5 Previously Built — Backend API Reference

**Auth & Users**
- `POST /api/v1/auth/login` — JWT login (HS256, Node crypto)
- `POST /api/v1/auth/refresh` — refresh token rotation
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/hash`
- `GET/POST/PATCH /api/v1/users` — user management with RBAC

**Invoices** (`packages/api/src/api/routes/invoice.routes.ts`)
- `GET /api/v1/invoices` — list with limit
- `GET /api/v1/invoices/:id` — invoice detail
- `POST /api/v1/invoices` — create invoice (GST/non-GST, B2B/B2C, INTRASTATE/INTERSTATE, initial payment, bill-level discount, walk-in)
- `POST /api/v1/invoices/proforma` — create proforma/quotation
- `POST /api/v1/invoices/:id/convert` — proforma → confirmed invoice (with optional initial payment)
- `PATCH /api/v1/invoices/:id` — edit pending invoice (items, notes, discounts, GST flags)
- `POST /api/v1/invoices/:id/cancel` — cancel invoice (stock restored, balance adjusted)
- `GET /api/v1/invoices/:id/portal-token` — generate HMAC public portal token
- `POST /api/v1/invoices/:id/send-email` — (re-)send invoice PDF to customer
- `POST /api/v1/ledger/mixed-payment` — record split cash+UPI payment (also in invoice.routes.ts)

**Customers** (`packages/api/src/api/routes/customer.routes.ts`)
- `GET /api/v1/customers` — list/paginate/search
- `GET /api/v1/customers/overdue` — customers with positive balance
- `GET /api/v1/customers/search` — fuzzy name/phone search
- `GET /api/v1/customers/:id`
- `POST /api/v1/customers` — create (with opening balance, credit limit, tags)
- `PATCH /api/v1/customers/:id` — update profile, credit limit, tags
- `DELETE /api/v1/customers/:id`
- `GET /api/v1/customers/:id/invoices`
- `GET /api/v1/customers/:id/last-order` — for Repeat Last Bill
- `GET/PUT /api/v1/customers/:id/communication-prefs`

**Ledger** (`packages/api/src/api/routes/ledger.routes.ts`)
- `POST /api/v1/ledger/payment` — record payment (cash/upi/card/other, date, reference)
- `POST /api/v1/ledger/credit` — add credit to customer account
- `GET /api/v1/ledger/:customerId` — full ledger history

**Products & Inventory** (`product.routes.ts`)
- `GET/POST/PATCH/DELETE /api/v1/products`
- `GET /api/v1/products/barcode/:barcode` — barcode lookup

**Reminders** (`reminder.routes.ts`)
- Full CRUD for 10 reminder types (payment_due, payment_overdue, invoice_reminder, low_stock, expiry_alert, birthday, follow_up, gst_filing, staff_task, custom)
- Natural language scheduling ("kal subah 9 baje")
- Bulk remind endpoint

**Reports** (`report.routes.ts`)
- `GET /api/v1/reports/gstr1` — GSTR-1 (B2B/B2CL/B2CS/HSN), Indian FY support
- `GET /api/v1/reports/gstr1/pdf`, `/gstr1/csv`, `/pnl`, `/pnl/pdf`, `/pnl/csv`, `/email`
- `GET /api/v1/reports/pnl` — P&L date-range, month-wise, period comparison

**Expenses & Purchases** (`expense.routes.ts`)
- `GET/POST/PATCH/DELETE /api/v1/expenses`
- `GET/POST/PATCH/DELETE /api/v1/purchases`
- `GET /api/v1/cashbook`

**Voice / AI / Sessions** (`ai.routes.ts`, `session.routes.ts`)
- WebSocket `/ws` — PCM audio → Deepgram STT → GPT-4 intent extraction → 25 handlers
- `GET/POST/DELETE /api/v1/sessions`

**Drafts / OCR** (`draft.routes.ts`)
- `GET/POST/PATCH/DELETE /api/v1/drafts`
- OCR pipeline: photo → OpenAI Vision → 9-field extraction → drafts table

**Admin** (`admin.routes.ts`)
- `/admin/*` — platform admin routes (x-admin-api-key auth)
- `/admin/queues` — BullMQ queue dashboard (Bull Board)

**Public / Webhooks**
- `GET /pub/invoice/:id/:token` — customer-facing invoice portal (no auth, HMAC token)
- `GET /pub/invoice/:id/:token/pdf` — redirect to presigned MinIO PDF URL
- `GET/POST /api/v1/webhook/whatsapp` — Meta WhatsApp delivery status
- `POST /api/v1/webhook/razorpay/:tenantId` — HMAC-SHA256-hex verified
- `POST /api/v1/webhook/phonepe/:tenantId` — SHA256(base64+saltKey) verified
- `POST /api/v1/webhook/cashfree/:tenantId` — HMAC-SHA256-base64 + timestamp
- `POST /api/v1/webhook/payu/:tenantId` — SHA-512 reverse hash
- `POST /api/v1/webhook/paytm/:tenantId` — STATUS=TXN_SUCCESS
- `POST /api/v1/webhook/instamojo/:tenantId` — HMAC-SHA1
- `POST /api/v1/webhook/stripe/:tenantId` — stripe-signature verified
- `POST /api/v1/webhook/easebuzz/:tenantId` — SHA-512 reverse hash
- `POST /api/v1/webhook/bharatpe/:tenantId` — HMAC-SHA256-hex

**Health**: `GET /health` — DB + Redis checks (used by load balancers)

---

## 15. Sprint 9 — Plan (2026-03-05 onwards)

### Goal

Close the top P0 gaps that directly impact daily counter sales: frictionless walk-in billing, WhatsApp PDF delivery on confirm, and UPI QR on invoices. These three together eliminate the most common reasons a kirana owner prefers Vyapar over Execora.

### Sprint 9 Stories — Code Audit (2026-03-07)

> **Audit date:** 2026-03-07
> Legend: ✅ Done | ⚠️ Partial — needs backend work | 🔴 Not built

| #     | Story                                         | Priority | Est. | Status                             | Audit Finding                                                                                                                                                                                                                                                        |
| ----- | --------------------------------------------- | -------- | ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S9-01 | **WhatsApp auto-send PDF on invoice confirm** | P0       | 4 h  | 🔴 **Not built**                   | `confirmInvoice()` only queues an email job. No WhatsApp job queued. No per-tenant WhatsApp auto-send toggle in Settings.                                                                                                                                            |
| S9-02 | **Walk-in 1-tap button**                      | P0       | 2 h  | ✅ **Done**                        | `QuickActions.tsx` "Quick Sale ▶" opens `<InvoiceCreation startAsWalkIn />`. Walk-in customer auto-selected, search step skipped.                                                                                                                                    |
| S9-03 | **UPI QR code on invoice PDF**                | P0       | 3 h  | ✅ **Done**                        | `packages/infrastructure/src/pdf.ts` imports `qrcode`, generates `upi://pay?pa=…` URL, embeds 64×64 PNG in PDF footer when `upiVpa` is set.                                                                                                                          |
| S9-04 | **Item-level discount**                       | P0       | 3 h  | ⚠️ **UI only — backend not wired** | Per-item `discount` (%) column exists in `InvoiceCreation.tsx` and renders correctly. But submit drops it — only `{ productName, quantity, unitPrice }` is sent. `InvoiceItemInput` has no discount field. `resolveItemsAndTotals()` has no per-line discount logic. |
| S9-05 | **Single-screen classic billing UI**          | P0       | 1 d  | ✅ **Done**                        | `apps/web/src/pages/ClassicBilling.tsx` exists with S9-05 comment. Route `/classicbilling` registered in `App.tsx`.                                                                                                                                                  |
| S9-06 | **Batch / expiry entry**                      | P1       | 1 d  | ✅ **Partially built**             | `product.service.ts` has full backend logic: `batchNo`, `expiryDate`, 7/30/90-day alerts, `writeOffExpiredBatch()`, FIFO deduction. Frontend batch-entry UI in Inventory needs verification.                                                                         |
| S9-07 | **Customer email prompt at creation**         | P1       | 2 h  | ✅ **Done**                        | `Customers.tsx` email label is blue-highlighted with `(Enables PDF delivery)` hint text and blue-bordered input.                                                                                                                                                     |

---

### What Remains To Build

#### 🔴 S9-01 — WhatsApp auto-send PDF on invoice confirm (~4 h)

**Files to change:**

1. **`packages/modules/src/modules/invoice/invoice.service.ts`**
   In `confirmInvoice()`, after the email job is queued, queue a WhatsApp job when the customer has a phone number and the tenant has `autoWhatsapp` enabled:

   ```typescript
   if (customer.phone && tenantSettings.autoWhatsapp) {
     await queue.add("whatsapp:send-invoice", {
       tenantId,
       invoiceId: invoice.id,
       phone: customer.phone,
       pdfUrl: invoice.pdfUrl,
     });
   }
   ```

2. **`apps/web/src/pages/Settings.tsx`** — add a "Auto-send invoice via WhatsApp" toggle (mirrors the existing email toggle). Saves to tenant settings as `autoWhatsapp: boolean`.

3. **`packages/types/src/index.ts`** — add `autoWhatsapp?: boolean` to the tenant settings type if not already present.

---

#### ⚠️ S9-04 — Item-level discount — wire backend (~3 h)

The UI already has a `discount` (%) column per item. Three places need to change:

1. **`packages/types/src/index.ts`** — add `lineDiscountPercent` to `InvoiceItemInput`:

   ```typescript
   export interface InvoiceItemInput {
     productName: string;
     quantity: number;
     unitPrice?: number;
     lineDiscountPercent?: number; // 0–100 per-line discount %
   }
   ```

2. **`packages/modules/src/modules/invoice/invoice.service.ts`** — in `resolveItemsAndTotals()`, apply line discount before computing subtotal:

   ```typescript
   const lineDisc = item.lineDiscountPercent ?? 0;
   const effectivePrice =
     lineDisc > 0
       ? Math.round(unitPrice * (1 - lineDisc / 100) * 10000) / 10000
       : unitPrice;
   const subtotal = Math.round(effectivePrice * item.quantity * 100) / 100;
   ```

3. **`apps/web/src/components/InvoiceCreation.tsx`** — in the submit `invItems` map (~line 643), pass the discount through:

   ```typescript
   items.map((it) => ({
     productName: it.name,
     quantity: parseInt(it.qty) || 1,
     unitPrice: it.price > 0 ? it.price : undefined,
     lineDiscountPercent: it.discount > 0 ? it.discount : undefined,
   }));
   ```

4. **Voice engine** — `packages/modules/src/providers/llm/prompts.ts` already documents per-item discount syntax (`ADD_DISCOUNT` with a `product` entity). The handler needs to extract `discountPercent` from the entity and pass it as `lineDiscountPercent` on the matching item.

---

### Sprint 9 Success Criteria

- ✅ Walk-in bill completed in < 10 s from dashboard (S9-02)
- ✅ Any invoice PDF with `upiVpa` configured shows UPI QR in footer (S9-03)
- ✅ Single-screen classic billing at `/classicbilling` (S9-05)
- ✅ Customer creation form highlights email with "Enables PDF delivery" hint (S9-07)
- 🔴 Invoice confirm → WhatsApp PDF received within 5 s (S9-01)
- ⚠️ Voice/manual "item pe 5% discount" reduces that line's taxable value in totals and PDF (S9-04)

---

## Agent Instructions: How to Use This Document

> If you are an AI agent working on this codebase, read this section carefully.

> ⚠️ **MANDATORY**: Before writing any code, read [`docs/AGENT_CODING_STANDARDS.md`](./AGENT_CODING_STANDARDS.md) in full.
> It defines the non-negotiable rules for error handling, logging, metrics, tracing, TypeScript, and code structure.
> Every PR that violates those rules will be rejected.

### Before Writing Any Code

1. Find the relevant use case in Section 3 — understand the **real user problem** you are solving.
2. Check Section 11 — is this feature P0, P1, or P2? Don't build P2 features before P0 gaps are closed.
3. Check Section 13 — is this feature already built? Don't duplicate.
4. Understand Section 6 — does your feature need to work in **both** Agent Mode and Classic Mode?
5. Check Section 7 — does your feature emit or consume WebSocket events? Add to `WSContext.tsx` and `enhanced-handler.ts`.
6. Open [`docs/AGENT_CODING_STANDARDS.md`](./AGENT_CODING_STANDARDS.md) — confirm your code plan follows every rule in §3 (errors), §4 (logging), §5 (metrics), §8 (route anatomy), §9 (service layer).

### Coding Conventions

```typescript
// Service layer (packages/modules): all business logic
// Route layer (packages/api/src/api/routes): thin HTTP/WS adapter
// UI layer (apps/web/src): React components consuming REST + WebSocket

// Cross-package imports: always use barrel imports
import { customerService, invoiceService } from "@execora/modules";
import { prisma, logger } from "@execora/infrastructure";

// Database: always include tenantId in all queries
const results = await prisma.product.findMany({
  where: { tenantId: tenantContext.get().tenantId, isActive: true },
});

// Invoice status values: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled'
// NOT 'issued' (legacy, no longer used)

// React Query keys: always use QK object from useQueries.ts
// WebSocket events: always broadcast on data mutation (not just REST response)
```

### Understanding the Three Execution Modes

```
Mode 1 — Intent-Based (current voice): STT → LLM extracts JSON → switch(intent) → handler
  File: packages/modules/src/modules/voice/engine/index.ts
  Fixed, deterministic, LLM is NOT in execution path

Mode 2 — Form/Dashboard (UI): React form → REST API → service → WebSocket broadcast
  Files: apps/web/src/pages/*.tsx → packages/api/src/api/routes/*.ts
  No AI in execution

Mode 3 — True Agent (planned): STT → LLM with tool definitions → tool calls → LLM response
  File: packages/modules/src/providers/llm/ (to be created: agent-runner.ts)
  LLM decides which tools to call and in what order
```

### When Adding a New Voice Feature

**Add to all three modes in order:**

1. **Service layer** — implement in `packages/modules/src/modules/X/x.service.ts`
2. **REST route** — thin wrapper in `packages/api/src/api/routes/x.routes.ts` (Form/Dashboard mode ✅)
3. **Intent handler** — add to `packages/modules/src/modules/voice/engine/x.handler.ts`
   - Add case to `engine/index.ts` switch statement
   - Add to LLM extraction prompt with Hindi few-shot examples (Intent-Based mode ✅)
4. **Agent tool** — add tool definition to `packages/modules/src/providers/llm/agent-tools.ts`
   - Description in plain English so LLM can discover and use it (Agent Mode ✅)
5. **React Query hook** — add to `apps/web/src/hooks/useQueries.ts`
6. **WebSocket** — add invalidation to `apps/web/src/contexts/WSContext.tsx`
7. **Update this document** — Section 4 (requirements) + Section 13 (built/pending)

### When in Doubt

- The target user is a kirana store owner in a Tier-2 Indian city, speaking Hindi.
- The target interaction is 3-5 seconds for a common task (create bill, record payment).
- If a feature requires more than 3 taps or 10 words to use, it's too complex.
- Every new feature must answer: "Does this make Suresh (kirana owner) faster or richer?"

---

---

## 14. User Research Findings — Review-Backed Priority Updates (v2.4)

### Research Basis

193+ verified user reviews analysed from SoftwareSuggest (Vyapar 125, myBillBook 68),
Trustpilot, GetApp (181 ratings), and Play Store. Full analysis in
`docs/audit/USER_RESEARCH_IMPROVEMENT_ANALYSIS.md`.

### Top 5 User Insights

1. **Speed is the only retention metric for counter users.** 34% of 5-star reviews
   across all platforms cite "invoice in under a minute" as the primary reason for
   their rating. Every screen transition adds friction.

2. **OCR purchase bill scanning is the next viral AI feature.** Verified users
   are actively calling it "game changer" where it exists. Execora already has
   OpenAI infrastructure — this is one new tool definition + one new route.

3. **Single-screen billing** is the #1 UX complaint. Page navigation between customer
   selection and item-addition is mentioned in ~19% of 3-star reviews. This is a
   CSS/React restructure only — zero backend change required.

4. **Purchase/AP side is the market's weakest point.** GetApp gives Vyapar 3.0/5
   for purchase order management — the lowest-rated feature across all tools.
   Being first to solve AP with voice is a defensible moat.

5. **Pharmacy vertical pays premium and has zero coverage.** 1-star reviews from
   pharmacy owners cite complete absence of batch/expiry/compliance features.
   Adding this vertical requires one sprint and unlocks ₹3,000+/month per user.

### Priority Upgrades (backed by review data)

| Feature                              | Old Priority | New Priority  | Reason                                    |
| ------------------------------------ | ------------ | ------------- | ----------------------------------------- |
| Offline mode (PWA + IndexedDB queue) | P2           | P0            | 22% of users cite offline as dealbreaker  |
| Single-screen classic billing UI     | Not listed   | P0            | #1 UX complaint, zero backend work needed |
| OCR purchase bill ingestion          | Not listed   | P0            | Highest-impact AI differentiator found    |
| UPI QR code on invoice               | Not listed   | P0            | Low effort, very high request frequency   |
| Recurring/automatic billing          | P2           | P1            | Mentioned in 18% of positive reviews      |
| Batch/expiry tracking (pharma)       | P1           | P1 fast-track | Pharmacy segment has zero alternatives    |
| Multiple price tiers per product     | Not listed   | P1            | Core pain for wholesale + retail split    |
| Customer portal (read-only link)     | Not listed   | P1            | New trust + retention mechanism           |
| Invoice template customization       | P1           | P1 fast-track | Requested in 15%+ of reviews              |

---

## 16. Sprint 10 — Plan (2026-03-07 onwards)

### Goal

Close the last P0 billing gap (item-level discount), add the most-requested missing voice command (inbound stock receipt), and improve mobile layout for counter use. Offline mode is scoped separately as a large dedicated milestone.

### Sprint 10 Stories — Code Audit (2026-03-07)

> **Audit date:** 2026-03-07
> Legend: ✅ Done | ⚠️ Partial | 🔴 Not built

| #      | Story                             | Priority | Est. | Status              | Audit Finding                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | --------------------------------- | -------- | ---- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S10-01 | **Item-level discount — backend** | P0       | 3 h  | ⚠️ **UI only**      | `InvoiceItem.discount` (%) column renders in `InvoiceCreation.tsx` and `InvoiceDetail.tsx`. But submit map drops `discount`. `InvoiceItemInput` type has no `lineDiscountPercent`. `resolveItemsAndTotals()` in `invoice.service.ts` has no per-line discount logic. Voice `ADD_DISCOUNT` with `product` entity is documented in prompts but handler doesn't route it per-item. |
| S10-02 | **UPDATE_STOCK voice intent**     | P0       | 3 h  | 🔴 **Not built**    | `productService.updateStock(productId, qty, 'add')` exists and is tested. But: no `UPDATE_STOCK` intent in `prompts.ts`, no handler in `voice/engine/`, LLM cannot parse "50 kilo aata aaya" and route it here.                                                                                                                                                                 |
| S10-03 | **Mobile layout — counter mode**  | P0       | 2 d  | ⚠️ **Partial**      | App is desktop-first. Missing: bottom navigation bar for small screens, larger touch targets on invoice item rows, full-screen slide-over panels on mobile, sticky action bar on InvoiceDetail.                                                                                                                                                                                 |
| S10-04 | **Offline mode (PWA)**            | P0       | 5 d  | 🔴 **Not built**    | No service worker, no `manifest.json`, no IndexedDB queue. 22% of users cite this as a dealbreaker. Scoped as separate milestone — see implementation plan below.                                                                                                                                                                                                               |
| S10-05 | **Pharmacy: batch/expiry UI**     | P1       | 1 d  | ⚠️ **Backend only** | `product.service.ts` has full batch/expiry logic (S9-06). Missing: frontend batch entry on Purchase form, expiry alert banner on Inventory page, batch selector on invoice item rows.                                                                                                                                                                                           |

---

### What Remains To Build

#### ⚠️ S10-01 — Item-level discount — backend wiring (~3 h)

**4 files to change:**

1. **`packages/types/src/index.ts`** — add `lineDiscountPercent` to `InvoiceItemInput`:

   ```typescript
   export interface InvoiceItemInput {
     productName: string;
     quantity: number;
     unitPrice?: number;
     lineDiscountPercent?: number; // 0–100 per-line discount %
   }
   ```

2. **`packages/modules/src/modules/invoice/invoice.service.ts`** — in `resolveItemsAndTotals()`, apply line discount before subtotal:

   ```typescript
   const lineDisc = item.lineDiscountPercent ?? 0;
   const effectivePrice =
     lineDisc > 0
       ? Math.round(unitPrice * (1 - lineDisc / 100) * 10000) / 10000
       : unitPrice;
   const subtotal = Math.round(effectivePrice * item.quantity * 100) / 100;
   ```

3. **`apps/web/src/components/InvoiceCreation.tsx`** — in the submit `invItems` map (~line 643), pass discount:

   ```typescript
   items.map((it) => ({
     productName: it.name,
     quantity: parseInt(it.qty) || 1,
     unitPrice: it.price > 0 ? it.price : undefined,
     lineDiscountPercent: it.discount > 0 ? it.discount : undefined,
   }));
   ```

4. **`packages/modules/src/providers/llm/prompts.ts`** — `ADD_DISCOUNT` with `product` entity should route to per-line, not bill-level. Handler in `invoice.handler.ts` needs to detect the `product` entity and apply `lineDiscountPercent` only to that item in the draft.

---

#### 🔴 S10-02 — UPDATE_STOCK voice intent (~3 h)

`productService.updateStock()` already exists. Only the voice layer is missing.

**3 files to change:**

1. **`packages/modules/src/providers/llm/prompts.ts`** — add `UPDATE_STOCK` intent definition and examples:

   ```
   UPDATE_STOCK: inbound stock receipt — "X kg/pcs Y aaya/mila/stock mein add karo"
   Examples:
   - "50 kilo aata aaya" → UPDATE_STOCK, product=aata, quantity=50
   - "100 Maggi stock mein add karo" → UPDATE_STOCK, product=Maggi, quantity=100
   - "cheeni 2 bori aayi" → UPDATE_STOCK, product=cheeni, quantity=2
   ```

2. **`packages/modules/src/modules/voice/engine/product.handler.ts`** (new handler or add to existing) — `executeUpdateStock()`:

   ```typescript
   export async function executeUpdateStock(entities, conversationId) {
     const product = await productService.findByName(entities.product);
     if (!product)
       return {
         success: false,
         message: `'${entities.product}' product nahi mila`,
       };
     const updated = await productService.updateStock(
       product.id,
       entities.quantity,
       "add",
     );
     return {
       success: true,
       message: `✅ ${product.name} ka stock ${updated.stock} ho gaya (+${entities.quantity})`,
     };
   }
   ```

3. **`packages/modules/src/modules/voice/engine/enhanced-handler.ts`** (or equivalent router) — add `UPDATE_STOCK` case to the intent dispatch switch.

---

#### ⚠️ S10-03 — Mobile layout — counter mode (~2 d)

**What to add:**

- Bottom navigation bar (`Home | Customers | Invoice | Reports | Settings`) visible only on `max-md` that replaces the side drawer on mobile
- Increase all `h-8 w-8` touch targets on invoice item rows to `h-10 w-10` (min 44×44 px)
- `InvoiceCreation.tsx` — sheet should use `h-full` on mobile (`sm:h-auto`)
- `InvoiceDetail.tsx` — sticky "Record Payment" CTA bar pinned to bottom on mobile
- `ClassicBilling.tsx` — already exists, confirm it is touch-friendly

---

#### 🔴 S10-04 — Offline mode PWA (~5 d — separate milestone)

**Implementation plan:**

1. Add `vite-plugin-pwa` to `apps/web/vite.config.ts`; configure `manifest.json` (name, icons, theme_color)
2. Service worker strategy: `StaleWhileRevalidate` for GET APIs, `NetworkFirst` for mutations
3. IndexedDB queue (`idb` npm): when offline, `createInvoice()` / `addPayment()` write to a local `outbox` store
4. Background sync: when network returns, drain `outbox` in FIFO order via `navigator.serviceWorker.sync`
5. UI: show "Offline — X actions queued" banner; disable voice STT gracefully; mark queued invoices with ⏳ badge

---

### Sprint 10 Success Criteria

- 🔴 Voice "aata pe 5% discount do" correctly reduces that line's taxable value in the PDF and totals (S10-01)
- 🔴 Voice "50 kilo aata aaya" successfully increments aata stock by 50 (S10-02)
- ⚠️ All primary flows (create invoice, record payment, view customers) fully usable on 375 px screen without horizontal scroll (S10-03)

---

_Document maintained by the Execora engineering team._
_v2.3: Sprint 7 — Overdue page, bulk reminders, phone-optional reminder path._
_v2.4: Priority matrix updated based on 193+ real user reviews. New P0: OCR purchase bill ingestion, single-screen billing, offline queue, UPI QR. Full research: docs/audit/USER_RESEARCH_IMPROVEMENT_ANALYSIS.md._
_v2.5: Sprint 8 — Barcode scanning (ZXing, EAN/QR, invoice + inventory), DraftManagerPanel Standard Mode + Fast Mode Excel spreadsheet (inline edit + auto-save), NotificationCenter live draft notifications._
_v2.6: Sprint 8 enhancements closed — Fast Mode 12-col table (Core/Full toggle), 9-field OCR extraction, auto-open draft panel after OCR, always-visible column toggle. OCR purchase bill ingestion marked ✅ Partially Built. Sprint 9 plan added (Section 15): WhatsApp PDF on confirm, walk-in 1-tap, UPI QR, item discount, single-screen billing._
_v2.7 (2026-03-07): Sprint 9 full code audit. Confirmed ✅ Done: S9-02 (walk-in tap), S9-03 (UPI QR in pdf.ts), S9-05 (ClassicBilling.tsx), S9-07 (email prompt in Customers.tsx). S9-06 (batch/expiry) ✅ Partially built — backend done, frontend TBD. S9-04 (item discount) ⚠️ UI column exists but `InvoiceItemInput` has no `lineDiscountPercent`, submit drops discount, `resolveItemsAndTotals()` has no per-line logic. S9-01 (WhatsApp auto-send) 🔴 Not built — `confirmInvoice()` only queues email. Remaining work with exact files documented in "What Remains To Build" section above._
_v2.8 (2026-03-07): Sprint 9 CLOSED. S9-01 fully shipped — per-tenant autoSendEmail/autoSendWhatsApp toggles in Settings, gated in both manual (`dispatchInvoicePdfEmail`) and voice (`shared.ts sendConfirmedInvoiceEmail`) flows. P1 matrix updated: repeat-last-bill, credit-limit enforcement, invoice editing, customer tags confirmed ✅ Built via code audit. Sprint 10 plan added (Section 16)._
_v2.9 (2026-03-12): Sprint 10 — Payment Sound Box shipped. `PaymentSoundBox.tsx` announces payments Paytm-style via Web Speech API (Hindi preferred). 9-gateway UPI webhook routes added (Razorpay, PhonePe, Cashfree, PayU, Paytm, Instamojo, Stripe, EaseBuzz, BharatPe) — covers all major Indian UPI aggregators. Settings page extended with 9 gateway setup cards._
_Next review: after S10-01 (item-level discount backend) and S10-02 (UPDATE_STOCK voice) ship._

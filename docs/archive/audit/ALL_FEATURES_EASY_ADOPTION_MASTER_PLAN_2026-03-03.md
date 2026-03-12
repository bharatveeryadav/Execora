# Execora Master Plan — All Features, Easy UX, Text + Voice + Realtime

Date: 2026-03-03  
Input references: PRODUCT_REQUIREMENTS v2.1 + UX Gap Audit + Vyapar comparison research

## 1) Goal (Your requirement translated to execution)

Build Execora so that:

1. All core business actions are available in **three ways**: text/form, voice, and dashboard quick action.
2. Every action updates UI in real time through WebSocket events.
3. UX is simple enough that a first-time kirana owner can complete critical flows without training.
4. Feature coverage reaches and then surpasses Vyapar-level operational completeness, while keeping Execora’s AI/voice edge.

---

## 2) Product principles for “easy adoption”

### P1. Three-Entry Parity (mandatory)

Every P0/P1 feature must have:

- Text/Form path
- Voice path
- Dashboard/quick action path

### P2. 8-Second Counter Rule

Common actions (new bill, payment entry, reminder send) must complete in <= 8 seconds on mobile.

### P3. 2-Tap Walk-In Rule

Walk-in billing starts in <= 2 taps from dashboard.

### P4. Zero Dead Buttons

No placeholder buttons in production UI.

### P5. Explain-then-Act Voice UX

Voice must show what was understood before committing sensitive actions.

### P6. Mobile-First Reliability

Primary layouts are optimized for 360–430px width first, then desktop.

---

## 3) Delivery architecture for all-features parity

## 3.1 Unified Action Contract (UAC)

Create a single implementation pattern for each feature:

For each business action, define:

- **Action ID** (example: `invoice.create`, `payment.record`, `report.gstr1.export`)
- **Service method** in modules package
- **REST endpoint** (form/text path)
- **Voice intent + agent tool mapping** (voice path)
- **Dashboard quick action** (one-click path)
- **WebSocket event(s)** for realtime sync
- **Success/error UX states**
- **Telemetry event**

This prevents feature drift where backend exists but UI/voice is incomplete.

## 3.2 Feature completeness checklist (Definition of Done)

A feature is done only when all are true:

1. Service logic implemented and tested.
2. REST route available with auth + tenant scoping.
3. Voice intent (current mode) OR tool (agent mode) available.
4. Dashboard/UI action exists and is discoverable.
5. WS event emitted and consumed in UI.
6. Mobile UX reviewed.
7. Empty/loading/error states present.
8. Audit/telemetry captured.

---

## 4) Priority roadmap (phased)

## Phase 0.5 (Start Here): Top 5 Bounce-Blocker Sprint

Objective: implement the five blockers from UX audit first, before broader parity work.

Reason: these are the fastest fixes with highest adoption impact and lowest implementation risk.

### Scope (must ship first)

| #   | Screen    | Blocker                                                                    | Estimated effort |
| --- | --------- | -------------------------------------------------------------------------- | ---------------- |
| 1   | Invoice   | Add `Walk-in / Cash Customer` fast entry (no mandatory customer selection) | ~30 min          |
| 2   | Inventory | Replace `window.prompt()` Add Product flow with proper modal form          | ~2h              |
| 3   | Settings  | Wire real save for business profile + GSTIN + core settings                | ~3h              |
| 4   | Reports   | Remove sample-style semantics and render real GSTR-1 data views clearly    | ~2h              |
| 5   | Settings  | Wire user invite/manage flow for safe staff onboarding                     | ~2h              |

Total focused effort: ~9.5 to 12 hours including QA.

### Acceptance criteria for this sprint

1. New merchant can complete onboarding and save business identity details.
2. Counter staff can start walk-in billing in <=2 taps.
3. Product creation works on mobile without browser prompt interruptions.
4. Reports screen shows trustworthy, real backend compliance data.
5. Owner can add staff account with role-safe flow.

### Sequence inside this sprint (recommended)

1. Settings save + user management (trust first)
2. Walk-in fast billing (counter speed second)
3. Inventory add modal (mobile usability)
4. GSTR-1 trust pass (compliance confidence)

Exit criteria:

- All 5 blockers are released together as a single adoption-improvement milestone.
- A first-time user test (Suresh persona) can complete: setup -> bill -> add product -> see report -> add staff.

## Phase 0 (Week 1-2): Foundation for speed and consistency

Objective: make future feature delivery predictable.

- Implement UAC template and apply to top 10 actions.
- Add a `Feature Parity Board` in docs (text/voice/dashboard status per feature).
- Standardize WebSocket event naming and payload schemas.
- Add UI “action feedback standard” (success toast + inline status + retry for failures).

Exit criteria:

- Top 10 actions have parity map and consistent realtime behavior.

---

## Phase 1 (Week 3-6): P0 adoption blockers (must fix first)

Objective: remove immediate trust and usability blockers.

### 1. Settings that actually save

- Business profile, GST details, invoice settings, user management, notification preferences.
- Remove all hardcoded demo fields and placeholder controls.

### 2. Walk-in and quick billing

- One-tap `Cash/Walk-in` button from dashboard and invoice modal.
- Fast item add/edit in invoice confirmation step.

### 3. Inventory onboarding usability

- Replace prompt-based add product flow with proper modal.
- Add min-stock and unit fields in create/edit flow.

### 4. Reports trust pass

- Ensure GSTR-1 and P&L UI directly reflects backend data.
- Add visible date/fiscal selectors and period compare UX.

### 5. Reliable completion actions

- Working print/share/WhatsApp/email actions with visible result states.

Exit criteria:

- New user can onboard, create invoice, share bill, and review report without confusion.

---

## Phase 2 (Week 7-10): Operational parity with market baseline

Objective: close high-value parity gaps vs Vyapar class products.

### 1. Purchase/AP core

- Purchase bill, payment-out, purchase return/debit note, purchase order basic workflow.

### 2. Inventory depth

- Barcode scan in billing.
- Batch/expiry basic model and alerts.

### 3. Payments maturity

- Mixed-mode split payment in form UI.
- Payment receipt generation and share.

### 4. Reports expansion

- Daybook, party ledger slices, balance-sheet-lite.

Exit criteria:

- Daily operations cover both sales and purchase sides with usable reporting.

---

## Phase 3 (Week 11-14): AI-led productivity layer

Objective: leverage Execora moat after trust parity is achieved.

### 1. Voice correction-before-confirm

- Editable transcript/entities before final commit.

### 2. AI confidence and explainability

- Show parsed customer/items/tax/discount before save.

### 3. Proactive assistant

- Collections assistant: whom to remind today.
- Inventory assistant: predicted stockout + reorder suggestions.
- Compliance assistant: GST anomalies and missing fields.

### 4. Two-agent architecture rollout

- Conversation Agent (guide) + Task Agent (executor) for conditional multi-step tasks.

Exit criteria:

- AI reduces operational errors and improves collections/stock outcomes measurably.

---

## Phase 4 (Week 15-18): Migration and scale features

Objective: reduce switching cost and improve retention.

- Backup/restore UX completeness.
- Import/export wizards (items, parties, invoices).
- Tally/Vyapar migration starter tools.
- Offline queue design (PWA staged rollout for critical actions).

Exit criteria:

- Existing SMB users can migrate with low friction and stay active.

---

## 5) UX blueprint for simplicity (what to add on frontend)

### Global UI requirements

1. Unified “Quick Action Bar” on dashboard: Bill, Payment, Reminder, Stock, Report.
2. Every major page has `Voice + Text` entry visible above fold.
3. Mobile bottom navigation for 5 core actions.
4. Clear progress steppers for multi-step flows.
5. Inline Hindi helper text for first-time users.

### Page-level must-haves

- **Dashboard**: drill-down cards + notification center + walk-in bill CTA.
- **Invoice**: walk-in preset, line-level edits, discount mode toggle, share/print final step.
- **Inventory**: add/edit modal, barcode entry, low-stock reorder suggestions.
- **Reports**: real tabular GST + chart + compare controls + export/email.
- **Settings**: fully connected forms, role permissions, delivery preferences.

---

## 6) Voice + text + dashboard parity matrix (implementation order)

### Wave A (P0 actions)

1. `invoice.create`
2. `invoice.confirm`
3. `payment.record`
4. `reminder.schedule`
5. `stock.adjust`
6. `report.gstr1.view/export`
7. `report.pnl.view/export`
8. `customer.create/update`
9. `settings.business.save`
10. `users.invite/manage`

### Wave B (P1 actions)

11. `invoice.item_discount`
12. `payment.split_record`
13. `inventory.barcode_add`
14. `inventory.batch_expiry_manage`
15. `purchase.bill_create`
16. `purchase.payment_out`
17. `report.daybook.view`
18. `report.party_ledger.view`

For each action above, enforce UAC completeness before moving to next.

---

## 7) Team operating model (parallel execution)

### Squad 1: Core Transactions

Invoice, payment, customer, purchase flows.

### Squad 2: Inventory + Reports

Inventory depth, GST/report families, exports.

### Squad 3: Platform + AI

Realtime reliability, voice-agent quality, settings/auth/permissions.

### UX Pod (shared)

Mobile-first simplification and consistency reviews.

Weekly rhythm:

- Monday: parity board planning
- Wednesday: mobile usability test with 3 real scenarios
- Friday: KPI and regression review

---

## 8) Success KPIs (measure ease and completeness)

### Adoption ease

- First invoice success rate (new users): >= 90%
- Time to first invoice: <= 2 minutes
- Walk-in invoice completion time: <= 8 seconds

### Feature completeness

- P0 parity coverage (text+voice+dashboard): 100%
- P1 parity coverage: >= 80% by Phase 3 end

### Reliability

- Realtime sync event success: >= 99%
- Critical action failure rate: <= 1%

### Business outcomes

- Reminder-to-payment conversion uplift
- Stockout incidents per store per month
- Monthly active merchants retention

---

## 9) Risks and controls

1. **Risk:** Building too many new AI features before trust basics
    - **Control:** No Phase 3 work starts until Phase 1 exit criteria met.

2. **Risk:** Backend-first shipping without usable UI
    - **Control:** UAC Definition of Done requires UI and voice parity.

3. **Risk:** Desktop-centric drift
    - **Control:** Mandatory mobile QA gate for all P0/P1 work.

4. **Risk:** Feature sprawl
    - **Control:** Strict P0/P1/P2 scope governance from PRD matrix.

---

## 10) Immediate next 14-day action list

Day 1-2

- Kick off Phase 0.5 and ship Settings save + user invite/manage first.
- Create parity board in docs and map current status for top 10 actions.

Day 3-6

- Ship walk-in 2-tap invoice entry.
- Replace inventory add prompt with modal + min-stock/unit fields.

Day 7-10

- Finalize report trust pass in UI (GSTR-1 + P&L compare visibility).
- Finalize Phase 0.5 QA run with Suresh persona walkthrough.

Day 11-14

- Stabilize print/share completion states.
- Run end-to-end real-time regression for top 10 actions.

---

## Final recommendation

Your winning sequence is:

1. reliability + simple UX first,
2. full text/voice/dashboard parity second,
3. advanced AI automation third.

This sequence gives fastest adoption and strongest long-term moat.

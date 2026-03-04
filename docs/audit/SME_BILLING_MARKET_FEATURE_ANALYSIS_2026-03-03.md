# SME Billing Software — Market Feature Analysis

Date: 2026-03-03

## Scope

This report analyses the typical feature set of established SME accounting and billing tools in the Indian market and compares it against current Execora implementation status, covering:

- UX/UI surface
- Backend/business capability
- AI/voice capability

## Method

- Market reference: publicly documented feature catalogs and capability claims of widely-used Indian SME billing software (feature-marketing pages, Dec 2025)
- Execora evidence source:
    - API route registration and auth scoping
    - Report routes + GST service
    - Invoice/Reports/Inventory/Settings frontend pages
    - Existing internal UX audit and PRD

## Executive Readout

Execora is strong in modern voice-first workflows and now has real GST reporting backend foundations (GSTR-1 + P&L JSON/PDF/CSV/email), but still trails established tools in operational completeness for everyday SME trust features.

### Estimated capability parity vs established SME billing tools

- Backend capability parity: 58–65%
- UX/UI parity: 40–48%
- AI capability parity: 125–150% (Execora ahead on conversational workflows)
- Net product readiness for daily counter-billing replacement: ~62–68%

Interpretation:

- Execora is ahead on AI-native operation.
- Established tools remain ahead on breadth, configuration depth, and consistency of day-to-day flows.

---

## Capability Matrix (reference software feature families vs Execora)

### 1) Billing & Sales workflows

Typical market standard includes: sale invoice, payment-in, return/credit note, quotation/proforma, sale order, delivery challan, invoice customization, thermal print.

Execora status:

- Implemented/strong:
    - Voice and classic invoice flow, GST toggle, discounts, partial payment, B2B GST fields.
- Partial:
    - Walk-in billing speed and one-tap cash-customer not fully optimized.
    - WhatsApp share and print journey inconsistent in UI.
- Missing/weak:
    - Full sale-order and delivery-challan workflows.
    - Polished thermal-print-first UX.

Assessment: Partial parity.

### 2) Purchase-side accounting

Market standard includes: purchase bills, payment-out, purchase returns, purchase orders.

Execora status:

- Backend and UX surface currently sales/AR heavy.
- Purchase/AP lifecycle is not feature-complete at market-standard depth.

Assessment: Major gap.

### 3) GST & compliance reports

Market standard includes: GSTR-1, GSTR-2, GSTR-3B, GSTR-9, GST detail reports, HSN reports.

Execora status:

- Implemented/strong:
    - GSTR-1 structured output (B2B/B2CL/B2CS/HSN), FY utilities, CSV/PDF/email export.
    - P&L API and export channels.
- Partial:
    - UI trust and discoverability still behind backend capability.
- Missing:
    - GSTR-2/3B/9 class coverage and broader CA-facing compliance pack.

Assessment: Strong start, still behind full compliance suite.

### 4) Inventory depth

Market standard includes: barcode workflows, batch/expiry/MRP/serial, rich stock reports, low-stock purchase actions.

Execora status:

- Implemented:
    - Product catalog, low stock view, stock adjustments.
    - Barcode scan and lookup via camera (ZXing library).
- Partial/missing:
    - Batch/expiry + serial workflows are not complete.
    - Min-stock and replenishment UX depth not at parity.

Assessment: Improved — barcode shipped; batch/expiry/serial remains a gap for retail/pharma.

### 5) Reports breadth (business, party, transaction)

Market standard includes: broad report families — cashflow, daybook, balance sheet, party reports, item reports, expense and order reports.

Execora status:

- Implemented:
    - Dashboard summary, top products/customers, payment mix, P&L and GSTR-1 family endpoints.
- Missing:
    - Full report breadth: balance sheet, daybook, deep party/accounting dimensions, order and purchase report families.

Assessment: Medium-large gap.

### 6) Settings, configuration, user controls

Market standard includes: deep transaction settings, templates/themes, backup policies, user roles, SMS/reminder settings.

Execora status:

- Implemented:
    - TTS provider persistence.
- Partial/missing:
    - Business profile/settings page mostly static and not fully wired.
    - Role/permission and operational settings not fully functional end-to-end in UI.

Assessment: Critical trust gap.

### 7) Data safety, backup, utilities, migration

Market standard includes: backup/restore options, imports/exports, utilities, legacy accounting software export and migration-oriented workflows.

Execora status:

- Partial:
    - Infrastructure supports modern stack operations and queues.
- Missing:
    - User-facing backup/restore + import/export maturity, and migration tooling from popular SME tools.

Assessment: Gap for practical adoption switching cost.

### 8) AI and voice operations

Market standard: established tools primarily market traditional billing/accounting UX without AI-native modes.

Execora status:

- Strong differentiator:
    - Realtime conversational billing and command handling, voice session flow, evented dashboard model.

Assessment: Execora clear lead.

---

## UX/UI Comparative Findings

### Where Execora UX is already better

- Faster conceptual workflow for users who prefer speaking over typing.
- Realtime feel through WebSocket-linked dashboards.
- Modern card-first analytics surface.

### Where established tools have higher daily-operation trust

- More complete settings that actually persist.
- More predictable transaction families (sales + purchase + returns + challans).
- Better small-store reliability patterns (barcode, print, batch/expiry, multi-report consistency).

### Immediate UX/UI blockers for Execora

1. Settings persistence and role workflows.
2. Walk-in quick-bill friction.
3. Inventory add-product and replenishment flow quality.
4. GSTR/P&L UI trust alignment with backend reality.

---

## Backend Capability Findings

### Strong now

- Protected route scoping with auth middleware for core domains.
- New report stack: GSTR-1 and P&L APIs with download/email channels.
- Domain modularization for invoice/ledger/voice/report concerns.
- Barcode lookup endpoint (`GET /api/v1/products/barcode/:barcode`).

### Still needed for parity

- Purchase/AP domain completeness.
- Extended GST return families and compliance depth.
- Richer report domain expansion (balance sheet/daybook/order reports).
- Backup/import/migration as first-class business features.

---

## AI-Based Feature Recommendations (next)

### AI features with highest business impact

1. Voice correction loop before commit
    - Let user edit transcript/entities before invoice finalization.
2. AI confidence + explainability per action
    - Show what was understood: customer, items, tax mode, discount.
3. Intelligent follow-up assistant
    - "Who is likely to pay this week?" with explanation and action suggestions.
4. Smart reorder suggestions
    - Predict stockout date and generate suggested purchase list.
5. Auto compliance assistant
    - Monthly GST anomaly checks (missing GSTIN, suspect tax split, HSN gaps).

### AI features for moat (after core parity)

6. WhatsApp conversational autopilot (approval-gated)
7. Voice-to-quotation/order conversion funnel
8. Multilingual code-switch robustness scoring

---

## Frontend UI Additions Required

### Must-add now (P0)

1. Fully wired Settings save experience
    - Business profile, invoice config, user roles, notification preferences.
2. One-tap Walk-in/Cash billing start.
3. Replace prompt-based product creation with modal form.
4. Reports trust pass
    - Render real GST tables, expose compare period for P&L, remove placeholder semantics.
5. Invoice completion actions that truly work
    - Print, WhatsApp, and share states with clear success/failure feedback.

### Next (P1)

6. Batch/expiry UI model and filters.
7. Payment receipt and split-payment UX.
8. Notification center and drill-down from dashboard KPIs.
9. Mobile-first chart and table readability improvements.

---

## Prioritized 90-day Build Plan

### Phase 1 (0-30 days): Trust and conversion

- Ship settings persistence + role management.
- Ship walk-in quick bill + product add modal.
- Ship report UI parity with backend outputs.

### Phase 2 (31-60 days): Operational parity

- Add purchase/AP core flows.
- Add split-payment UX.
- Expand report families (daybook, balance-sheet-lite, party ledger slices).

### Phase 3 (61-90 days): AI acceleration

- Add AI correction/confirm layer.
- Add proactive AR and stock recommendation assistant.
- Add compliance anomaly assistant and CA-ready handoff workflows.

---

## Bottom Line

Do not lead with more AI demos first. Lead with reliability parity in settings + daily transaction completeness, then layer AI where it directly saves time and reduces errors.

Winning positioning after gap closure:
"Voice-first billing as reliable as established accounting tools, with faster counter operations and smarter collections."

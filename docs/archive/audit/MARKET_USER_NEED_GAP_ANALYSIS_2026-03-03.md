# Execora Market & User-Need Gap Analysis (2026-03-03)

## Scope

This report compares:

- Current Execora status from [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md)
- Publicly available feature claims from established SME billing and accounting tools in the Indian market

Goal: Identify **what users need that Execora still does not have**, and prioritize by business impact.

## Quick Summary

Execora is strong in:

- Voice-first Hindi/Hinglish invoicing
- Real-time WebSocket dashboard sync
- Udhaar + reminders + conversation workflow

But market parity gaps remain in core adoption blockers:

1. Discount flow completeness (item + bill + voice intent)
2. B2B GST completeness (GSTIN capture + IGST + compliant exports)
3. Mobile-first speed and offline continuity
4. Barcode + batch/expiry for retail/pharma
5. Migration + compliance exports from legacy accounting software

If these are not closed, voice advantage alone may not be enough for conversion in high-volume retail.

---

## Market Feature Snapshot (public claims, SME billing tools)

### Counter-billing focused tools

- Offline billing, GST reports (GSTR variants), reminders, inventory, backup, invoice formats
- Positioned around easy billing + inventory + GST + payment collection

### SMB retail billing tools

- Fast GST billing, WhatsApp/SMS auto sharing, quotations/proforma, e-invoicing/e-way bill, legacy accounting export, barcode/batch workflows
- Heavy SMB retail messaging around stock + collections + multi-device

### Mobile ledger / bahi-khata tools

- Digital credit tracking, reminders, mobile-first usage, multi-business account handling
- Less complete accounting depth vs full accounting suites, but very strong habit/retention product

### Enterprise accounting suites

- Strong accounting/compliance depth (GST workflows, reports, broader integrations)
- Better for advanced accounting operations than counter-speed retail use

---

## User-Need Based Missing Features (Priority)

## P0 (must close now)

| Gap                                            | Why user needs it                                       | Market pressure               | Current Execora state          |
| ---------------------------------------------- | ------------------------------------------------------- | ----------------------------- | ------------------------------ |
| Discount system complete (item + bill + voice) | Counter billing often needs instant % or ₹ discount     | Standard in billing apps      | Marked TODO / partial in PRD   |
| Partial payment at invoice creation            | Common real scenario: "₹500 diya, baki kal"             | Widely expected               | Marked TODO                    |
| Walk-in billing ultra-fast UX                  | High % walk-in transactions in kirana                   | Competes with fast POS habits | Marked as friction issue       |
| B2B GST fields + IGST                          | Wholesale buyers require GSTIN + inter-state compliance | Mandatory for serious B2B     | Marked TODO                    |
| Mobile responsiveness (counter-first)          | Most SMB usage happens on phone                         | Baseline requirement          | Marked partial / desktop-first |
| WhatsApp auto-send invoice PDF on confirm      | Collection speed + customer expectation                 | Common in market tools        | Marked TODO                    |

### P0 KPI targets

- Bill creation time (walk-in): <= 8 seconds
- Successful invoice share rate: >= 95%
- Voice discount command success: >= 95%
- Mobile completion rate for invoice flow: >= 90%

---

## P1 (next wave for conversion and retention)

| Gap                                              | Why it matters                                        | Market pressure               | Current Execora state |
| ------------------------------------------------ | ----------------------------------------------------- | ----------------------------- | --------------------- |
| GST report export (GSTR-1 ready, HSN, B2B lists) | CA handoff and monthly filing trust                   | Standard in SME billing tools | TODO                  |
| Date-range reports + CSV export                  | Owners want cashflow/P&L visibility, CA needs exports | Standard expectation          | TODO                  |
| Barcode scan at billing                          | Speed for large SKU stores                            | Common in SME billing tools   | ✅ Built              |
| Credit limit enforcement                         | Prevents bad debt growth                              | Standard in mature systems    | TODO                  |
| Batch/expiry tracking                            | Mandatory for pharma/FMCG                             | Standard in SME billing tools | TODO                  |
| Mixed-mode payment (cash+UPI split)              | Real transaction behavior                             | Common expectation            | TODO                  |
| Proforma/quotation                               | B2B order conversion workflow                         | Common in SME billing tools   | TODO                  |
| Delivery preference per customer (WA/email/both) | Better reminder conversion                            | Standard parity               | TODO                  |

---

## P2 (scale and moat layers)

| Gap                                         | Why it matters                              | Current Execora state |
| ------------------------------------------- | ------------------------------------------- | --------------------- |
| Offline mode with sync queue                | Rural/low-network resilience and trust      | TODO                  |
| Legacy accounting software import/migration | Faster switching from incumbent tools       | TODO                  |
| WhatsApp chatbot-first operation            | Distribution moat and no-app-install growth | TODO                  |
| Advanced AI analytics insights              | Retention + upsell                          | TODO                  |

---

## Biggest Strategic Risk

Execora may be perceived as "great voice demo, incomplete daily operations" if compliance + mobile + billing edge cases stay pending.

In this category, **trust + reliability + speed** wins before "AI novelty".

---

## Recommended Build Sequence (90 days)

### Sprint 1 (Weeks 1-3) — Counter Reliability

- Discount system full stack (voice + form)
- Partial payment at invoice creation
- Walk-in quick-bill flow optimization
- WhatsApp auto-send invoice PDF on confirmation

### Sprint 2 (Weeks 4-6) — Compliance Core

- B2B GSTIN capture/validation
- IGST for inter-state
- GSTR-1-ready export + HSN summary + B2B list
- Date-range report + CSV export

### Sprint 3 (Weeks 7-9) — Mobile + Retail Depth

- Mobile UI hardening for all P0/P1 flows
- Barcode scan flow
- Mixed payment split UX
- Credit limit enforcement

### Sprint 4 (Weeks 10-12) — Conversion Moat

- Legacy accounting software import wizard (minimum viable migration)
- Batch/expiry tracking phase 1
- Customer delivery preference model + fallback workflow

---

## What to postpone (for now)

- Full True Agent Mode architecture rollout
- Deep multi-language expansion beyond Hindi/Hinglish
- Loyalty/e-commerce integrations

Reason: these are high value later, but do not remove immediate purchase blockers.

---

## Decision Framework (what to build first)

Score each candidate feature on:

- User pain frequency (daily / weekly / monthly)
- Revenue impact (conversion, retention, ARPU)
- Compliance risk if missing
- Competitive parity pressure
- Implementation effort

Prioritize high pain + high parity + compliance-critical items first.

---

## Suggested Product Positioning After Gap Closure

"Voice-first billing that is as reliable as legacy accounting tools, but faster on the counter and better for collections."

That combines your unique moat (voice + real-time) with category trust requirements (GST/reporting/mobile reliability).

---

## Notes on evidence quality

This report uses:

- Internal PRD source-of-truth for Execora feature status
- Public feature marketing pages from established SME billing tools (feature claims, not audited implementations)

Use customer interviews + trial data to validate each market claim in field conditions.

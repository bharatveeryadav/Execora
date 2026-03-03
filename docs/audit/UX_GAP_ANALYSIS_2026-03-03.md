# Execora UX Gap Analysis — Current UI vs User Needs
**Date**: 2026-03-03
**Scope**: All web app pages + components vs PRD user personas (Suresh kirana, Meena cosmetics, Ramesh wholesaler)
**Source**: Code audit of `apps/web/src/` + PRD v2.1 + Market Gap Analysis

---

## Executive Summary

The app has a **strong real-time core** (voice, WebSocket, invoice pipeline) but has **6 major UX blockers** that would prevent adoption in real SME counters. Suresh the kirana owner would bounce within 3 minutes on 4 of the 7 screens today.

**Overall readiness**: 62% production-ready
**Biggest risk**: Settings page is entirely decorative (no saves). Counter speed is unacceptable for walk-in billing. These two things alone lose the customer.

---

## Screen-by-Screen Analysis

### 1. Login Page — 75% Ready

**What works**: Email + password + JWT flow is real and functional.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| `VITE_LOGIN_EMAIL` / `VITE_LOGIN_PASSWORD` env vars pre-fill credentials in browser | Security issue, confusing in production | Low — remove env pre-fill |
| No "Forgot Password" | Locked out = lost customer | Medium |
| Tenant ID field not labelled clearly | Confusing for non-technical shop owner | Low — rename/hide |
| No Hindi UI option at login | First impression, target user speaks Hindi | Medium |

---

### 2. Dashboard (Index) — 80% Ready

**What works**: Live KPI cards, AR summary, low stock, top products, business health score — all real data via WebSocket.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| Bell icon (notifications) — non-functional | Suresh expects bell to show unseen reminders/payments | Low |
| Business health score (72/100) has no explanation | Suresh doesn't understand it → ignores it | Low — add tooltip/breakdown |
| No drill-down from KPI cards | Can't tap "₹12,000 pending" to see which customers | Medium |
| "Quick Actions" — buttons for Create Invoice, Record Payment go to full pages | On mobile, mid-rush, switching pages is fatal | High — need slide-up modal |
| Overdue payments widget — "Call" button opens tel: (good), "WhatsApp" button is placeholder | Core collection flow broken | Low — add WA deep link |
| No daily P&L summary widget on dashboard | Owner wants "aaj kitna hua" at a glance | Low |

**Critical insight**: Dashboard loads fast and looks right. The data is real. This is the **strongest screen**. Fix the bell + drill-down and this is done.

---

### 3. Inventory Page — 65% Ready

**What works**: Product list, low stock alerts, fast/slow mover analysis, stock adjust modal are functional.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| `window.prompt()` for Add Product | Cannot use on mobile (popup blocks interaction); unprofessional | **Critical** — replace with modal |
| Min stock threshold shows "—" (data not exposed) | Suresh can't see or set when to reorder flour/oil | Low |
| Slow-mover "Discount" and "Promote" buttons — toast only | Non-functional; raises expectation then fails | Low — remove or implement |
| "Order All" for low stock — toast only | No purchase order created | Medium — or remove button |
| Stock movements only show sales (no manual receipts) | "50 kilo aata aaya" voice intent exists but receipts not shown in UI | Medium |
| No barcode scan | Major speed blocker for large SKU stores | High — P1 feature |
| Pagination disabled (shows but doesn't work) | Confusing UX for stores with 200+ products | Low |
| Unit field not selectable (hardcoded "pcs") | Can't specify kg/L/packet at creation | Low |
| No expiry/batch fields | Pharma/FMCG vertical cannot use app | High — P1 feature |

**Critical fix**: Replace `window.prompt()` with a proper Add Product modal. This is a **single-file change** with high trust impact.

---

### 4. Invoice Creation (InvoiceCreation.tsx) — 72% Ready

**What works**: Multi-step voice flow, GST toggle, IGST, discount, partial payment, B2B GSTIN, proforma — all functional from previous sprint.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| Walk-in has no "Cash Customer" shortcut | Every invoice requires customer selection step; deadly mid-rush | **Critical** — add "Walk-in" button that skips customer |
| Item confirmation has no quantity editor | If voice says "rice 5kg" and it's 2kg, user must re-speak | Medium — add inline edit |
| Discount UI — % and ₹ inputs side-by-side; clearing one doesn't clear other | Confusing double-entry; causes errors | Low — use radio to pick mode |
| Place of supply — free text "07" | Needs dropdown of states or auto-fill from GSTIN | Low |
| GSTIN format not validated (15 chars but no regex check) | Wrong GSTIN goes into database; GST filing fails | Low |
| WhatsApp share button — placeholder | After confirming invoice, customer expects link instantly | Medium — implement WA API |
| Print invoice — non-functional in final step | Shop owner needs thermal print | High — P1 feature |
| No HSN/SAC per item in voice flow | GSTR-1 filing uses product-level HSN but voice doesn't capture it | Medium — auto-fill from product catalog |
| Item-level discount not supported | Wholesale buyers expect line-by-line discounts | Medium |
| Customer onboarding at billing — no email prompt | Email collection at billing = key for reminders | Low — add optional email field |

**Critical fix**: "Walk-in / Cash Customer" preset button. This single UX change brings walk-in billing to under 8 seconds (PRD target).

---

### 5. Payment Page (Payment.tsx) — 60% Ready

**What works**: Customer lookup, invoice selection, payment amount/method, reference field.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| No split payment UI (mixed mode in form) | Voice has RECORD_MIXED_PAYMENT, but the form doesn't | Medium |
| No receipt generation after payment | Customer expects "receipt bhejo" → nothing happens | Medium |
| Notes field placeholder in Hindi colloquial ("Cash diya shop par aake") | Confusing for non-Hindi speakers; should be placeholder, not label | Low |
| No payment reversal/adjustment | Incorrectly entered amounts can't be fixed | Medium |
| No balance confirmation before submit | User can accidentally overpay | Low — show "new balance after payment" before confirm |
| Payment method has only text labels (no icons) | Slower to read; UPI/Cash/Card are icon-first in India | Low |

---

### 6. Reports Page (Reports.tsx) — 70% Ready

**What works**: Overview tab (live data, charts), GSTR-1 backend complete (B2B/B2CS/HSN), P&L backend complete with month-wise data.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| GSTR-1 tab shows "Sample GSTR-1 ready" text (mismatch with real backend) | Shop owner / CA sees "sample" and distrusts the data | **Low** — remove "sample" wording, show actual data table |
| P&L tab shows placeholder Operating Expenses / Net Margin (no COGS data) | Misleading percentages when cost-of-goods is unknown | Low — hide COGS until data available; show revenue-only P&L |
| Custom date range picker not prominent | Users don't find it — default to current FY only | Low — make date inputs more visible |
| No invoice-level drill-down in GSTR-1 B2B list | CA wants to open each invoice; currently just totals | Medium |
| No period comparison toggle in P&L UI | Backend supports compareFrom/compareTo but UI doesn't expose it | Low |
| Charts not readable on mobile (recharts scales poorly) | Mobile users (most users) get broken charts | Medium |
| No scheduled/recurring report email | Owner wants monthly GSTR-1 auto-emailed to CA | Medium |

**Critical fix**: Remove "sample" wording and display actual GSTR-1 data from backend. The hardest part (backend) is done — front-end just needs to render the real `report.b2b[]` / `report.b2cs[]` arrays.

---

### 7. Settings Page — 15% Ready

**What works**: TTS provider selection (saved to localStorage). Nothing else saves.

**This is the most broken page in the app.**

| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| Business profile (name, GSTIN, PAN, address) — hardcoded, not saved | GSTIN on invoices is wrong for every real tenant | **Critical** — wire to `/api/v1/admin/tenant` update endpoint |
| User management (Add/Edit/Remove) — buttons do nothing | Can't give staff access; owner shares password | **Critical** — wire to `/api/v1/users` endpoints |
| Invoice settings (prefix, next number, tax rate) — no effect | Invoice numbering is correct (from backend) but prefix/rate not configurable | Medium |
| Notification settings — no backend sync | Reminders go out regardless of toggle state | Medium |
| Language selector changes label but not UI | Selecting Hindi does nothing — no i18n | High — needs full i18n |
| Last backup / Storage progress — hardcoded demo data | Breaks trust when owner sees "245 MB / 1 GB" that never changes | Low — fetch real data or hide |
| No API key management for TTS/STT | Owner can't configure their own Deepgram/ElevenLabs key | Medium |

**Critical fix path** (Settings in 2 sprints):
1. Sprint A: Wire Business Profile save → tenant API. Wire User list + Invite → users API.
2. Sprint B: Invoice prefix/rate configuration. Notification backend sync.

---

### 8. Voice Bar (VoiceBar.tsx) — 78% Ready

**What works**: Real-time STT, streaming AI response, TTS playback, confirm flow detection, error handling.

**Gaps vs user need**:
| Gap | User Impact | Fix complexity |
|-----|-------------|---------------|
| "Confirm needed" state — detected but no confirmation dialog shown | High-risk actions (delete, large payment) hang silently | Medium |
| No visible latency feedback (backend processing time) | "Did it hear me?" anxiety; users repeat commands | Low — add "Processing… Xms" |
| No transcript editing before AI processes | Mistranscription causes wrong invoice; must re-speak | Medium |
| No command history / undo | "Cancel karo" undoes last action but no visual history | Medium |
| Browser Speech API fallback has no visual parity | Offline/low-bandwidth mode looks broken | Low — unify UI states |
| No mute during TTS playback | If TTS is long and someone walks in, voice keeps playing | Low |
| No voice command suggestions in idle | New users don't know what to say | Low — show rotating examples |

---

## Priority Gap Matrix (All screens, ranked by user impact)

### Tier 1: Blocks Day-1 Adoption (fix this week)

| # | Screen | Gap | Why Critical |
|---|--------|-----|--------------|
| 1 | Invoice | Walk-in "Cash Customer" preset button | Every kirana transaction is walk-in; current flow is 3 extra taps |
| 2 | Inventory | Replace `window.prompt()` with Add Product modal | Breaks mobile entirely; blocks product onboarding |
| 3 | Settings | Business profile save (GSTIN, name, address) | Every invoice shows wrong business name/GSTIN until fixed |
| 4 | Reports | Remove "sample" label in GSTR-1 tab; render actual B2B/B2CS table | CA will reject reports they can't trust |
| 5 | Settings | User management (invite staff, role assignment) | Owner cannot share app with staff safely |

### Tier 2: Blocks Week-1 Retention (fix next sprint)

| # | Screen | Gap | Why Important |
|---|--------|-----|---------------|
| 6 | Invoice | WhatsApp share (real WA deep link / API) | Customer expects invoice link; current = placeholder |
| 7 | Dashboard | Bell notifications (unseen events) | Core engagement driver; standard expectation |
| 8 | Payment | Balance preview before confirm + receipt | Trust + accuracy |
| 9 | Reports | P&L comparison period toggle in UI | Backend supports it; expose to user |
| 10 | Invoice | Discount — radio button to pick % vs ₹ mode (clear UX) | Current dual-input confuses |

### Tier 3: Blocks Month-1 Growth (after above)

| # | Screen | Gap | Why Important |
|---|--------|-----|---------------|
| 11 | Inventory | Min stock threshold editable + visible | Prevents stockouts for Suresh |
| 12 | Invoice | Item-level discount | Required for Ramesh (wholesaler) |
| 13 | Reports | GSTR-1 invoice drill-down | Required for CA handoff |
| 14 | Payment | Mixed-mode payment form UI | Voice works; form doesn't |
| 15 | Settings | Notification toggles → backend sync | Reminders should be configurable |

---

## What Competitors Do Better (UX comparison)

| Flow | Execora Today | Vyapar | myBillBook | Gap to close |
|------|--------------|--------|------------|--------------|
| Walk-in billing | 4 steps (need customer) | 1 tap, instant bill | 1 tap | Add "Cash Customer" button |
| Product add | window.prompt + separate page | Inline modal on billing screen | Scan barcode or type | Inline modal in billing |
| Invoice print | Non-functional | Thermal + PDF | Thermal + PDF | PDF print + WA share |
| GST filing | GSTR-1 backend done, UI shows "sample" | GSTR-1 export | GSTR-1 + e-invoicing | Fix GSTR-1 UI rendering |
| Settings persistence | None saved | Full save | Full save | Wire save endpoints |
| Staff accounts | Non-functional | Supported | Supported | Wire user invite API |
| WhatsApp delivery | Invoice via WA (built) but no immediate share button | Auto-share on confirm | Auto-share on confirm | Add confirm → WA share |

---

## Recommended Fix Sequence (2 weeks to production-ready)

### Week 1 — Counter-ready fixes (5 changes, high impact)

1. **Invoice → Walk-in button**: Add "Cash / Walk-in Customer" button that sets `customerId = null` and skips the customer step. Target: billing starts in 2 taps.
2. **Inventory → Add Product modal**: Replace `window.prompt()` with a proper modal (name, price, unit, category, minStock). Reuse existing Edit modal structure.
3. **Settings → Business profile save**: Wire "Save Changes" to `PUT /api/v1/users/profile` (or tenant endpoint). Show success/error toast. Remove hardcoded demo data.
4. **Reports → GSTR-1 render**: Remove "sample" text. Render `report.b2b[]` as a scrollable table. Add row count badge. The backend is complete — this is a frontend rendering task only.
5. **Settings → User invite**: Wire "Add User" button to `POST /api/v1/users/invite`. Show invited users in list. Block remove of own account.

### Week 2 — Retention fixes (5 changes)

6. **Invoice → WhatsApp share**: On "Invoice confirmed", call `GET /api/v1/invoices/:id/whatsapp-link` → open `wa.me/` deep link with invoice PDF URL.
7. **Dashboard → Bell notifications**: Count unread WS events; clear on open; show list of last 10 events (invoice confirmed, payment received, low stock).
8. **Payment → Balance preview + receipt**: Show "New balance after payment: ₹X" before confirm. After success, show "Send receipt" button → WhatsApp/email.
9. **Reports → P&L comparison toggle**: Add "Compare with previous period" checkbox. Pass `compareFrom` / `compareTo` to `usePnlReport()`. Backend already returns comparison data.
10. **Inventory → Min stock edit**: Add min stock field to Edit Product modal. Show actual value (not "—") in low stock table.

---

## Personas × Screens: Who Can Actually Use the App Today?

| Screen | Suresh (kirana) | Meena (cosmetics) | Ramesh (wholesale) |
|--------|----------------|-------------------|-------------------|
| Dashboard | ✅ Works | ✅ Works | ✅ Works |
| Voice billing | ✅ Works (GST + non-GST) | ✅ Works | ⚠️ GSTIN works, but no line discount |
| Invoice creation (form) | ⚠️ Walk-in friction | ⚠️ Walk-in friction | ⚠️ Walk-in friction; no line discount |
| Payment recording | ✅ Works | ✅ Works | ✅ Works |
| Inventory | ⚠️ window.prompt blocks | ⚠️ No expiry tracking | ⚠️ No batch/expiry |
| Reports | ⚠️ Overview works; GSTR-1 looks like sample | ⚠️ Same | ⚠️ Same |
| Settings | ❌ Nothing saves | ❌ Nothing saves | ❌ Nothing saves |

**Conclusion**: Suresh and Meena can use the app **today** for voice billing and payment, but cannot onboard properly (Settings), and cannot do GST filing or trust reports yet. Ramesh needs line-item discounts. All three hit the walk-in friction within the first 5 minutes.

---

## Quick Wins Checklist (estimated effort)

| Change | File(s) | Effort | Impact |
|--------|---------|--------|--------|
| Walk-in "Cash Customer" button | `InvoiceCreation.tsx` | 30 min | ⭐⭐⭐⭐⭐ |
| Add Product modal (replace window.prompt) | `Inventory.tsx` | 2h | ⭐⭐⭐⭐⭐ |
| Settings business profile save | `Settings.tsx` + api.ts | 3h | ⭐⭐⭐⭐⭐ |
| Remove "sample" + render GSTR-1 tables | `Reports.tsx` | 2h | ⭐⭐⭐⭐ |
| User invite form in Settings | `Settings.tsx` | 2h | ⭐⭐⭐⭐ |
| WhatsApp share on invoice confirm | `InvoiceCreation.tsx` | 1h | ⭐⭐⭐⭐ |
| Bell notifications (unread count) | `DashboardHeader.tsx`, `WSContext.tsx` | 3h | ⭐⭐⭐ |
| Discount radio (% vs ₹) | `InvoiceCreation.tsx` | 30 min | ⭐⭐⭐ |
| Payment balance preview | `Payment.tsx` | 1h | ⭐⭐⭐ |
| P&L comparison period toggle | `Reports.tsx`, `useQueries.ts` | 1h | ⭐⭐⭐ |

**Total Week 1 effort estimate**: ~12 hours of focused frontend work.

---

*Generated: 2026-03-03 | Execora engineering audit*

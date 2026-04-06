> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Invoice Requirements — Improvement Checklist

> **Purpose**: Consolidated requirements for invoice improvements — GST compliance, user-requested features, UX, and competitive parity.
> **Sources**: INVOICE_GST_COMPLIANCE_AUDIT.md, USER_RESEARCH_IMPROVEMENT_ANALYSIS.md, competitor research (Vyapar, Swipe, myBillBook).
> **Last Updated**: March 2026

---

## Table of Contents

1. [Quick Wins (Low Effort)](#1-quick-wins-low-effort)
2. [Medium Effort](#2-medium-effort)
3. [Larger Effort](#3-larger-effort)
4. [GST Compliance Gaps](#4-gst-compliance-gaps)
5. [User-Requested Features (from Reviews)](#5-user-requested-features-from-reviews)
6. [Competitor Parity](#6-competitor-parity)
7. [Implementation References](#7-implementation-references)

---

## 1. Quick Wins (Low Effort)

| # | Requirement | Status | Est. | Notes |
|---|-------------|--------|------|-------|
| IW-01 | **Amount in words on PDF** | ❌ | 4h | `toIndianWords()` exists; wire to PDF template in `packages/infrastructure/src/pdf.ts` |
| IW-02 | **Total items / total qty in totals block** | ❌ | 2h | Add "Total: X items, Y units" to TotalsBlock in preview + PDF |
| IW-03 | **"ORIGINAL FOR RECIPIENT" stamp** | ❌ | 1h | Show when B2B (buyerGstin present); standard for duplicate vs original |
| IW-04 | **Supplier email on invoice** | ❌ | 2h | Add to Settings biz profile; show in PDF footer |
| IW-05 | **Payment status badge** | ❌ | 2h | Show "Paid" / "Partial" / "Balance Due" clearly on invoice |
| IW-06 | **Place of supply + due date** | ✅ | — | Already in demo-invoices; ensure all templates show |

---

## 2. Medium Effort

| # | Requirement | Status | Est. | Notes |
|---|-------------|--------|------|-------|
| IM-01 | **Template builder** | ❌ | 2d | Logo, accent color, show/hide columns, footer text from Settings |
| IM-02 | **Recipient phone/email** | ❌ | 4h | Optional fields; useful for delivery; show on invoice |
| IM-03 | **Buyer PO number** | ❌ | 4h | Optional B2B field; store on Invoice; show on PDF |
| IM-04 | **Custom columns** | ❌ | 1d | Let users add/hide columns (HSN, MRP, batch) per template |
| IM-05 | **Thermal print layout** | ⚠️ | 1d | 80mm receipt layout; better for kirana; template exists, verify print flow |
| IM-06 | **UPI deep link in PDF** | ⚠️ | 4h | UPI QR exists; add "Scan to pay" CTA + `upi://pay` link in footer |

---

## 3. Larger Effort

| # | Requirement | Status | Est. | Notes |
|---|-------------|--------|------|-------|
| IL-01 | **E-invoicing (IRN + QR)** | ❌ | 1w | IRP API integration; IRN generation; embed IRP QR in PDF |
| IL-02 | **E-Way Bill** | ❌ | 1w | Use `ewayBillNo` schema; NIC portal API; vehicle/transporter |
| IL-03 | **SAC code** | ❌ | 1d | For service items; add to line items; show on invoice |
| IL-04 | **Cess** | ⚠️ | 4h | Schema supports; add to ClassicBilling UI; tobacco/vehicles |
| IL-05 | **Batch/Expiry on line items** | ⚠️ | 2d | For pharma/FMCG; batch selector on invoice rows |
| IL-06 | **Shipping address** | ⚠️ | 4h | Schema has `shipToAddress`; ensure UI + PDF support |

---

## 4. GST Compliance Gaps

Reference: `docs/INVOICE_GST_COMPLIANCE_AUDIT.md`

| Field | Indian Std | Status | Action |
|-------|------------|--------|--------|
| Supplier Legal Name | Yes | ✅ | `shopName` |
| Supplier GSTIN | Yes | ✅ | `supplierGstin` |
| Supplier Address | Yes | ✅ | Built from address, city, state, pincode |
| Supplier City/State/PIN | Yes | 🟡 | Add to biz profile; show in header |
| Supplier Phone | Recommended | 🟡 | In Settings; PDF shows `shopPhone` |
| Supplier Email | Recommended | ❌ | Add to Settings; show on PDF |
| Recipient Name | Yes | ✅ | `customerName` |
| Recipient GSTIN | Yes (B2B) | ✅ | `buyerGstin` |
| Recipient Address | Yes | 🟡 | From customer; override when B2B |
| Recipient Phone/Email | Recommended | ❌ | Optional; add |
| Invoice Number | Yes | ✅ | Sequential FY/INV/0001 |
| Invoice Date | Yes | ✅ | `invoiceDate` |
| Place of Supply | Yes | ✅ | `placeOfSupply` |
| Due Date | Recommended | ✅ | `dueDate` |
| Reverse Charge | Yes | ✅ | Shown when RCM |
| Composition declaration | Yes | ✅ | "Composition Taxable Person" |
| HSN Code | Yes | ✅ | Per item |
| SAC Code | Yes | ❌ | For services |
| Cess | If applicable | 🟡 | Schema; not in UI |
| Batch/Expiry | Pharma | ❌ | Not on line items |
| IRN / E-invoice QR | E-invoice | ❌ | P2 |
| E-Way Bill Number | If applicable | ❌ | Schema exists; not used |

---

## 5. User-Requested Features (from Reviews)

Source: 193+ reviews (SoftwareSuggest, Trustpilot, GetApp)

| Rank | Request | Frequency | Status |
|------|---------|-----------|--------|
| 1 | E-invoicing on mobile | Very High | ❌ P2 |
| 2 | UPI payment link in invoice | Very High | ⚠️ QR ✅; deep link partial |
| 3 | Full invoice template customization | High | ⚠️ 14 templates; no builder |
| 4 | Amount in words | High | ❌ UI ✅; PDF ❌ |
| 5 | Custom columns | Medium | ❌ |
| 6 | Batch/expiry tracking | Medium | ⚠️ Schema; partial UI |

---

## 6. Competitor Parity

| Feature | Vyapar | Swipe | myBillBook | Execora |
|---------|--------|-------|------------|---------|
| 10+ templates | ✅ | ✅ | ✅ | ✅ 14 |
| Logo in header | ✅ | ✅ | ✅ | ✅ |
| Custom colors | ✅ | ✅ | ✅ | ✅ accent |
| E-Way Bill Number | ✅ | ✅ | ✅ | ❌ |
| UPI QR on invoice | ✅ | ✅ | ✅ | ✅ |
| Custom columns | ✅ | ✅ | Limited | ❌ |
| Ship To address | ✅ | ✅ | ✅ | ⚠️ Schema |
| Due date | ✅ | ✅ | ✅ | ✅ |
| Amount in words | ✅ | ✅ | ✅ | ⚠️ UI only |
| ORIGINAL FOR RECIPIENT | ✅ | ✅ | ✅ | ❌ |
| Total items/qty | ✅ | ✅ | ✅ | ❌ |

---

## 7. Implementation References

| File | Purpose |
|------|---------|
| `packages/infrastructure/src/pdf.ts` | PDF generation; `InvoicePdfData`; `toIndianWords()` |
| `apps/web/src/components/InvoiceTemplatePreview.tsx` | Web preview; `TotalsBlock`; template variants |
| `apps/mobile/src/components/InvoiceTemplatePreview.tsx` | Mobile preview |
| `apps/web/src/pages/ClassicBilling.tsx` | Billing form; recipient address; place of supply |
| `apps/web/src/pages/Settings.tsx` | Biz profile; logo; UPI VPA; terms |
| `packages/shared/src/demo-invoices.ts` | Demo data; `placeOfSupply`, `dueDate`, `showTotalItems` |
| `docs/INVOICE_GST_COMPLIANCE_AUDIT.md` | Full GST field audit |
| `docs/INVOICE_QR_BARCODE.md` | UPI QR, IRP QR standards |

---

## Sprint Mapping

| Requirement | Sprint | Priority |
|-------------|--------|----------|
| IW-01 Amount in words on PDF | S14-08 | P1 |
| IW-02 Total items/qty | — | P1 |
| IW-03 ORIGINAL FOR RECIPIENT | — | P1 |
| IW-04 Supplier email | — | P2 |
| IW-05 Payment status badge | — | P2 |
| IM-01 Template builder | S12-05 | P1 |
| IM-02 Recipient phone/email | — | P2 |
| IM-03 Buyer PO number | — | P2 |
| IL-01 E-invoicing | S13-01 | P2 |
| IL-02 E-Way Bill | S13-02 | P2 |

---

*Cross-reference: `docs/PRD_SPRINT_MASTER.md`, `docs/LAUNCH_CHECKLIST.md`*

> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Invoice vs Indian GST Standard — Compliance Audit

**Reference**: `docs/INDIAN_GST_BILLING_REFERENCE.md` Section 10 (Complete Invoice Field Reference)  
**Audit Date**: March 2026  
**Scope**: ClassicBilling, InvoiceTemplatePreview, PDF generation, API, GSTR-1 export

**See also**: `docs/INVOICE_REQUIREMENTS.md` — full improvement checklist (quick wins, UX, user-requested, competitor parity).

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Supplier Details** | ✅ Good | Name, GSTIN, Address (from biz profile) ✅ |
| **Recipient Details** | ✅ Good | Name, GSTIN, Address (customer or override) ✅ |
| **Invoice Identification** | ✅ Good | No, Date, RCM, Place of Supply ✅ |
| **Line Items** | 🟡 Partial | HSN ✅; SAC (services) ❌; Cess, Batch/Expiry ❌ |
| **Totals** | ✅ Good | CGST/SGST/IGST, Amount in Words ✅ |
| **Declarations** | ✅ Good | RCM + Composition Taxable Person ✅ |
| **E-Invoice / E-Way** | ❌ Not built | IRN, QR, E-Way — planned P2 |
| **Bill of Supply** | ❌ Not built | For composition/exempt |

---

## 10.1 Supplier Details

| Field | Indian Std | Our Status | Where |
|-------|------------|------------|-------|
| Supplier Legal Name | **Yes** | ✅ | `shopName` from biz profile / tenant |
| Supplier Trade Name | Optional | ❌ | Not captured |
| Supplier GSTIN | **Yes** | ✅ | `supplierGstin` from biz profile / tenant |
| Supplier Address (Line 1) | **Yes** | ❌ | `bizAddress` in Settings but not on PDF |
| Supplier Address (Line 2) | Optional | ❌ | Not captured |
| Supplier City | **Yes** | ❌ | Not captured |
| Supplier State | **Yes** | ❌ | Not captured |
| Supplier PIN Code | **Yes** | ❌ | Not captured |
| Supplier Phone | Recommended | 🟡 | In Settings (`bizPhone`) | PDF shows `shopPhone` |
| Supplier Email | Recommended | ❌ | Not on invoice |
| Supplier PAN | E-invoice | Embedded in GSTIN | —
| Bank Details | Recommended | ✅ | `bankName`, `bankAccountNo`, `bankIfsc` on PDF |

**Status**: Supplier address built from `address`, `city`, `state`, `pincode` in Settings → tenant.settings → PDF and preview.

---

## 10.2 Recipient / Buyer Details

| Field | Indian Std | Our Status | Where |
|-------|------------|------------|-------|
| Recipient Name | **Yes** | ✅ | `customerName` |
| Recipient GSTIN | Yes (B2B) | ✅ | `buyerGstin` / `gstin` |
| Recipient Address | **Yes** | 🟡 | From customer when available; not mandatory input |
| Recipient State | **Yes** | 🟡 | In address; not separate state code |
| Recipient PIN Code | **Yes** | 🟡 | In address; not separate |
| Recipient Phone | Recommended | ❌ | Not on invoice |
| Recipient Email | Recommended | ❌ | Not on invoice |
| Shipping Address | If different | ❌ | Not supported |
| Buyer's PO Number | Optional | ❌ | Not supported |

**Status**: Recipient address from customer when available; manual override textarea when `buyerGstin` present. Stored as `recipientAddress` on Invoice.

---

## 10.3 Invoice Identification

| Field | Indian Std | Our Status | Where |
|-------|------------|------------|-------|
| Invoice Number | **Yes** | ✅ | Sequential `FY/INV/0001` |
| Invoice Date | **Yes** | ✅ | `invoiceDate` |
| Invoice Type | E-invoice | ❌ | Regular only |
| Reverse Charge (Y/N) | **Yes** | ✅ | `reverseCharge` stored + shown |
| Place of Supply | **Yes** | ✅ | `placeOfSupply` (state code) |
| Due Date | Recommended | ✅ | `dueDate` |
| Currency | Exports | INR assumed | — |

---

## 10.4 E-Invoice Specific

| Field | Indian Std | Our Status |
|-------|------------|------------|
| IRN | Yes (if e-invoice) | ❌ Not built |
| Acknowledgement No/Date | Yes | ❌ |
| QR Code | Yes | ❌ (we have UPI QR, not IRP QR) |
| E-Way Bill Number | If applicable | ❌ Schema has `ewayBillNo`; not used |

**Note**: E-invoice mandatory for AATO > Rs. 5 Cr. P2 backlog.

---

## 10.5 Line Item Fields

| Field | Indian Std | Our Status | Where |
|-------|------------|------------|-------|
| Sl. No. | **Yes** | ✅ | 1, 2, 3… |
| Description | **Yes** | ✅ | `productName` |
| HSN Code (goods) | **Yes** | ✅ | `hsnCode` per item |
| SAC Code (services) | **Yes** | ❌ | No SAC; only HSN |
| Unit of Measure | **Yes** | ✅ | `unit` (pcs, kg, etc.) |
| Quantity | **Yes** | ✅ | `quantity` |
| Unit Price | **Yes** | ✅ | `unitPrice` |
| Gross Amount | **Yes** | ✅ | `subtotal` |
| Discount | If applicable | ✅ | Per-line + bill-level |
| Taxable Value | **Yes** | ✅ | Subtotal − discount |
| GST Rate | **Yes** | ✅ | `gstRate` |
| CGST/SGST/IGST | **Yes** | ✅ | Per item + totals |
| Cess | If applicable | 🟡 | Schema has `cess`; not in ClassicBilling UI |
| Batch Number | Pharma/FMCG | ❌ | Not supported |
| Expiry Date | Pharma/FMCG | ❌ | Not supported |

**Gap**: SAC for services; Cess for tobacco/vehicles; Batch/Expiry for pharma.

---

## 10.6 Invoice Totals

| Field | Indian Std | Our Status |
|-------|------------|------------|
| Total Taxable Value | **Yes** | ✅ |
| Total CGST/SGST/IGST | **Yes** | ✅ |
| Total Cess | If applicable | 🟡 Schema supports; not in UI |
| Round Off | Optional | ✅ |
| Invoice Total | **Yes** | ✅ |
| Amount in Words | **Yes** | ✅ | PDF + preview |
| Advance Received | If applicable | ❌ |
| Balance Payable | Recommended | Invoice shows `paidAmount` / total |

---

## 10.7 Transport / Logistics

| Field | Indian Std | Our Status |
|-------|------------|------------|
| E-Way Bill Number | If applicable | Schema has `ewayBillNo`; not used |
| Mode / Vehicle / Transporter | E-Way | ❌ |

---

## 10.8 Declarations and Signatures

| Field | Indian Std | Our Status |
|-------|------------|------------|
| "Tax is payable on Reverse Charge" | Mandatory if RCM | ✅ | Shown when `reverseCharge` |
| "This is a Computer Generated Invoice" | Optional | ✅ | PDF footer |
| "Composition Taxable Person" | Mandatory if composition | ❌ | Not on invoice |
| Authorised Signatory | Required | ✅ | "for {shopName}" + "Authorised Signatory" |
| FSSAI / Drug License / RERA | If applicable | ❌ | Not supported |

**Status**: "Composition Taxable Person" shown on PDF and all preview templates when `compositionScheme` is true.

---

## 10.9 State Code Reference

| Requirement | Our Status |
|-------------|------------|
| GSTIN state code 01–38 | ✅ | Validated in ClassicBilling |
| Place of Supply state code | ✅ | 2-digit state code |

---

## 10.10 GSTIN Validation

| Rule | Our Status |
|------|------------|
| Length 15 | ✅ |
| State code 01–38 | ✅ |
| PAN format | ✅ | Regex |
| Checksum | ❌ | Not validated (GSTN checksum algo) |

**Note**: Full checksum validation requires GSTN algorithm. Current regex is sufficient for format.

---

## Implementation Checklist

### P0 — Must Fix for Compliance ✅ **COMPLETED**

1. **Supplier address on invoice** ✅  
   - Settings has `address`, `city`, `state`, `pincode` in biz profile.  
   - PDF: `shopAddress` built from tenant.settings in `dispatchInvoicePdfEmail`.  
   - Preview: `supplierAddress` from biz profile in ClassicBilling; shown in all templates.

2. **Recipient address mandatory for B2B** ✅  
   - Recipient address override textarea when `buyerGstin` present.  
   - Fallback from customer address fields when available.  
   - Passed to API as `recipientAddress`; stored on Invoice; shown on PDF.

3. **Composition scheme declaration** ✅  
   - When `compositionScheme` is true, "Composition Taxable Person" shown on PDF and all preview templates.

### P1 — Recommended

4. **Supplier city, state, PIN**  
   - Add to biz profile; show in header.

5. **Recipient phone/email on invoice**  
   - Optional; useful for delivery.

6. **Buyer PO number**  
   - Optional field for B2B.

### P2 — Optional / Segment-Specific

7. **SAC code** — For service businesses.  
8. **Cess** — For tobacco, vehicles, etc.  
9. **Batch/Expiry** — For pharma/FMCG.  
10. **E-invoice / E-Way** — Planned.

### Invoice UX Improvements (see INVOICE_REQUIREMENTS.md)

11. **Amount in words on PDF** — `toIndianWords()` exists; wire to PDF template. Est: 4h.  
12. **Total items / total qty** — Add to TotalsBlock in preview + PDF. Est: 2h.  
13. **"ORIGINAL FOR RECIPIENT"** — Show when B2B. Est: 1h.  
14. **Supplier email** — Add to Settings; show in PDF footer. Est: 2h.  
15. **Payment status badge** — "Paid" / "Partial" / "Balance Due" on invoice. Est: 2h.  
16. **Recipient phone/email** — Optional; useful for delivery. Est: 4h.  
17. **Buyer PO number** — Optional B2B field. Est: 4h.

---

## Files to Audit/Modify

| File | Purpose |
|------|---------|
| `apps/web/src/pages/Settings.tsx` | Biz profile: address, city, state, pincode, email |
| `packages/infrastructure/src/pdf.ts` | PDF: supplier address, composition text, recipient address, amount in words, total items/qty, ORIGINAL FOR RECIPIENT |
| `apps/web/src/components/InvoiceTemplatePreview.tsx` | Preview: supplier address, composition text, TotalsBlock, payment status |
| `apps/mobile/src/components/InvoiceTemplatePreview.tsx` | Mobile preview parity |
| `apps/web/src/pages/ClassicBilling.tsx` | Recipient address override when B2B, buyer PO number |

---

*Audit based on `docs/INDIAN_GST_BILLING_REFERENCE.md` Section 10 (Complete Invoice Field Reference).*
*Full requirements: `docs/INVOICE_REQUIREMENTS.md` — quick wins, UX, user-requested, competitor parity.*

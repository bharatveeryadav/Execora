> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora — Complete Pages Plan
## All Pages: Current Status + Build Requirements
### Last Updated: March 15, 2026

> Single reference for every page in the web app.
> Status: ✅ Built | ⚠️ Partial | ❌ Not Built | 🔲 ComingSoon placeholder

---

## TABLE OF CONTENTS

1. [Navigation Structure](#1-navigation-structure)
2. [Core Billing Pages](#2-core-billing-pages)
3. [Invoice & Sales Pages](#3-invoice--sales-pages)
4. [Customer & Party Pages](#4-customer--party-pages)
5. [Inventory Pages](#5-inventory-pages)
6. [Purchase & Expense Pages](#6-purchase--expense-pages)
7. [Payment Pages](#7-payment-pages)
8. [Reports & Books Pages](#8-reports--books-pages)
9. [GST Pages](#9-gst-pages)
10. [Settings Pages](#10-settings-pages)
11. [ComingSoon Pages — Build Requirements](#11-comingsoon-pages--build-requirements)
12. [Mobile App Screens](#12-mobile-app-screens)
13. [Priority Build Order](#13-priority-build-order)

---

## 1. NAVIGATION STRUCTURE

### Desktop Sidebar (AppLayout.tsx)
```
Home
Sales
  ├─ Invoices           → /invoices         ✅ built
  ├─ Credit Notes       → /credit-notes     ✅ Built (March 15)
  └─ E-Invoices         → /einvoicing       ⚠️ partial
Purchases
  ├─ Purchases          → /purchases        ✅ built
  ├─ Purchase Order     → /purchase-orders  🔲 ComingSoon
  └─ Debit Order        → /debit-orders     🔲 ComingSoon
Quotation
  ├─ Quotation          → /invoices         (reuses invoices)
  ├─ Sales Order        → /billing          (reuses billing)
  ├─ Pro Forma Invoices → /invoices         (reuses invoices)
  ├─ Delivery Challans  → /delivery-challans 🔲 ComingSoon
  └─ Packaging Lists    → /packaging-lists  🔲 ComingSoon
Expenses
  ├─ Expense            → /expenses         ✅ built
  └─ Indirect Income    → /indirect-income  🔲 ComingSoon
Product & Service       → /inventory        ✅ built
Payments
  ├─ Payment Links      → /payment          ✅ built
  ├─ Journals           → /journals         🔲 ComingSoon
  └─ Bank Reconciliation→ /bank-reconciliation ⚠️ partial
Parties
  ├─ Customers          → /parties          ✅ built
  └─ Suppliers            → /parties          (reuses parties)
Insights                → /                 (reuses dashboard)
Reports                 → /reports          ⚠️ partial
Online Store            → /online-store     🔲 ComingSoon
E-Way Bill              → /einvoicing       (reuses einvoicing)
More
  ├─ Add-ons            → /addons           🔲 ComingSoon
  ├─ MyDrive            → /mydrive          🔲 ComingSoon
  ├─ Tutorial           → /tutorial         🔲 ComingSoon
  └─ Feedback           → /feedback         🔲 ComingSoon
```

### Mobile Bottom Nav (BottomNav.tsx) — 5 tabs
```
Home      → /
Parties   → /parties
Items     → /inventory
Bills     → /invoices
More      → drawer (New Bill, Classic Bill, Voice, Reports, Expiry,
                    Daybook, Cashbook, Expenses, Payments, Settings,
                    Recurring, Balance Sheet, Bank Recon, Import, GSTR-3B)
```

---

## 2. CORE BILLING PAGES

### `/billing` — ClassicBilling ✅ Built (90%)

**What it does:**
Fast invoice creation — 9 columns: Product | Qty | Unit | Rate | Disc% | HSN | GST% | Amount.
Product autocomplete with auto-fill. GST split (CGST+SGST / IGST). Amount in words.
Payment split (Cash/UPI/Card/Credit). 4 invoice templates.

**What works:**
- Product search + auto-fill rate, unit, HSN, GST rate
- Item-level discount (lineDiscountPercent)
- Bill-level discount (flat ₹ or %)
- GST calculation (intra/inter state)
- Amount in words (lakh/crore)
- Split payment: Cash + UPI + Card + Credit
- Partial payment ("500 diye, baki kal")
- 4 invoice templates (live preview)
- Thermal print
- WhatsApp share + Email
- Barcode scan → add product

**What's missing / needs fixing:**
- ❌ **B2B fields**: No buyerGSTIN, placeOfSupply, RCM toggle in UI
  - Schema has these fields; API accepts them; UI form doesn't show them
  - Fix: Add collapsible "B2B Details" section in billing form
- ⚠️ **Mobile layout**: Form has fixed-width columns that overflow on 375px screens
  - Fix: Switch to single-column stacked layout below 640px
- ⚠️ **Template persistence**: Saved to localStorage only, not DB
  - Fix: Save selected template to tenant.settings via updateProfile

**Requirements to complete (1 day):**
```
[ ] Add "B2B Invoice" toggle in ClassicBilling
    - When toggled: show Buyer GSTIN input (with GSTIN validation)
    - Auto-detect inter-state based on tenant state vs customer state
    - Show RCM checkbox
    - Pass buyerGstin + placeOfSupply + reverseCharge to invoice create API
[ ] Fix mobile: below 640px use stacked item rows, not table columns
[ ] Save selected template to Tenant.settings.invoiceTemplate
```

---

### `/invoices` — Invoice List ✅ Built (100%)

**What it does:** List all invoices with filters, search, sort, and quick actions.

**What works:** All filters, search, status badges, quick actions (view/print/email/WhatsApp/cancel).

**Nothing critical missing.**

---

### `/invoices/:id` — Invoice Detail ✅ Built (90%)

**What it does:** Full invoice view — items, tax breakdown, payment history, actions.

**What works:** View, edit draft, record payment, cancel, convert proforma, print, share.

**What's missing:**
- ⚠️ Cannot add/remove items after invoice creation (only draft edit)
- ⚠️ No payment reversal (if recorded by mistake)

**Requirements:**
```
[ ] Allow item add/remove on draft invoices only (already supported by API PATCH /invoices/:id)
[ ] Add "Reverse Payment" option for owner/admin role only
```

---

## 3. INVOICE & SALES PAGES

### `/credit-notes` — Credit Notes ✅ Built (March 15, 2026)

**What it is:** Document issued to reduce amount owed by customer — for returns, pricing errors, or allowances. Mandatory for GST compliance on B2B returns.

**BUILT:** Full schema + API + UI shipped March 15.

**Schema:** `CreditNote` + `CreditNoteItem` models with `CreditNoteStatus` (draft/issued/cancelled) and `CreditNoteReason` (goods_returned/price_adjustment/discount/damaged_goods/short_supply/other) enums. Relations on Tenant, Customer, Invoice, Product.

**API routes live:**
```
POST   /api/v1/credit-notes             — create draft (line-level GST: CGST/SGST intrastate, IGST interstate)
GET    /api/v1/credit-notes             — list with status/customerId/invoiceId filters
GET    /api/v1/credit-notes/:id         — detail with items + customer + invoice
POST   /api/v1/credit-notes/:id/issue   — issue (draft → issued, stamps issuedAt)
POST   /api/v1/credit-notes/:id/cancel  — cancel with reason
DELETE /api/v1/credit-notes/:id         — soft-delete draft only
```
Auto-generates `CN/2025-26/SEQ` numbering per FY per tenant.

**UI features built:**
- List with status filter cards (all/draft/issued/cancelled) + issued credit total
- Create dialog: customer + invoice selector, reason, multi-row item editor, live totals, GST rate selector
- Detail dialog: full breakdown, CGST/SGST/IGST totals, Issue + Cancel actions
- Soft-delete drafts from dropdown

**Pending (next steps):**
- ❌ PDF generation for credit notes
- ❌ WhatsApp/Email share of issued CN
- ❌ GSTR-1 CDNR auto-population from issued CNs

---

### `/einvoicing` — E-Invoicing ⚠️ Partial (30%)

**What it does:** Generate IRN (Invoice Reference Number) for B2B invoices > ₹5Cr turnover. Upload to GSTN IRP.

**What works:** List of B2B invoices that need IRN. Status display.

**What's missing:**
- ❌ No actual IRN generation (NIC/GSP sandbox API call)
- ❌ No QR code embedding in PDF after IRN
- ❌ No signed e-invoice JSON download

**Requirements:**
```
[ ] Integrate NIC sandbox API (or third-party GSP like Masters India / ClearTax)
    - POST to IRP: invoice JSON in prescribed format
    - Receive IRN + signed QR
    - Store irn + signedQrCode on Invoice record
[ ] Add irn + qrCodeData to PDF template
[ ] Add "Cancel IRN" workflow (within 24h window)
[ ] Error handling for IRP rejections (duplicate, invalid GSTIN, etc.)
```

**Estimate:** 5 days (third-party GSP integration)

---

## 4. CUSTOMER & PARTY PAGES

### `/parties` — Customers/Suppliers List ✅ Built (95%)

**What works:** List, create, search, export CSV/PDF. Tags. Credit limit. Balance.

**What's missing:**
- ⚠️ Bulk CSV import button shows UI but backend endpoint missing
- ⚠️ Supplier tab shows same customers list (Supplier model exists in schema but no separate supplier CRUD)

**Requirements:**
```
[ ] POST /api/v1/customers/bulk — batch create from CSV
[ ] POST /api/v1/suppliers/bulk — batch create suppliers from CSV
[ ] Separate Supplier tab to use Supplier model (not Customer)
    - Supplier model already in schema with name, phone, gstin, paymentTerms, creditLimit, balance
```

---

### `/customers/:id` — Customer Detail ✅ Built (100%)

All tabs fully working: overview, invoices, ledger, reminders, edit, delete.

---

### `/overdue` — Overdue Invoices ✅ Built (90%)

**What works:** Aging buckets (0–7d, 7–30d, 30d+), bulk reminders, payment recording.

**Minor missing:**
```
[ ] Aging by customer summary (total outstanding per customer, not per invoice)
[ ] Export overdue list to CSV/PDF for CA
```

---

## 5. INVENTORY PAGES

### `/inventory` — Product & Stock ✅ Built (90%)

**What works:** CRUD products, stock adjust, barcode, OCR import, expiry, low stock alerts, replenishment suggestions.

**What's missing:**
- ⚠️ No multi-location/warehouse support (Product.location is a text field, not a Warehouse model)
- ⚠️ No cost price / margin analysis UI (cost field exists in schema, not shown in UI)
- ⚠️ Batch selection at sale time (batch model exists, not wired to invoice items)

**Requirements:**
```
[ ] Show cost price + margin % in product list (data already in schema)
[ ] Add "Itemwise Profit" column: (price - cost) / price × 100
[ ] Batch selector when adding product to invoice (for pharma/FMCG)
```

---

### `/expiry` — Batch Expiry Management ✅ Built (80%)

**What works:** RAG color system, 5 expiry filters, batch list, bulk write-off.

**What's missing:**
```
[ ] Bulk "mark as sold at discount" action
[ ] Email/WhatsApp report to owner with expiry summary
[ ] Expiry notification 30 days before (BullMQ scheduled job)
```

---

## 6. PURCHASE & EXPENSE PAGES

### `/purchases` — Purchases from Suppliers ✅ Built (100%)

All working: record purchase, OCR bill scan, batch/expiry on purchase, supplier name, date, category.

---

### `/purchase-orders` — Purchase Orders 🔲 ComingSoon → ❌ Not Built

**What it is:** Formal order sent to supplier before goods are received. Tracks ordered vs received quantity.

**Data model needed (already in schema):**
```
PurchaseOrder model exists:
  - poNo, status (draft|pending|received|cancelled)
  - supplierId → Supplier
  - items: PurchaseOrderItem (productId, orderedQty, receivedQty, unitPrice, expiryDate)
```

**API routes needed:**
```
POST   /api/v1/purchase-orders             — create PO
GET    /api/v1/purchase-orders             — list (filter: status, supplierId, date)
GET    /api/v1/purchase-orders/:id         — single PO
PATCH  /api/v1/purchase-orders/:id         — update
POST   /api/v1/purchase-orders/:id/receive — mark goods received (updates stock)
POST   /api/v1/purchase-orders/:id/cancel  — cancel PO
```

**UI page features:**
- List: PO number, supplier, items count, total value, status (Draft/Sent/Received/Partial/Cancelled)
- Create: Select supplier, add products (qty, rate, expected delivery), save + send
- Receive goods: Mark items received with actual qty (partial receipt supported)
- Auto-update Product.stock on receipt
- Convert received PO to Expense/Purchase record

**Estimate:** 2 days

---

### `/debit-orders` — Debit Orders (Debit Notes) 🔲 ComingSoon → ❌ Not Built

**What it is:** Document sent to supplier requesting reduction in amount payable — for returned goods, pricing disputes. Mirror of Credit Note (supplier sends credit note, buyer issues debit note).

**Data model needed:**
```prisma
model DebitNote {
  id           String
  tenantId     String
  debitNoteNo  String    // DN/2025-26/001
  supplierId   String
  purchaseId   String?   // linked purchase
  reason       String    // RETURN | PRICING_ERROR | QUALITY_ISSUE | OTHER
  status       String    // draft | sent | accepted | cancelled
  items        DebitNoteItem[]
  totalAmount  Decimal
  notes        String?
  issuedAt     DateTime?
}
```

**Estimate:** 2 days (mirrors credit note)

---

### `/expenses` — Business Expenses ✅ Built (95%)

**What works:** Record, list, filter by category/date. Delete.

**What's missing:**
```
[ ] Expense category report (pie chart + table by category)
[ ] Recurring expenses (monthly rent, salaries — set once, auto-create)
[ ] Expense approval workflow for manager/staff (owner approves > ₹X)
```

---

### `/indirect-income` — Indirect Income 🔲 ComingSoon → ⚠️ Low complexity

**What it is:** Non-primary income: interest received, rental income, commission received, misc income.

**Why needed:** P&L accuracy — this income sits above "Other Income" line in P&L.

**Data model:** Reuse `Expense` model with `type = "income"` and `category` covering interest, rental, misc.

**OR** add `Expense.isIncome Boolean @default(false)` flag.

**API:** Add `?type=income` filter to existing expense routes. Zero backend model change needed.

**UI:** Near-copy of Expenses page with income categories.

**Estimate:** 4 hours

---

## 7. PAYMENT PAGES

### `/payment` — Record Payment ✅ Built (100%)

Customer search, invoice selection, split payment (cash+UPI+card), partial payment, receipt, confetti. Fully working.

---

### `/journals` — Accounting Journals 🔲 ComingSoon → ❌ Not Built

**What it is:** Manual double-entry journal entries for accountants. Debit/Credit entries for accounts.

**Who needs it:** CA partners, businesses with in-house accountants.

**Complexity:** HIGH — requires Chart of Accounts model.

**Data model needed:**
```prisma
model Account {
  id       String
  tenantId String
  code     String   // 1001 = Cash, 2001 = AR, etc.
  name     String
  type     String   // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
  parent   String?
}

model JournalEntry {
  id          String
  tenantId    String
  date        DateTime
  description String
  lines       JournalLine[]
  createdById String
}

model JournalLine {
  id        String
  entryId   String
  accountId String
  debit     Decimal @default(0)
  credit    Decimal @default(0)
  narration String?
}
```

**Estimate:** 5 days (chart of accounts + journal entries + trial balance report)

**Priority:** LOW — only needed for businesses with full accounting requirement. Most kirana/SME use this for GST filing only, not full double-entry.

---

### `/bank-reconciliation` — Bank Statement Matching ⚠️ Partial (20%)

**What works:** File upload UI, format auto-detection, table display.

**What's critically broken:** CSV parsing uses `Math.random()` mock — not real data.

**Requirements:**
```
[ ] Backend: POST /api/v1/bank-reconciliation/parse
    - Accept CSV file upload
    - Detect bank format (ICICI/HDFC/SBI/Axis/Kotak) from header row
    - Parse into { date, description, debit, credit, balance } rows
    - Return parsed rows to frontend

[ ] Backend: POST /api/v1/bank-reconciliation/match
    - Accept parsed bank rows
    - Match against payments in DB by date ± 3 days + amount
    - Return: matched[], unmatched[], extra[]

[ ] Frontend: connect upload to real API instead of parseCsvMock()
[ ] Save reconciliation results to DB (for audit trail)
[ ] "Import unmatched" — create payment records for unmatched bank credits
```

**Estimate:** 3 days

---

## 8. REPORTS & BOOKS PAGES

### `/reports` — Report Hub ⚠️ Partial (40% of all reports built)

**Structure:** Sidebar with 9 categories, each with sub-reports. Some inline (rendered in page), some navigate to existing pages.

**Built inline reports:** Overview (KPI), Aging, GSTR-1, P&L
**Navigation reports (pages exist):** Sale, Purchase, Daybook, Cash Flow, Balance Sheet, All Parties, Inventory, Expenses, Bank Statement, GSTR-3B

**Reports showing but NOT built (no path, no inline):**

| Report | Category | Priority | Estimate |
|--------|----------|----------|---------|
| GSTR-2 (Inward supply) | GST | MEDIUM | 2d |
| GSTR-9 (Annual return) | GST | LOW | 3d |
| Sale Summary | Transaction | HIGH | 1d |
| By HSN/SAC Report | GST | HIGH | 1d |
| Item Report by Party | Item/Stock | HIGH | 1d |
| Itemwise Profit & Loss | Item/Stock | HIGH | 1d |
| Stock Detail Report | Item/Stock | MEDIUM | 1d |
| Sale/Purchase by Category | Item/Stock | MEDIUM | 1d |
| Item Batch Report | Item/Stock | MEDIUM | 1d |
| Discount Statement | Business | MEDIUM | 1d |
| Expense Category Report | Expense | HIGH | 4h |
| Expense Item Report | Expense | MEDIUM | 4h |
| Sale/Purchase Order Reports | Orders | LOW (needs PO first) | 1d |
| Loan Statements | Loan | LOW | — |
| GST Rate Report | Taxes | MEDIUM | 4h |
| TDS Payable | Taxes | LOW | 2d |
| TDS Receivable | Taxes | LOW | 2d |

**Requirements for high-priority missing reports:**

```
Itemwise Profit & Loss:
  GET /api/v1/reports/itemwise-pnl?from=&to=
  → group invoiceItems by productId, sum (qty × unitPrice) - (qty × cost)
  → return [{productName, totalSales, totalCost, grossProfit, marginPct}]

Sale Summary:
  GET /api/v1/reports/sale-summary?from=&to=&groupBy=day|week|month
  → sum invoices by period

HSN Summary:
  GET /api/v1/reports/hsn-summary?from=&to=
  → group invoiceItems by hsnCode, sum taxable value + CGST/SGST/IGST

Expense Category Report:
  Already possible: GET /api/v1/expenses?from=&to= + client-side group by category
  Just needs a dedicated UI tab in Reports
```

---

### `/daybook` — Day Book ✅ Built (100%)

All transactions chronologically. Fully working.

---

### `/cashbook` — Cash Book ✅ Built (100%)

Cash-only transactions. Fully working.

---

### `/balance-sheet` — Balance Sheet ⚠️ Partial (50%)

**What works:** Simplified Assets/Liabilities/Equity derived from customers, products, expenses.

**What's missing:**
- No fixed assets (equipment, furniture)
- No loan/liability tracking
- Not GAAP compliant

**Requirements:**
```
[ ] Add FixedAsset model (name, purchaseDate, cost, depreciationRate, netValue)
[ ] Add Loan model (lender, principal, outstandingBalance, emi, nextDueDate)
[ ] Build proper balance sheet: Assets = Cash + AR + Inventory + Fixed Assets
                                Liabilities = AP + Loans + Tax Payable
                                Equity = Capital + Retained Earnings
[ ] Period comparison: This FY vs Last FY
```

**Estimate:** 3 days

---

## 9. GST PAGES

### `/gstr3b` — GSTR-3B Filing ⚠️ Partial (70%)

**What works:** Monthly view, filing status (Pending/Filed/Overdue), tax table with CGST/SGST/IGST rows, month selector, real data from invoice aggregation.

**What's critically broken:**
- ITC calculation pulls from generic expenses — not actual purchase GST paid
- No PDF export of GSTR-3B form
- No GSP/GSTN API submission
- Challan generation is placeholder

**Requirements:**
```
[ ] Backend: GET /api/v1/reports/gstr3b?month=YYYY-MM
    Input: All invoices in month → group by gstRate → sum CGST/SGST/IGST
    ITC: All purchases in month with gstPaid field → sum by rate
    Return: { outwardSupplies: [{rate, taxable, igst, cgst, sgst}],
              itcAvailable: [{rate, igst, cgst, sgst}],
              netPayable: {igst, cgst, sgst, cess} }

[ ] Add gstPaid field to Expense/Purchase model (tax paid to supplier)
    Already: batchNo + expiryDate added; add gstRate + gstPaid (Decimal)

[ ] PDF generation: render GSTR-3B in official government format
    Use PDFKit (already in infrastructure)

[ ] Filing status persistence: store filed months in DB (Tenant.settings.gstr3bFiled[])
```

**Estimate:** 3 days

---

## 10. SETTINGS PAGES

### `/settings/profile/company` → Settings.tsx ✅ Built (75%)

**What works:** Business name, GSTIN, address, TTS, theme, language, team management, invoice templates.

**What's missing:**
- ❌ Payment gateway config (Razorpay, PhonePe, UPI VPA — form exists but not saved to backend)
- ⚠️ Role assignment in team management (can add users but role dropdown not wired)

---

### `/settings/*` → SettingsSection.tsx 🔲 Placeholder

All settings sub-routes show a "Coming soon" placeholder:

| Route | What it should show | Priority |
|-------|--------------------|----|
| `/settings/profile/user` | User's own name, email, password change | HIGH |
| `/settings/profile/users` | Team members list + invite + role assign | HIGH |
| `/settings/general/preferences` | Date format, currency, language, FY start | MEDIUM |
| `/settings/general/thermal-print` | Thermal printer width (58mm/80mm), header, footer | MEDIUM |
| `/settings/general/barcode` | Barcode format (EAN-13, QR, Code128) | LOW |
| `/settings/general/signatures` | Upload owner signature image for PDF | MEDIUM |
| `/settings/general/notes` | Default invoice header/footer notes | HIGH |
| `/settings/general/terms` | Default T&C text (printed on invoice) | HIGH |
| `/settings/general/auto-reminders` | Reminder schedule: 3d before, on due, 7d after | HIGH |
| `/settings/banks/banks` | Bank accounts for NEFT/RTGS display on invoice | HIGH |
| `/settings/banks/wallet` | UPI VPA, QR code display | HIGH |
| `/settings/payment-gateway/api` | Razorpay key, PhonePe secret, webhook URLs | HIGH |

**Requirements (high priority settings):**

```
User Profile (/settings/profile/user):
  - Name, email, avatar upload
  - Change password (old + new + confirm)
  - 2FA setup (optional)

Auto-Reminders (/settings/general/auto-reminders):
  - Toggle per reminder type (due_soon, overdue_3d, overdue_7d, overdue_30d)
  - Channel: WhatsApp | Email | Both
  - Custom message template per type
  - Saved to Tenant.settings.reminderConfig

Notes & Terms (/settings/general/notes + /settings/general/terms):
  - Textarea with markdown support
  - Preview shows how it appears on invoice
  - Saved to Tenant.settings.invoiceNotes + termsAndConditions

Bank Account (/settings/banks/banks):
  - Account holder name, bank name, account number, IFSC, branch
  - Saved to Tenant.settings.bankAccountNo etc.
  - Toggle: Show on invoice PDF

UPI/Wallet (/settings/banks/wallet):
  - UPI VPA input with validation
  - Preview QR code
  - Saved to Tenant.settings.upiVpa

Payment Gateway (/settings/payment-gateway/api):
  - Razorpay: Key ID + Key Secret → test connection
  - PhonePe: Merchant ID + Salt Key
  - Juspay: API key
  - Webhook secret per gateway
  - Saved to Tenant.settings.gatewayConfig (encrypted at rest)
```

**Estimate:** All high-priority settings sub-pages: 2 days

---

## 11. COMINGSOON PAGES — BUILD REQUIREMENTS

### `/delivery-challans` — Delivery Challan 🔲

**What it is:** Document accompanying goods in transit (before invoice is raised). Used by distributors, manufacturers.

**Data model:**
```prisma
model DeliveryChallan {
  id          String
  tenantId    String
  challanNo   String    // DC/2025-26/001
  customerId  String
  status      String    // draft | dispatched | delivered | cancelled
  items       ChallanItem[]
  vehicleNo   String?
  driverName  String?
  notes       String?
  dispatchedAt DateTime?
  deliveredAt  DateTime?
  invoiceId   String?   // linked invoice (created after delivery)
}
```

**API:** CRUD + dispatch + deliver + convert-to-invoice endpoints

**UI:** List, create, dispatch, deliver, convert to invoice

**Estimate:** 2 days

---

### `/packaging-lists` — Packaging List 🔲

**What it is:** List of items in a shipment box/pallet. Used by exporters, large distributors.

**Complexity:** LOW — nearly same as Delivery Challan with box/pallet grouping.

**Estimate:** 1 day (after Delivery Challan built)

---

### `/online-store` — Online Store 🔲

**What it is:** Customer-facing product catalogue + online ordering page. Shareable link for B2C customers.

**Components:**
- Public product page: `/store/:tenantSlug` — shows products with price, stock, add to cart
- Cart → checkout → UPI payment link
- Order confirmation → auto-create invoice in Execora
- Inventory auto-deduct on order

**Data model needed:**
```prisma
model StoreConfig {
  tenantId    String @id
  slug        String @unique   // execora.app/store/sharma-kirana
  isPublic    Boolean @default(false)
  title       String
  description String?
  bannerUrl   String?
  allowedCategories String[]
}

model Order {
  id          String
  tenantId    String
  customerId  String?
  phone       String   // for guest checkout
  items       OrderItem[]
  totalAmount Decimal
  status      String   // pending | paid | processing | dispatched | delivered
  paymentRef  String?
  invoiceId   String?  // created after payment
}
```

**Estimate:** 5 days (frontend store page + backend order flow + payment integration)

---

### `/mydrive` — Document Storage 🔲

**What it is:** Cloud storage for business documents — bills, contracts, certificates, GST registration.

**Backend:** Already has MinIO. Just need:
- `Document` model (name, type, url, uploadedAt, tenantId)
- File upload API + list/delete
- Frontend file manager with folder structure

**Estimate:** 2 days

---

### `/tutorial` — Interactive Tutorial 🔲

**What it is:** Step-by-step in-app tutorial for new users. Shows how to create first invoice.

**Implementation:** Use `react-joyride` or custom tooltip overlay.

**Steps:**
1. Welcome → add first product (→ /inventory)
2. Add a customer (→ /parties)
3. Create first bill (→ /billing) — guided through each field
4. Send invoice on WhatsApp
5. Done → confetti 🎉

**Estimate:** 1 day

---

### `/feedback` — User Feedback 🔲

**What it is:** Simple form to collect NPS score + text feedback.

**Implementation:**
- NPS (0–10 score selector)
- Feature request textarea
- Submit → store in DB or send to owner email / Slack

**Estimate:** 4 hours

---

### `/addons` — Add-ons Marketplace 🔲

**What it is:** Plugin/module marketplace — enable/disable optional features.

**Add-ons to list (most are already built, just need enable/disable toggle):**
| Add-on | Status |
|--------|--------|
| Voice Billing | ✅ built — just toggle |
| Payment Sound Box | ✅ built — just toggle |
| WhatsApp Integration | ✅ built — needs API key |
| GST E-Invoicing | ⚠️ partial — IRN |
| E-Way Bill | ❌ not built |
| Thermal Printer | ✅ built |
| OCR Bill Scanner | ✅ built |
| Online Store | ❌ not built |
| Bank Reconciliation | ⚠️ partial |

**Estimate:** 1 day (list + toggle UI, features already exist)

---

## 12. MOBILE APP SCREENS (React Native — apps/mobile/)

| Screen | Status | Notes |
|--------|--------|-------|
| LoginScreen | ✅ built | Email + password, auto-login via env |
| DashboardScreen | ✅ built | KPI cards, today's summary |
| BillingScreen | ✅ built | Counter-mode billing, sticky total bar |
| InvoiceListScreen | ✅ built | List with filters |
| InvoiceDetailScreen | ✅ built | Full invoice view |
| CustomersScreen | ✅ built | List + search |
| CustomerDetailScreen | ✅ built | Ledger + invoices |
| PaymentScreen | ✅ built | Record payment |
| VoiceScreen | ✅ built | Voice command interface |
| OverdueScreen | ✅ built | Overdue list |
| ItemsScreen | ✅ built | Product list |

**What's missing in mobile app:**
```
[ ] Barcode scanner (native camera) — react-native-vision-camera
[ ] Offline support — MMKV already used; need React Query persistence
[ ] Push notifications — FCM integration
[ ] Purchases screen (record purchase from phone)
[ ] Expiry screen (batch expiry alerts)
[ ] Reports screen (daily summary chart)
[ ] Settings screen (shop profile edit)
```

---

## 13. PRIORITY BUILD ORDER

### Week 1 — B2B + Compliance (Blocking for business growth)

| # | Task | Page | Est. | Impact |
|---|------|------|------|--------|
| 1 | B2B fields in ClassicBilling (buyerGSTIN, placeOfSupply, RCM) | /billing | 1d | Unblocks all B2B invoicing |
| 2 | Credit Notes (schema + API + UI) | /credit-notes | 3d | Required for B2B returns + GSTR-1 CDNR |
| 3 | GSTR-3B real backend | /gstr3b | 3d | Monthly GST filing accuracy |

### Week 2 — Operations + Procurement

| # | Task | Page | Est. | Impact |
|---|------|------|------|--------|
| 4 | Purchase Orders (routes + UI) | /purchase-orders | 2d | Supplier management |
| 5 | Debit Orders | /debit-orders | 1d | Mirrors credit notes for suppliers |
| 6 | Recurring billing backend (DB + BullMQ) | /recurring | 2d | Auto-billing subscription customers |

### Week 3 — Reports + Settings completion

| # | Task | Page | Est. | Impact |
|---|------|------|------|--------|
| 7 | Itemwise P&L report | /reports | 1d | Product margin analysis |
| 8 | Bank reconciliation backend | /bank-reconciliation | 3d | Real bank matching |
| 9 | Settings sub-pages (notes, terms, auto-reminders, bank, UPI) | /settings/* | 2d | Setup completeness |

### Week 4 — Growth features

| # | Task | Page | Est. | Impact |
|---|------|------|------|--------|
| 10 | Online Store | /online-store | 5d | New revenue channel |
| 11 | Delivery Challans | /delivery-challans | 2d | Distributor workflow |
| 12 | Indirect Income | /indirect-income | 4h | P&L accuracy |
| 13 | Tutorial (in-app) | /tutorial | 1d | New user activation |
| 14 | Feedback page | /feedback | 4h | Product improvement |
| 15 | Add-ons page | /addons | 1d | Feature discoverability |

### Later (Enterprise / Q3 2026)

| Task | Est. | Notes |
|------|------|-------|
| Journals (double-entry) | 5d | For CA/accountant users only |
| MyDrive (document storage) | 2d | MinIO already available |
| E-Invoicing IRN | 5d | NIC/GSP API integration |
| GSTR-2 / GSTR-9 | 3d each | Annual return filing |
| TDS/TCS tracking | 3d | Enterprise compliance |
| Balance Sheet (GAAP) | 3d | Full accounting |
| Packaging Lists | 1d | After delivery challans |

---

## 14. SWIPE COMPETITOR — FEATURE PARITY GAPS

> Source: `docs/PRODUCT_STRATEGY_2026.md` Section 8 — Competitor Analysis
> Swipe Billing (swipe.pe) is the closest B2B SaaS competitor (₹7,199/year).
> Where Swipe WINS over current Execora, we must close the gap.

### Where Swipe Beats Execora (Gaps to Close)

| Swipe Feature | Swipe Status | Execora Status | Action Required |
|---|---|---|---|
| E-invoicing (IRN + QR) | ✅ NIC/GSP integration | ⚠️ UI only | Build NIC/GSP API — 5d |
| B2B invoice template | ✅ Clean, professional | ⚠️ Present but B2B fields hidden | Expose buyerGSTIN in form — 1d |
| Multi-user team | ✅ | ✅ | Parity achieved |
| Bank reconciliation | ❌ Not in Swipe | ⚠️ Mock only | We'll beat them — 3d |

### Where Execora Beats Swipe (Defend These Advantages)

| Feature | Swipe | Execora | Notes |
|---|---|---|---|
| Voice billing | ❌ Zero | ✅ 27 intents | Core differentiator — protect |
| Offline mode | ❌ Cloud-only | ✅ PWA + IndexedDB | Just built |
| Native mobile | ❌ PWA-only | ✅ React Native | Ship hardened app |
| WhatsApp auto-send | Manual | ✅ Automatic | Unique |
| Payment Sound Box | ❌ | ✅ Free built-in | Unique |
| Real-time WebSocket | ❌ | ✅ | Unique |
| Customer portal | ✅ | ✅ | Parity |
| Hindi UI + voice | ❌ | ✅ | Differentiator |
| Dark mode | ❌ | ✅ | UX advantage |
| Price | ₹7,199/yr | ₹999/mo → ₹3,588/q | More flexible |

### UX Quality Checklist (from PRODUCT_STRATEGY_2026 §8.8)
Items Swipe does well that Execora must also implement:

**Desktop UX:**
- [ ] Keyboard shortcuts: `N` = new invoice, `B` = quick bill, `P` = payment, `G` = GSTR-1, `?` = shortcut help
- [ ] Bulk select + bulk export on Invoice and Customer tables
- [ ] Sticky table header on scroll
- [ ] Loading skeletons on all async data loads (no blank flashes)
- [ ] Empty states with CTA on all list pages (no blank tables)
- [ ] All modals closable with `Escape` / all forms submittable with `Ctrl+Enter`
- [ ] Print/PDF preview before download on all PDF exports

**Mobile UX:**
- [ ] FAB (Quick Bill) floating button visible on Dashboard and Invoice list
- [ ] Swipe-to-delete on invoice items in billing screen (react-native-gesture-handler)
- [ ] Pull-to-refresh on all list screens (`RefreshControl`)
- [ ] Quick-fill chips on Payment screen: ₹200 / ₹500 / ₹1000 / Full Amount
- [ ] Haptic feedback on payment confirm and invoice create
- [ ] Voice mic button visible from any screen (floating or in header)
- [ ] Large numeric input on Payment screen (₹ amount = 32px font, full-width)

**Effort to implement all UX items:** 3 days (desktop + mobile combined)

---

## SUMMARY COUNTS

| Category | Total Pages | ✅ Built | ⚠️ Partial | 🔲 ComingSoon |
|----------|------------|---------|-----------|--------------|
| Billing | 3 | 2 | 1 | 0 |
| Sales/Invoice | 3 | 3 | 1 | 0 |
| Customer/Party | 3 | 3 | 0 | 0 |
| Inventory | 2 | 1 | 1 | 0 |
| Purchase/Expense | 5 | 2 | 1 | 2 |
| Payment | 3 | 1 | 1 | 1 |
| Reports/Books | 6 | 3 | 2 | 0 |
| GST | 2 | 0 | 2 | 0 |
| Settings | 14 | 1 | 1 | 12 |
| Other | 5 | 0 | 0 | 5 |
| **Total** | **46** | **16 (35%)** | **10 (22%)** | **20 (43%)** |

**Overall app: ~57% production-ready**
**For kirana + small retail: ~90% ready**
**For medium business: ~63% ready (needs B2B ClassicBilling fields, PO, GSTR-3B backend)**

---

_Last updated: March 15, 2026 | Credit Notes shipped (schema + API + UI)_

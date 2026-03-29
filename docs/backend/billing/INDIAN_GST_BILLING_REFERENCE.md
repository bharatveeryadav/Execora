> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Indian GST & SME Billing Reference

**Version**: 1.0 | **Applicable FY**: 2024-25 / 2025-26 | **Last Updated**: March 2026

This document is a comprehensive reference for developers building billing, invoicing, and accounting software for Indian SMEs. It covers GST law, invoice types, payment terms, segment-specific needs, accounting terminology, competitor workflows, GST filing mechanics, reporting requirements, and a complete invoice field reference.

---

## Table of Contents

1. [GST System in India](#1-gst-system-in-india)
2. [Invoice Types](#2-invoice-types)
3. [Payment Terms and Collection](#3-payment-terms-and-collection)
4. [SME Segments and Their Software Needs](#4-sme-segments-and-their-software-needs)
5. [Accounting Terms Reference](#5-accounting-terms-reference)
6. [Tally.ERP Workflow](#6-tallyerp-workflow)
7. [Vyapar and Khatabook](#7-vyapar-and-khatabook)
8. [GST Filing Workflow](#8-gst-filing-workflow)
9. [Business Reports Required](#9-business-reports-required)
10. [Complete Invoice Field Reference](#10-complete-invoice-field-reference)

---

## 1. GST System in India

### 1.1 Structure: CGST, SGST, IGST, UTGST

India's Goods and Services Tax (GST), effective July 1 2017, replaced over a dozen central and state taxes. It is a dual-structure tax:

| Tax | Full Name | Levied By | Applies When |
|-----|-----------|-----------|--------------|
| CGST | Central GST | Central Govt | Intra-state supply |
| SGST | State GST | State Govt | Intra-state supply |
| IGST | Integrated GST | Central Govt | Inter-state supply, imports |
| UTGST | Union Territory GST | UT Administration | Supply within UTs without legislature |

For intra-state transactions, CGST and SGST are each levied at half the applicable rate (e.g., 18% GST = 9% CGST + 9% SGST). For inter-state, IGST at the full rate is levied and later apportioned between centre and destination state.

### 1.2 GST Rate Slabs

| Slab | Typical Goods/Services |
|------|------------------------|
| 0% (Exempt) | Essential food items (unbranded), healthcare, education |
| 5% | Packaged food, coal, transport services, textiles (basic) |
| 12% | Processed food, mobile phones, business class air travel |
| 18% | Most manufactured goods, IT services, restaurants (AC) |
| 28% | Luxury goods, automobiles, tobacco, aerated drinks |
| 28% + Cess | Pan masala, tobacco, high-end vehicles |

Special rates also apply: 0.25% on rough diamonds, 3% on gold/silver/precious metals.

### 1.3 Registration Thresholds (FY 2025-26)

| Category | Threshold |
|----------|-----------|
| Goods supply (normal states) | Rs. 40 lakhs turnover/year |
| Services supply | Rs. 20 lakhs turnover/year |
| Special category states (NE, Uttarakhand, etc.) | Rs. 20 lakhs (goods), Rs. 10 lakhs (services) |
| Casual taxable person | Must register before taxable supply regardless of turnover |
| Non-resident taxable person | Must register before taxable supply |

Voluntary registration is permitted below threshold — often useful to claim Input Tax Credit (ITC).

### 1.4 Composition Scheme

Small taxpayers with turnover up to Rs. 1.5 crore (goods) or Rs. 50 lakhs (services) can opt for composition. Key features:

- Pay fixed rate on turnover (manufacturers: 1%, traders: 1%, restaurants: 5%)
- Cannot collect GST from customers (no tax on invoice)
- Cannot claim ITC
- File quarterly return (CMP-08) and annual return (GSTR-4)
- Must display "Composition Taxable Person" on all invoices and premises
- Cannot make inter-state outward supplies

### 1.5 E-Invoice (IRN)

Mandatory for taxpayers above specified turnover thresholds:
- Currently applicable to businesses with AATO (Annual Aggregate Turnover) above Rs. 5 crore
- Invoice is uploaded to Invoice Registration Portal (IRP) before or at the time of supply
- IRP returns a unique Invoice Reference Number (IRN), a QR code, and digitally signed JSON
- The QR code must be printed on the physical/PDF invoice
- Auto-populates GSTR-1 — eliminates manual data entry for large filers
- Exemptions: SEZ units, insurance, banking, financial services, NBFCs, GTA, passenger transport

### 1.6 E-Way Bill

Required for movement of goods worth more than Rs. 50,000 (lower thresholds in some states):
- Generated on GSTN E-Way Bill portal (ewaybillgst.gov.in)
- Contains: EWB number, supplier GSTIN, recipient GSTIN, vehicle number, transporter ID, goods description, HSN, value, distance
- Valid for: 1 day per 200 km (less than 200 km = 1 day, 200-400 km = 2 days, etc.)
- Not required for: exempted goods, value below threshold, movement by non-motorized vehicle, transport within notified areas

### 1.7 GST Returns Overview

| Return | Description | Frequency | Due Date |
|--------|-------------|-----------|----------|
| GSTR-1 | Outward supplies (B2B, B2CS, exports) | Monthly / Quarterly | 11th of next month (monthly); 13th of month after quarter (QRMP) |
| GSTR-3B | Summary return + tax payment | Monthly | 20th of next month (varies by state for quarterly) |
| GSTR-9 | Annual return | Annual | 31st December of next FY |
| GSTR-9C | Reconciliation statement (turnover > Rs. 5 Cr) | Annual | With GSTR-9 |
| CMP-08 | Composition scheme quarterly payment | Quarterly | 18th of month after quarter |
| GSTR-4 | Composition annual return | Annual | 30th April of next FY |
| GSTR-2B | Auto-drafted ITC statement | Monthly | 14th of next month |

### 1.8 HSN and SAC Codes

- **HSN** (Harmonised System of Nomenclature): 8-digit code for goods
- **SAC** (Services Accounting Code): 6-digit code for services
- Mandatory on invoices based on turnover:
  - Up to Rs. 5 crore: 4-digit HSN
  - Above Rs. 5 crore: 6-digit HSN
  - E-invoice filers: 6-digit HSN mandatory
- Common HSN codes: 1001 (wheat), 8471 (computers), 6109 (t-shirts), 3004 (medicines)
- SAC 9954 = construction services; SAC 9983 = professional/IT services

### 1.9 Input Tax Credit (ITC)

ITC allows a registered taxpayer to offset GST paid on purchases (inputs) against GST collected on sales (output tax liability).

**Conditions for ITC claim**:
- Supplier has filed their GSTR-1 (invoice visible in GSTR-2B)
- Buyer has received goods/services
- Tax has been paid to government by supplier
- Invoice or debit note is available
- ITC not blocked under Section 17(5) (blocked credits: motor vehicles for personal use, food & beverages, club memberships, personal expenses)

**ITC utilisation order**:
1. IGST credit can offset IGST, then CGST, then SGST
2. CGST credit can offset CGST, then IGST
3. SGST credit can offset SGST, then IGST (cannot offset CGST)

### 1.10 Credit Notes and Debit Notes

**Credit Note**: Issued by supplier when taxable value/tax is reduced (returns, discounts post-invoice, deficiency in service). Reduces supplier's output tax liability and buyer's ITC.

**Debit Note**: Issued by supplier when taxable value/tax is increased (price revision, short supply). Increases output tax liability and buyer's eligible ITC.

Both must reference the original invoice number and date. Time limit: financial year end or date of filing GSTR-9 for that year, whichever is earlier.

### 1.11 Reverse Charge Mechanism (RCM)

Under RCM, the recipient of goods/services pays GST instead of the supplier. Applicable for:
- Unregistered supplier to registered recipient (for specified goods/services)
- Specific notified services: GTA (Goods Transport Agency), legal services by advocate, import of services, services from casual/non-resident taxable persons
- Recipient must issue self-invoice (since supplier is unregistered)
- ITC on RCM payment available only if used for business purposes

### 1.12 Invoice Time Limits

| Scenario | Time Limit for Invoice |
|----------|------------------------|
| Supply of goods (normal case) | Before or at time of removal/delivery |
| Continuous supply of goods | Before or at the time of issue of statement of accounts |
| Supply of services (normal case) | Within 30 days of supply |
| Supply of services (banking/insurance/telecom) | Within 45 days of supply |
| Export (goods) | Before or at time of removal for export |

---

## 2. Invoice Types

### 2.1 Tax Invoice

The primary document for a GST-registered supplier. Must be issued for all taxable supplies. Contains all mandatory GST fields (see Section 10). Two copies: original for buyer, duplicate for transporter, triplicate for supplier (though digital invoices often serve all three). Required for ITC claims by the buyer.

### 2.2 Bill of Supply

Issued instead of a tax invoice in two cases:
1. Supplier is under Composition Scheme (cannot collect GST)
2. Supply is exempt from GST

Must state: "Bill of Supply — Goods/Services are exempt from GST" or equivalent. Buyer cannot claim ITC from a Bill of Supply.

### 2.3 Proforma Invoice

A non-binding, pre-sale document sent to a buyer before the actual sale is confirmed. Used for:
- Getting buyer approval on price/quantity
- Customs and import clearance (to estimate duties)
- Opening Letter of Credit (LC)

Not a legal GST document — cannot be used for ITC. No invoice number required (or a provisional number used). Must be clearly marked "PROFORMA INVOICE."

### 2.4 Delivery Challan

Issued for movement of goods not constituting a supply (no sale), or where invoice is issued later:
- Job work (goods sent to worker)
- Goods sent on approval/sale-or-return basis
- Exhibition samples
- Liquid gas (quantity not determined at dispatch)

Contains: challan number, date, consignor/consignee details, goods description, quantity, HSN, e-Way bill reference if applicable. Does not contain GST amount.

### 2.5 Receipt Voucher

Issued when a supplier receives advance payment before supply of goods/services. Mandatory under GST if advance is received. Must mention: amount received, applicable GST rate (if determinable), SAC/HSN (if known). Tax Invoice is issued at the time of actual supply and the advance is adjusted.

### 2.6 Credit Note

Reduces an already-issued tax invoice. Scenarios: goods returned, post-sale discount, price reduction, deficiency in services. Must reference original invoice. Reduces supplier's tax liability in GSTR-1 and reduces buyer's ITC in GSTR-2B.

### 2.7 Debit Note

Increases an already-issued tax invoice. Scenarios: additional charges discovered post-invoice, quantity shortfall that was billed more (rare), price revision upward. Increases supplier's tax liability and buyer's ITC.

### 2.8 Self-Invoice (RCM Invoice)

When a registered person purchases from an unregistered supplier and RCM applies, the registered buyer must issue a self-invoice. Contains all regular tax invoice fields but supplier details are the unregistered vendor's details, and the tax is paid by the buyer.

### 2.9 Export Invoice

Issued for exports. Two types:
- **Export with payment of tax (LUT not filed)**: Tax is paid and later refunded
- **Export under LUT/Bond (zero-rated)**: No tax charged, "Supply meant for export under LUT/Bond, IGST not paid" stated on invoice

Must contain: shipping bill number, port code, country of destination, currency, exchange rate, foreign currency amount.

---

## 3. Payment Terms and Collection

### 3.1 Common Payment Terms in Indian SME Transactions

| Term | Meaning | Typical Usage |
|------|---------|---------------|
| COD | Cash on Delivery | Retail, D2C e-commerce |
| Advance / Prepaid | Full payment before supply | Job work, custom orders |
| Net 15 / Net 30 / Net 45 / Net 60 | Payment due within N days of invoice | B2B wholesale, distributors |
| 2/10 Net 30 | 2% discount if paid in 10 days, else net 30 | Encourages early payment |
| PDC | Post-Dated Cheque — cheque dated for future | Construction, real estate, large orders |
| Running Account / Monthly Statement | Bill sent monthly, payment against statement | Long-term supplier relationships |
| LC (Letter of Credit) | Bank guarantee of payment | Large exports, new B2B relationships |
| DA (Documents Against Acceptance) | Documents released on buyer's acceptance | Export trade |
| DP (Documents Against Payment) | Documents released only on payment | Export trade (safer for exporter) |

### 3.2 TDS (Tax Deducted at Source) in Business Transactions

- TDS under Income Tax Act (not GST) is deducted by certain categories of payers
- TDS under GST Section 51: government departments and specified entities deduct 2% TDS (1% CGST + 1% SGST or 2% IGST) on payments above Rs. 2.5 lakh to registered suppliers
- Supplier must reconcile TDS credits in GSTR-2B / Form 26AS / AIS
- Professional service providers (CA, lawyers, consultants) commonly face TDS under Section 194J (10%)
- Rent payments above Rs. 2.4 lakh/year: TDS at 10% under 194-I

### 3.3 MSME Payment Protection (MSMED Act 2006)

Critical for small suppliers:
- Buyer must pay MSME supplier within **45 days** of acceptance of goods/services (or as agreed, maximum 45 days)
- If no agreement, payment due within **15 days**
- Delayed payment attracts compound interest at **3x RBI bank rate** (currently ~15-18% p.a.)
- Buyers with turnover > Rs. 45 crore must file MSME Form I (half-yearly) disclosing dues outstanding > 45 days
- Since FY 2023-24: payments to MSMEs disallowed as business expense until actually paid (Section 43B(h) amendment)

### 3.4 UPI, NEFT, RTGS in Business Context

| Method | Limit | Settlement | Best For |
|--------|-------|-----------|---------|
| UPI (Unified Payments Interface) | Rs. 1-2 lakh per transaction | Real-time | Retail, small B2B, daily collections |
| IMPS | Rs. 5 lakh per transaction | Real-time | Medium transactions |
| NEFT | No limit (bank may set) | Hourly batches | Supplier payments, payroll |
| RTGS | Min Rs. 2 lakh, no max | Real-time | Large B2B, property, bulk payments |
| Cheque | No digital limit | 2-3 working days (CTS) | Traditional, PDC |
| DD (Demand Draft) | No limit | 2-3 days | Government, educational institutions |

Sound Box / UPI Payment Notification: Most kirana stores now use Paytm/PhonePe/BHIM sound boxes that announce payment amounts audibly when a customer pays via UPI.

---

## 4. SME Segments and Their Software Needs

### 4.1 Kirana / Retail (B2C Focus)

**Business profile**: Grocery/FMCG retail, daily turnover Rs. 5,000–2,00,000, mostly cash + UPI transactions, walk-in customers, no credit tracking for retail, some credit for known customers (udhari/khata).

**Software requirements**:
- Fast POS billing (barcode scan or name search), must work on Android tablet/phone
- UPI sound box integration — payment auto-recorded
- Khata / credit book for regular customers
- Daily cash report, close-of-day reconciliation
- Stock alert (low stock notification)
- GST handling mostly B2CS (consumer sales) — GSTR-3B summary sufficient
- Thermal printer support (58mm or 80mm)
- Works offline (local storage) with cloud sync when internet available
- Multilingual: Hindi/regional language interface

**Pain points with existing software**: Tally too complex, Vyapar better but still has learning curve, many shop owners use physical ledger + WhatsApp for payment confirmations.

### 4.2 Trading / Wholesale (B2B Focus)

**Business profile**: Distributor or wholesaler, turnover Rs. 50 lakh–10 crore, mix of registered and unregistered buyers, credit sales common (30–60 day credit), multiple product categories.

**Software requirements**:
- B2B invoicing with buyer GSTIN, automatic IGST/SGST-CGST split
- Accounts receivable aging report (who owes how much, how overdue)
- Salesman-wise sales report
- Party ledger (individual account statement for each buyer)
- GSTR-1 export (B2B section with GSTIN-wise invoice details)
- E-Way bill generation or integration
- Discount management: trade discount, cash discount, scheme discount
- Multiple warehouses / godowns
- Price list management (different prices for different customer tiers)
- Credit limit enforcement (block new sales if credit limit exceeded)
- Outstanding payment reminders (WhatsApp/SMS)

### 4.3 Manufacturing (Production + Purchase + Sales)

**Business profile**: Small factory, turnover Rs. 25 lakh–5 crore, raw material purchase → production → finished goods sale. Job work common.

**Software requirements**:
- Bill of Materials (BOM) — how much raw material per finished product
- Production order and job work tracking
- Raw material vs. finished goods inventory (separate)
- Job work challan (delivery challan for goods sent to worker)
- Purchase order → Goods Receipt Note (GRN) → purchase invoice workflow
- ITC on raw material purchases
- Cost of production report
- Multiple units of measure (kg to boxes, meters to pieces)
- Scrap/wastage tracking

### 4.4 Service Businesses (Professional Services, Repairs, etc.)

**Business profile**: IT firm, CA, consultant, repair shop, salon. Turnover Rs. 5 lakh–2 crore. Time-based or project-based billing.

**Software requirements**:
- Service invoice with SAC code
- Project/job-wise billing (hourly or fixed price)
- Proforma invoice → advance receipt → final invoice workflow
- TDS deduction tracking (client deducts, need to reconcile with 26AS)
- Expense tracking against projects
- Subscription / recurring invoices
- GSTR-1 (B2B services) + GSTR-3B
- For exports: LUT filing, zero-rated invoice, foreign currency handling

### 4.5 Restaurant / Food Service

**Business profile**: Restaurant, cloud kitchen, catering. Mostly B2C but some B2B (corporate catering). Special GST rates.

**Software requirements**:
- GST rate: 5% (no ITC) for most restaurants; 18% (with ITC) for hotel restaurants with room tariff > Rs. 7,500
- Composition scheme available (5% on turnover, no ITC)
- KOT (Kitchen Order Ticket) management
- Table management, split billing
- Swiggy/Zomato reconciliation (aggregator collects and remits, TCS deducted)
- Takeaway vs. dine-in vs. delivery tracking
- Recipe / ingredient consumption tracking
- Waste tracking
- Zomato/Swiggy TCS (Tax Collected at Source) at 0.5% — affects GST liability

---

## 5. Accounting Terms Reference

### 5.1 Books of Accounts

| Term | Definition |
|------|-----------|
| **Ledger** | Master account book with all transactions grouped by account head (e.g., "Sales Account", "Rent Expense"). Each account has a running debit/credit balance. |
| **Day Book / Journal** | Chronological record of all transactions before posting to ledger. Also called "Journal." |
| **Cash Book** | Records all cash and bank receipts/payments. Combines journal and ledger for cash/bank. Often has separate columns for cash, bank, and discount. |
| **Purchase Register** | All purchase invoices received, with GST breakup. Used for ITC claims. |
| **Sales Register** | All sales invoices issued, with GST breakup. Used for GSTR-1. |
| **Debtors Ledger** | Individual accounts for each customer who owes money. |
| **Creditors Ledger** | Individual accounts for each supplier to whom money is owed. |

### 5.2 Financial Statements

| Statement | Description |
|-----------|-------------|
| **Trial Balance** | List of all ledger account balances (debit and credit). Used to verify that total debits = total credits. Prepared before financial statements. |
| **Profit & Loss Account (P&L)** | Income - Expenses = Net Profit/Loss for a period. Trading Account shows gross profit (Sales - COGS). P&L shows net profit after all expenses. |
| **Balance Sheet** | Snapshot of Assets = Liabilities + Equity at a point in time. |
| **Cash Flow Statement** | Movement of cash: operating, investing, financing activities. |

### 5.3 Common Account Heads

| Term | Meaning |
|------|---------|
| **Sundry Debtors** | Collective term for all customers who owe money (accounts receivable). |
| **Sundry Creditors** | Collective term for all suppliers to whom money is owed (accounts payable). |
| **Capital Account** | Owner's investment in the business. |
| **Drawings** | Money taken out by proprietor for personal use. |
| **Closing Stock** | Value of inventory at end of period. |
| **Opening Stock** | Value of inventory at start of period. |
| **COGS / Cost of Goods Sold** | Opening Stock + Purchases - Closing Stock. |

### 5.4 GST-Specific Accounting Terms

| Term | Meaning |
|------|---------|
| **ITC (Input Tax Credit)** | GST paid on purchases, eligible for set-off against GST collected on sales. |
| **Output Tax** | GST collected on sales (liability). |
| **Electronic Credit Ledger** | GSTN ledger reflecting ITC balance available for set-off. |
| **Electronic Cash Ledger** | GSTN ledger reflecting cash deposited for GST payment. |
| **Electronic Liability Ledger** | GSTN ledger reflecting tax liabilities created. |
| **GSTR-2B** | Auto-populated ITC statement generated from suppliers' GSTR-1. |

### 5.5 Inventory Valuation

| Method | Description | Used When |
|--------|-------------|-----------|
| **FIFO** (First In, First Out) | Oldest stock sold first. Closing stock at latest prices. | Perishables, electronics |
| **LIFO** (Last In, First Out) | Latest stock sold first. Not permitted under Indian GAAP/Ind AS for financial reporting but used for management reports. | Rising price environments |
| **Weighted Average** | Average cost of all units. Most common in Indian SMEs. | Homogeneous goods |
| **Specific Identification** | Actual cost of specific item. | High-value unique items (jewellery, vehicles) |

### 5.6 TDS Accounting

- **TDS Payable**: When paying salary, rent, professional fees above threshold, TDS deducted must be deposited with government by 7th of next month.
- **TDS Receivable**: When TDS is deducted by clients on payments to you, it appears as an asset (prepaid tax) to be adjusted against income tax liability.
- TDS returns: Form 24Q (salary), 26Q (non-salary), 27Q (non-residents), filed quarterly.

---

## 6. Tally.ERP Workflow

### 6.1 Overview

Tally.ERP 9 (now TallyPrime) is the dominant accounting software for Indian SMEs, with an estimated 60-70% market share in desktop accounting. It follows a voucher-based entry system with double-entry bookkeeping.

### 6.2 Voucher Types in Tally

| Voucher Type | Shortcut | Purpose |
|--------------|----------|---------|
| Sales | F8 | Record sales invoice |
| Purchase | F9 | Record purchase invoice |
| Receipt | F6 | Record payment received from customer |
| Payment | F5 | Record payment made to supplier |
| Journal | F7 | Adjustments, depreciation, provisions |
| Contra | F4 | Cash-to-bank, bank-to-cash transfers |
| Debit Note | Ctrl+F9 | Returns to supplier, debit to creditor |
| Credit Note | Ctrl+F8 | Returns from customer, credit to debtor |

### 6.3 Typical Tally Workflow for a Trading Business

1. **Create Masters**: Ledger accounts (customers, suppliers, expense heads), Stock Groups, Stock Items (with HSN/GST rate), Units of Measure, Price Levels
2. **Daily Sales**: F8 → select party → select stock items → auto-calculates GST → print invoice
3. **Daily Purchases**: F9 → select supplier → enter items → ITC auto-posts
4. **Receipts**: F6 → select party → enter amount → outstanding invoice auto-adjusted
5. **Bank Reconciliation**: Compare Tally bank ledger with bank statement
6. **GST Reports**: Display → GST Reports → GSTR-1, GSTR-3B → export JSON for filing
7. **Payroll**: Wage ledger entries, TDS calculation, Form 16 generation
8. **Year-End**: Profit & Loss, Balance Sheet, stock audit

### 6.4 Tally Strengths

- Complete double-entry accounting (not just invoicing)
- Mature GST compliance (all return formats)
- Payroll module
- Multi-currency, multi-company
- Strong audit trail
- Works offline (local data file)
- 30+ years of ecosystem (trained accountants everywhere)

### 6.5 Why SMEs Are Migrating Away from Tally

- Steep learning curve — requires trained accountant (cost Rs. 15,000–40,000/month)
- Desktop-only (TallyPrime has limited web/mobile)
- Expensive license (Rs. 18,000–54,000/year)
- Not intuitive for owner-operators
- No real-time mobile access for business owner
- WhatsApp/UPI integration absent
- Modern UI absent — still function-key driven
- Cloud version (TallyPrime 4.0+) still catching up

---

## 7. Vyapar and Khatabook

### 7.1 Vyapar

**Target**: Small traders, shopkeepers, freelancers in India. Mobile-first.

**Strengths**:
- Android + Windows app, easy to use
- GST-compliant invoicing (Tax Invoice, Bill of Supply, Delivery Challan)
- GSTR-1 / GSTR-3B basic export
- Inventory management
- Party ledger and outstanding reports
- Bank account reconciliation (basic)
- Proforma invoice, purchase order
- Cheaper than Tally (Rs. 3,499–6,999/year)
- Widely recommended by CAs for small businesses

**Gaps**:
- No real-time voice entry
- Limited multi-user / branch support
- No payroll
- Reporting limited compared to Tally
- No manufacturing / BOM
- Agent mode (AI-driven) absent
- WhatsApp integration basic

### 7.2 Khatabook

**Target**: Micro and small businesses for credit/udhari tracking (digital khata).

**Strengths**:
- Extremely simple — designed for zero-tech owners
- Credit tracking (khata) is the core — who owes how much
- SMS / WhatsApp reminders to debtors
- 10+ regional language support
- Works in 2G conditions
- Free tier very generous
- 10 million+ businesses use it

**Gaps**:
- Not a full GST billing software — primarily a credit ledger
- No inventory management
- No formal invoice generation (basic receipt only)
- No ITC tracking
- No GSTR export
- No P&L or Balance Sheet

### 7.3 Positioning Summary

| Feature | Tally | Vyapar | Khatabook | Execora Target |
|---------|-------|--------|-----------|----------------|
| Full accounting | Yes | Partial | No | Partial (P1) |
| GST invoicing | Yes | Yes | No | Yes (P0) |
| Voice entry | No | No | No | Yes (core) |
| Mobile-first | No | Yes | Yes | Yes |
| Inventory | Yes | Yes | No | Yes |
| Credit (khata) | Yes | Yes | Yes | Yes |
| AI/Agent mode | No | No | No | Planned (P2) |
| Regional language | Limited | Limited | 10+ | Hindi+regional |
| Price | High | Medium | Free/Low | SaaS mid-tier |

---

## 8. GST Filing Workflow

### 8.1 GSTR-1: Outward Supply Return

Filed monthly (11th of next month) or quarterly under QRMP scheme (13th of month after quarter end).

**Sections of GSTR-1**:

| Table | Content |
|-------|---------|
| 4 | B2B supplies (taxable, with GSTIN of recipient) |
| 5 | B2C Large (inter-state, value > Rs. 2.5 lakh, without GSTIN) |
| 6 | Zero-rated and deemed exports |
| 7 | B2C Others (intra-state B2C, inter-state B2C < Rs. 2.5 lakh) — consolidated by state |
| 8 | Nil-rated, exempt, non-GST supplies |
| 9 | Amendments to B2B of previous period |
| 10 | Amendments to B2C Large |
| 11 | Advances received (for services) and adjustments |
| 12 | HSN-wise summary of outward supplies |
| 13 | Documents issued (invoice series) |

**B2B Entry (Table 4) fields per invoice**:
- Recipient GSTIN
- Invoice number, date
- Invoice value
- Place of Supply (state code)
- Applicable % (IGST or CGST/SGST rate)
- Taxable value, IGST, CGST, SGST, Cess
- Reverse charge applicable (Y/N)
- Invoice type (Regular, SEZ with payment, SEZ without payment, Deemed export)

### 8.2 GSTR-3B: Monthly Summary Return

Summary self-assessment return filed along with tax payment.

| Section | Content |
|---------|---------|
| 3.1 | Outward supplies summary (taxable, zero-rated, nil-rated, exempt, non-GST) |
| 3.2 | Inter-state supplies to unregistered, composition, UIN holders |
| 4 | ITC available — details of input tax credit |
| 5 | Exempt, nil, non-GST inward supplies |
| 5.1 | Interest and late fee |
| 6 | Tax payable and paid |

**Tax payment in GSTR-3B**:
- Offset ITC from Electronic Credit Ledger first
- Remaining liability paid via Electronic Cash Ledger (using challan PMT-06)
- IGST, CGST, SGST paid separately — cross utilisation has rules (see Section 1.9)

### 8.3 Filing Deadlines and Late Fees

| Return | Due Date | Late Fee |
|--------|----------|---------|
| GSTR-1 (monthly) | 11th of next month | Rs. 50/day (Rs. 20/day if nil return), max Rs. 10,000 |
| GSTR-3B | 20th of next month (22nd/24th for quarterly) | Rs. 50/day (Rs. 20/day if nil), + interest 18% p.a. on unpaid tax |
| GSTR-9 | 31st December of next FY | Rs. 200/day, max 0.25% of turnover |

Interest on late payment: 18% per annum on unpaid tax; 24% p.a. on excess ITC claimed.

### 8.4 JSON Schema for GSTR-1 Upload

GSTN portal accepts JSON in a specific format for bulk upload. Key structure:

```json
{
  "gstin": "27XXXXX1234Z5",
  "fp": "032025",
  "b2b": [
    {
      "ctin": "29YYYYY5678A1Z",
      "inv": [
        {
          "inum": "INV-001",
          "idt": "01-03-2025",
          "val": 118000,
          "pos": "29",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 100000,
                "rt": 18,
                "iamt": 18000,
                "csamt": 0
              }
            }
          ]
        }
      ]
    }
  ],
  "b2cs": [...],
  "hsn": {...}
}
```

Most accounting software exports this JSON directly; the taxpayer uploads it to GSTN portal or uses GST Suvidha Provider (GSP) API.

### 8.5 QRMP Scheme (Quarterly Return Monthly Payment)

Taxpayers with AATO up to Rs. 5 crore can file GSTR-1 and GSTR-3B quarterly but pay tax monthly via PMT-06 challan. First two months of quarter: pay challon (fixed sum = 35% of last filed quarterly tax). Third month: file return with actual tax.

---

## 9. Business Reports Required

### 9.1 Daily Reports

| Report | Content | Used By |
|--------|---------|---------|
| Day Book / Daily Sales Report | All transactions of the day, total sales, cash received, credit sales | Owner, counter staff |
| Cash Position | Opening cash + receipts - payments = closing cash | Owner |
| UPI/Bank Collections | All digital payments received | Owner |
| Pending Orders | Orders accepted, not yet fulfilled | Operations |
| Low Stock Alert | Items below reorder level | Purchase team |
| Outstanding Dues (new today) | New overdue invoices | Owner |

### 9.2 Weekly Reports

| Report | Content |
|--------|---------|
| Sales by Category / Product | Which items are moving, revenue by segment |
| Collection Efficiency | Invoices issued vs. collected in the week |
| Expense Summary | Weekly operating expenses |
| Top Customers (by sales) | Who drove the most revenue |
| New Customer Acquisitions | How many new buyers this week |

### 9.3 Monthly Reports

| Report | Content |
|--------|---------|
| P&L Statement | Revenue, COGS, Gross Profit, Expenses, Net Profit |
| Party Ledger (Debtors Aging) | 0-30, 31-60, 61-90, 90+ days outstanding |
| Party Ledger (Creditors Aging) | What is owed to suppliers, by age |
| GSTR-1 Summary | Outward supply report for GST filing |
| GSTR-3B Draft | Self-assessment for tax payment |
| Inventory Valuation Report | Stock value by item/category |
| Salesman Performance | Sales by salesperson |
| Purchase Summary | Total purchases, top suppliers, ITC available |

### 9.4 Quarterly Reports

| Report | Content |
|--------|---------|
| Comparative P&L | This quarter vs. last quarter vs. same quarter last year |
| Customer Retention | Repeat vs. new customers |
| Slow-Moving Inventory | Items with no or low movement |
| TDS Summary | TDS deducted (to remit) and TDS receivable (to reconcile with 26AS) |
| GST ITC Reconciliation | GSTR-2B vs. books — any mismatches |

### 9.5 Annual Reports

| Report | Content |
|--------|---------|
| Annual P&L | Full year income statement |
| Balance Sheet | Assets, liabilities, net worth |
| GSTR-9 Data | Annual return workings |
| Stock Audit Report | Physical vs. book stock reconciliation |
| Fixed Asset Register | All assets, depreciation, book value |
| Top 10 Customers / Suppliers | Key relationships by volume |
| Year-on-Year Growth | Revenue, profit, customer count compared to prior year |

---

## 10. Complete Invoice Field Reference

This section lists every field that appears on a valid Indian GST Tax Invoice, along with its requirement status, validation rules, and notes.

### 10.1 Supplier Details

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Supplier Legal Name | Yes | As per GST registration certificate |
| Supplier Trade Name | Optional | If different from legal name |
| Supplier GSTIN | Yes | 15-character alphanumeric. Format: 2-digit state code + 10-char PAN + 1-char entity + 1-char Z (default) + 1-char checksum |
| Supplier Address (Line 1) | Yes | Building/premise number and name |
| Supplier Address (Line 2) | Optional | Street, locality |
| Supplier City | Yes | |
| Supplier State | Yes | Both name and 2-digit state code |
| Supplier PIN Code | Yes | 6-digit postal code |
| Supplier Phone | Recommended | |
| Supplier Email | Recommended | |
| Supplier PAN | Yes (on e-invoice) | Embedded in GSTIN but sometimes stated separately |
| Supplier Website | Optional | |
| Supplier Bank Details | Recommended | Account no., IFSC, bank name — for payment |
| Supplier Logo | Optional | For printed invoices |

### 10.2 Recipient / Buyer Details

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Recipient Name | Yes | Legal name if registered, trade name acceptable for B2C |
| Recipient GSTIN | Yes (B2B) | Required for buyer to claim ITC. Not required for B2C. |
| Recipient Address | Yes | Complete billing address |
| Recipient State | Yes | State code important for IGST/CGST+SGST determination |
| Recipient PIN Code | Yes | |
| Recipient Phone | Recommended | For delivery, communication |
| Recipient Email | Recommended | For e-invoice delivery |
| Shipping Address | If different | Consignee name + address if goods delivered elsewhere |
| Shipping GSTIN | If different | If goods delivered to a different registered location |
| Buyer's PO Number | Optional | Reference for corporate buyers |

### 10.3 Invoice Identification

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Invoice Number | Yes | Sequential, unique. Cannot be re-used. Common format: PREFIX-FY-SEQUENCE e.g., INV-2526-001 |
| Invoice Date | Yes | Date of supply or date of removal of goods |
| Invoice Type | Yes (e-invoice) | Regular, SEZ supplies, Exports, Deemed exports |
| Original Invoice Reference | Yes (for credit/debit notes) | Must reference the invoice being amended |
| Reverse Charge (Y/N) | Yes | Whether RCM applies |
| Place of Supply | Yes | State where supply is deemed to occur. Determines IGST vs. CGST+SGST. |
| Due Date | Recommended | Payment due date |
| Delivery Date | Recommended | For goods |
| Currency | Yes (exports) | INR for domestic; foreign currency for exports |
| Exchange Rate | Yes (exports) | RBI reference rate on invoice date |

### 10.4 E-Invoice Specific Fields

| Field | Mandatory (if e-invoice) | Notes |
|-------|--------------------------|-------|
| IRN (Invoice Reference Number) | Yes | 64-character SHA-256 hash generated by IRP |
| Acknowledgement Number | Yes | IRP acknowledgement number |
| Acknowledgement Date | Yes | Date and time of IRP acknowledgement |
| QR Code | Yes | Must be printed on invoice — contains IRN + key invoice details |
| Signed QR Code | Yes | Digitally signed by NIC/IRP |
| e-Way Bill Number | If applicable | EWB number if generated alongside e-invoice |

### 10.5 Line Item Fields (per item)

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Sl. No. | Yes | Sequential item number |
| Description of Goods/Services | Yes | Clear description; more detail avoids disputes |
| HSN Code (goods) / SAC Code (services) | Yes | 4-digit (turnover < 5 Cr) or 6-digit (> 5 Cr) |
| Unit of Measure (UOM) | Yes | NOS, KG, MTR, LTR, BOX, SET, etc. |
| Quantity | Yes | |
| Unit Price (Rate) | Yes | Price per unit before GST |
| Gross Amount | Yes | Quantity × Unit Price |
| Discount | If applicable | Amount or percentage; shown separately |
| Taxable Value | Yes | Gross Amount - Discount |
| GST Rate | Yes | 0%, 5%, 12%, 18%, 28%, etc. |
| CGST Rate and Amount | Yes (intra-state) | |
| SGST Rate and Amount | Yes (intra-state) | |
| IGST Rate and Amount | Yes (inter-state) | |
| Cess Rate and Amount | If applicable | For notified goods (tobacco, vehicles, etc.) |
| Total Item Value (incl. GST) | Recommended | |
| Batch Number | For applicable items | Pharma, FMCG — batch + expiry mandatory |
| Expiry Date | For applicable items | |
| Serial Number | For applicable items | Electronics, machinery |
| Warranty Period | Optional | |

### 10.6 Invoice Totals

| Field | Mandatory | Notes |
|-------|-----------|-------|
| Total Taxable Value | Yes | Sum of all line item taxable values |
| Total CGST | Yes (intra-state) | |
| Total SGST | Yes (intra-state) | |
| Total IGST | Yes (inter-state) | |
| Total Cess | If applicable | |
| Total GST Amount | Yes | CGST + SGST or IGST + Cess |
| Round Off | Optional | Should be ±Rs. 1 maximum |
| Invoice Total (Gross) | Yes | Taxable value + Total GST |
| Amount in Words | Yes | Legal requirement — "Rupees One Lakh Eighteen Thousand Only" |
| Advance Received | If applicable | Amount paid earlier (receipt voucher reference) |
| Balance Payable | Recommended | Invoice Total - Advance |

### 10.7 Transport / Logistics Fields

| Field | When Needed | Notes |
|-------|-------------|-------|
| Mode of Transport | E-Way Bill | Road / Rail / Air / Ship |
| Vehicle Number | E-Way Bill (road) | |
| Transporter Name | If applicable | |
| Transporter GSTIN | If applicable | |
| LR/RR Number | Optional | Lorry receipt / Railway receipt number |
| E-Way Bill Number | Mandatory if applicable | Generated separately; reference on invoice |
| Port Code | Export invoices | 6-character ICEGATE port code |
| Shipping Bill Number | Export invoices | |
| Shipping Bill Date | Export invoices | |
| Country of Destination | Export invoices | |

### 10.8 Declarations and Signatures

| Field | Requirement |
|-------|------------|
| "Tax is payable on Reverse Charge" | Mandatory if RCM applies |
| "This is a Computer Generated Invoice" | Optional but common |
| LUT/Bond Number | Mandatory for export without GST payment |
| Authorised Signatory Name | Required on printed invoices |
| Authorised Signatory Designation | Recommended |
| Digital Signature | Required for e-invoice (done by IRP, not supplier) |
| FSSAI License Number | Mandatory for food businesses |
| Drug License Number | Mandatory for pharma businesses |
| RERA Registration | Mandatory for real estate |

### 10.9 State Code Reference (Selected)

| Code | State/UT |
|------|---------|
| 01 | Jammu & Kashmir |
| 06 | Haryana |
| 07 | Delhi |
| 08 | Rajasthan |
| 09 | Uttar Pradesh |
| 10 | Bihar |
| 19 | West Bengal |
| 24 | Gujarat |
| 27 | Maharashtra |
| 29 | Karnataka |
| 32 | Kerala |
| 33 | Tamil Nadu |
| 36 | Telangana |
| 37 | Andhra Pradesh |

Full list of 38 state/UT codes is standardised by GSTN and must be used in Place of Supply and GSTR-1 filings.

### 10.10 GSTIN Validation Rules

Format: `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`

- Characters 1-2: State code (01–38)
- Characters 3-12: PAN of the taxpayer (10 chars)
- Character 13: Entity number (for multiple registrations of same PAN in a state) — 1 to 9, then A onwards
- Character 14: Always 'Z' (default)
- Character 15: Checksum digit

Validation should check: length = 15, state code valid (01-38), PAN format valid, checksum correct.

---

## Appendix: Quick Reference Numbers

| Item | Value |
|------|-------|
| GST registration threshold (goods, normal states) | Rs. 40 lakh/year |
| GST registration threshold (services) | Rs. 20 lakh/year |
| Composition scheme turnover limit (goods) | Rs. 1.5 crore |
| E-invoice mandatory threshold | Rs. 5 crore AATO |
| E-Way bill threshold | Rs. 50,000 per consignment |
| MSME payment deadline | 45 days (max) |
| RCM threshold (unregistered purchases) | Any value for notified goods/services |
| GSTR-1 monthly due date | 11th of next month |
| GSTR-3B due date | 20th of next month |
| Late fee (non-nil GSTR-1) | Rs. 50/day |
| Interest on late GST payment | 18% per annum |
| TDS under GST (Section 51) | 2% on payments > Rs. 2.5 lakh |
| Financial year | April 1 – March 31 |
| GST council meeting frequency | Every 2-3 months (approximately) |

---

*This document reflects GST rules and SME billing practices as of FY 2025-26. GST council notifications may update rates, thresholds, and procedures. Always verify current thresholds on gstn.gov.in and cbic.gov.in before implementation.*

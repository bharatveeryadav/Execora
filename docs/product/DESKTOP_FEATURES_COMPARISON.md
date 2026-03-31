> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora Desktop Features — Comparison & Gap Analysis
## Current vs Spec vs Competitors | March 2026

---

## 1. Execora Desktop Sidebar (Current)

**Layout**: Left sidebar (collapsible to icon), ≥768px only. Mobile uses BottomNav.

### Main Section
| Item | Path | Status | Notes |
|------|------|--------|-------|
| Home | `/` | ✅ | Dashboard with KPIs, health score, AI feed, quick actions |
| New Bill | modal | ✅ | Opens InvoiceCreation (voice + form) |
| Parties | `/parties` | ✅ | Customers + Suppliers tabs |
| Items | `/inventory` | ✅ | Products + stock |
| Bills | `/invoices` | ✅ | Invoice list |
| Classic Bill | `/billing` | ✅ | Form-based billing |
| Record Payment | `/payment` | ✅ | Record payments |

### Reports & More Section
| Item | Path | Status | Notes |
|------|------|--------|-------|
| Reports | `/reports` | ✅ | P&L, GSTR-1, Overdue aging, Sales by month |
| Overdue | `/overdue` | ✅ | Payment reminders, WhatsApp send |
| Day Book | `/daybook` | ✅ | Ledger view |
| Cash Book | `/cashbook` | ✅ | Cash in/out |
| Expenses | `/expenses` | ✅ | Operating expenses |
| Purchases | `/purchases` | ✅ | Purchase bills |
| Expiry | `/expiry` | ✅ | Product expiry alerts |
| Recurring | `/recurring` | ✅ | Recurring invoices |
| Balance Sheet | `/balance-sheet` | ✅ | Balance sheet |
| Bank Recon | `/bank-reconciliation` | ⚠️ | **UI only** — uses `parseCsvMock`, no backend |
| Import Data | `/import` | ✅ | CSV import (customers, products, invoices, expenses) |
| E-Invoice | `/einvoicing` | ⚠️ | **UI + sandbox** — IRN flow exists, backend may be sandbox |
| GSTR-3B | `/gstr3b` | ✅ | Monthly summary, filing status |

### Footer
| Item | Path | Status |
|------|------|--------|
| Settings | `/settings` | ✅ |

### Additional Desktop Features
- **Global Search** (Ctrl+K) — Search customers, invoices, products
- **Sidebar collapse** — Icon-only mode
- **Keyboard shortcut** — `shortcut:new-invoice` for New Bill

---

## 2. PRODUCT_STRATEGY_2026 Spec vs Current

| Spec Item | Current | Gap |
|-----------|---------|-----|
| Dashboard | ✅ Index | — |
| Invoices | ✅ Bills | — |
| Quick Bill | ✅ Classic Bill | — |
| Customers | ✅ Parties | — |
| Inventory | ✅ Items | — |
| Payments | ✅ Record Payment | — |
| Ledger | ✅ Day Book + Cash Book | — |
| Reports | ✅ | — |
| Purchases | ✅ | — |
| Expenses | ✅ | — |
| GST/GSTR | ✅ Reports + GSTR-3B | — |
| Reminders | ✅ Overdue | — |
| Recurring | ✅ | — |
| **Voice** | ⚠️ | No dedicated Voice panel. Voice lives inside InvoiceCreation modal (New Bill). Spec has "Voice" in Tools. |
| **OCR Import** | ❌ | Not in sidebar. Import Data = CSV only. No photo → products. |
| **Import Data** | ✅ | — |
| **Profile** | ❌ | No Profile link. Settings covers business profile. |
| **Bank account in Settings** | ❌ | S14-02: `bankAccount` on Tenant, IFSC/Account# on PDF |
| **Terms & Conditions** | ❌ | S14-09: `termsAndConditions` on Tenant |

---

## 3. Competitor Comparison

### Vyapar (Desktop)
| Feature | Vyapar | Execora |
|---------|--------|---------|
| Layout | Windows native, left sidebar | Web, left sidebar |
| Navigation | Home, Sales, Purchase, Party, Reports | Home, New Bill, Parties, Items, Bills, Classic Bill, Record Payment + Reports & More |
| Offline | ✅ Full | ❌ (P0 gap) |
| Voice | ❌ | ✅ |
| Real-time sync | ❌ | ✅ WebSocket |
| Web app | ❌ | ✅ |
| E-invoicing | ✅ | ⚠️ UI/sandbox |

### myBillBook (Desktop Web)
| Feature | myBillBook | Execora |
|---------|------------|---------|
| Layout | Modern SaaS, card-based | Sidebar + content |
| Sections | Sales, Accounting, Parties, Items, Inventory, Expenses | Main + Reports & More |
| Voice | ❌ | ✅ |
| GSTR export | Web-only | ✅ Reports + GSTR-3B |
| Offline | Mobile only | ❌ |

### Swipe (Desktop Web)
| Feature | Swipe | Execora |
|---------|-------|---------|
| Layout | Clean modern SaaS | Sidebar + content |
| E-invoicing | ✅ | ⚠️ UI/sandbox |
| Multi-user | ✅ | ✅ RBAC |
| Offline | ❌ | ❌ |
| Voice | ❌ | ✅ |

---

## 4. Gap Summary

### Missing from Desktop Sidebar (vs Spec)
1. **Voice** — No dedicated Voice panel. Voice is inside New Bill modal. Competitors don't have voice; Execora's differentiator is embedded, not surfaced as a nav item.
2. **OCR Import** — No photo → products. PRD S13-06: OCR purchase bill. No "OCR Import" nav item.
3. **Profile** — No separate Profile; Settings covers it.

### Skeleton / Placeholder Pages
| Page | Backend | Notes |
|------|---------|-------|
| Bank Reconciliation | Mock | `parseCsvMock` — no real CSV parse, no match API |
| E-Invoicing | Sandbox? | IRN flow UI; verify NIC/GSP integration |

### Settings Gaps (from Spec)
- ~~Bank account (IFSC, A/C #)~~ ✅ S14-02 — Built
- ~~Terms & Conditions~~ ✅ S14-09 — Built
- ~~GSTIN validation feedback~~ ✅ S11-08 — Built (checksum + UI)

---

## 5. Recommendations

| Priority | Action |
|----------|--------|
| P0 | Add Voice to sidebar (optional) — or keep as New Bill modal. Voice is discoverable via New Bill. |
| P1 | Wire Bank Reconciliation backend — S13-05. Remove mock or add "Coming soon" badge. |
| P1 | Add OCR Import nav item when S13-06 is built — or add to Import Data page as tab. |
| P2 | Add Profile link (or merge into Settings) — low value. |
| P2 | Settings: Bank account, Terms, GSTIN validation — S14-02, S14-09, S11-08 |

---

## 6. Desktop vs Mobile Parity

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Sidebar | ✅ Collapsible | ❌ BottomNav |
| Voice | Via New Bill modal | Via More → Voice |
| Global Search | ✅ Ctrl+K | Not exposed (could add) |
| All reports | ✅ | Via More drawer |
| E-Invoice, GSTR-3B | ✅ | Via More drawer |

**Conclusion**: Desktop has full feature parity with mobile. All routes exist. Bank Recon and E-Invoice need backend completion, not UI changes.

---

_Document version: 1.0 | March 2026_

# Mobile Web Parity — Sprint Plan

> Port all web app features to the React Native mobile app (`apps/mobile/`).
> **Created:** March 2026

---

## Overview

The web app (`apps/web`) has features that are not yet in the mobile app. This document tracks the sprint-wise implementation to achieve parity.

---

## Sprint 24 — Billing: Invoice Bar & Indian Standard

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Invoice bar (above customer) | ✅ | ✅ | Done |
| Invoice prefix (editable) | ✅ | ✅ | Done |
| Document date | ✅ | ✅ | Done |
| Due date presets (15/30/60/custom) | ✅ | ✅ | Done |
| Document title (Invoice / Bill of Supply) | ✅ | ✅ | Done |
| Discount type (unit price, price with tax, net, total) | ✅ | ✅ | Done |
| Walk-in quick button | ✅ | ✅ | Done |
| Split payment progress bar | ✅ | ✅ | Done |
| Price tier (Retail/Wholesale/Dealer) | ✅ | ✅ | Done |
| Billing setup collapsible | ✅ | 🔲 | Sprint 24 |

---

## Sprint 25 — Billing: Compact Items & Polish

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Compact item rows | ✅ | 🔲 | Sprint 25 |
| Modern payment mode icons | ✅ | ✅ | Done |
| "Fill ₹X" for split remaining | ✅ | ✅ | Done |
| New Invoice header | ✅ | 🔲 | Sprint 25 |

---

## Sprint 26 — Items / Inventory Parity

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Add Product modal (no window.prompt) | ✅ | ✅ | Done |
| Barcode scan in add product | ✅ | ✅ | Done |
| Price tier in item list | ✅ | 🔲 | Sprint 26 |
| Low stock filters | ✅ | ✅ | Done |

---

## Sprint 27 — Dashboard & Other Screens

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Quick actions slide-up modal | ✅ | 🔲 | Sprint 27 |
| Drill-down from KPI cards | ✅ | 🔲 | Sprint 27 |
| Daily P&L summary | ✅ | 🔲 | Sprint 27 |

---

## Sprint 28 — Settings & Profile

| Feature | Web | Mobile | Status |
|---------|-----|--------|--------|
| Invoice settings (prefix, next #, terms) | ✅ | 🔲 | Sprint 28 |
| Billing settings (GSTIN, address) | ✅ | 🔲 | Sprint 28 |
| Company profile | ✅ | Partial | Sprint 28 |

---

## Implementation Notes

- **Storage:** Use `storage` (MMKV) for invoice bar preferences. Key: `execora_invoice_bar_v1`.
- **Shared logic:** `@execora/shared` for computeTotals, amountInWords, etc.
- **Icons:** Mobile uses Ionicons; web uses Lucide. Use equivalent Ionicons.
- **Modals:** Use React Native `Modal` or `BottomSheet` for edit dialogs.

---

## Legend

- ✅ Implemented
- 🔲 Pending
- Partial — Some features done

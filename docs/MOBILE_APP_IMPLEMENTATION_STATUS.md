# Execora Mobile App — Implementation Status

**Last updated:** March 2026

This document tracks what has been **actually implemented** in `apps/mobile/` (React Native + Expo SDK 52 + React Navigation). The sprint plan in `REACT_NATIVE_SPRINT_PLAN.md` describes the target; this doc reflects current state.

---

## Implementation vs Plan

| Aspect | Plan | Actual |
|--------|------|--------|
| **Path** | `apps/native/` | `apps/mobile/` |
| **Router** | Expo Router v4 (file-based) | React Navigation (stack + tabs) |
| **Storage** | AsyncStorage | MMKV (react-native-mmkv) |
| **Tabs** | 5 (Home, Bills, +New, Parties, More) | 6 (Dashboard, Billing, Customers, Invoices, Items, More) |

---

## Completed Sprints

### Sprint 0 — Project Setup ✅
- Expo SDK 52, React Native 0.76
- NativeWind v4 (Tailwind)
- TypeScript, Babel, Metro
- QueryClient, GestureHandler, SafeAreaProvider

### Sprint 1 — Auth + Navigation Shell ✅
- Login screen (email + password)
- Token storage (MMKV)
- Tab bar: Dashboard, Billing, Customers, Invoices, Items, More
- AuthContext (login, logout, isLoggedIn)
- Auto-login via `EXPO_PUBLIC_LOGIN_EMAIL` / `EXPO_PUBLIC_LOGIN_PASSWORD`

### Sprint 2 — Design System Components ✅
| Component | Path | Status |
|-----------|------|--------|
| Button | `src/components/ui/Button.tsx` | ✅ primary, outline, ghost, danger; sm/md/lg; loading |
| Input | `src/components/ui/Input.tsx` | ✅ label, error, hint |
| Card | `src/components/ui/Card.tsx` | ✅ Card + PressableCard |
| Badge | `src/components/ui/Badge.tsx` | ✅ success, warning, danger, info, muted |
| Skeleton | `src/components/ui/Skeleton.tsx` | ✅ Pulsing loader |
| EmptyState | `src/components/ui/EmptyState.tsx` | ✅ icon, title, description, CTA |
| Chip | `src/components/ui/Chip.tsx` | ✅ Selectable filter chip |
| Header | `src/components/common/Header.tsx` | ✅ Back, title, subtitle, rightSlot |
| StatusBadge | `src/components/common/StatusBadge.tsx` | ✅ paid/pending/partial/cancelled/draft |
| AmountText | `src/components/common/AmountText.tsx` | ✅ ₹ formatted, credit/debit color |

### Sprint 2B — WebSocket Layer ✅
- `src/lib/ws.ts` — WebSocket client, reconnect, session persistence
- `src/hooks/useWsInvalidation.ts` — React Query cache invalidation from WS events
- `src/providers/WSProvider.tsx` — Connect on login, disconnect on logout
- Wired into App.tsx; used in Dashboard, Invoices, Expenses, CashBook, DayBook, Reports, Purchases, Customers, Items

### Sprint 3 — Home Dashboard ✅
- KPI cards: Today's Sales, Pending Dues, Collected Today, Collection Rate (from `summaryApi.daily()`)
- Quick actions: Quick Sale, New Bill, Payment, Stock, Invoices, Parties, Expenses, Reports
- Low stock alert strip (from `productExtApi.lowStock()`)
- Recent invoices list (tap → detail)
- Pull-to-refresh, useWsInvalidation

### Sprint 4 — Invoice List + Detail ✅
- Invoice list: status filter chips (All, Paid, Pending, Draft), + New button
- Invoice detail: full view, edit modal, cancel, WhatsApp share, send email
- useWsInvalidation on both

### Sprint 5 — Classic Billing ✅
- BillingScreen: 3-step wizard (customer → items → payment)
- Product search, customer search
- GST, discounts, payment modes

### Sprint 6 — Inventory / Products ✅
- ItemsScreen: product list, search, low/out filters
- Add product modal, inline stock adjust (+/−)
- Low-stock badge, useWsInvalidation

### Sprint 7 — Parties (Customers) ✅
- CustomersScreen: list, search, Udhaar (Overdue) link
- CustomerDetailScreen: ledger, invoices, record payment
- useWsInvalidation

### Sprint 8 — Payment Recording ✅
- PaymentScreen: customer select, amount, method, reference
- Receipt flow, navigation from CustomerDetail

### Sprint 9 — Expenses ✅
- ExpensesScreen: list, period filters (week/month), delete on long-press, **Add Expense** (BottomSheet: category, amount, vendor, note, date)
- expenseApi (list, create, remove, summary)

### Sprint 10 — Day Book + Cash Book ✅
- DayBookScreen: combined invoices, expenses, cashbook; period filters
- CashBookScreen: net cash, total in/out, transaction list
- cashbookApi, useWsInvalidation

### Sprint 11 — Reports ✅
- ReportsScreen: Revenue, Expenses, Profit, Bills count
- summaryApi.range, expenseApi.summary
- Quick report links (placeholder)

### Sprint 12 — Overdue, Recurring, Purchases ✅
- OverdueScreen: outstanding customers, aging
- RecurringScreen: placeholder
- PurchasesScreen: list, period filters, **Add Purchase** (BottomSheet: category, itemName, amount, vendor, quantity, note, date), delete on long-press

### Sprint 13 — More Screen + Settings ✅
- MoreScreen: 16-item grid (Payment, Reports, Day Book, Cash Book, Expenses, Recurring, Purchases, Overdue, Monitor, Settings, Import, GST, Balance, Aging, Alerts, Help)
- SettingsScreen: profile, theme, logout
- ComingSoonScreen: reusable placeholder for Import, GST, Balance, Aging, Alerts, Help
- MonitoringScreen: placeholder

### Sprint 15 — Native Integrations ✅
- **Barcode:** `BarcodeScanner` component, BillingScreen + ItemsScreen integration
- **Push:** expo-notifications, `POST /api/v1/push/register`, `PushDevice` model, `usePushAndDeepLinks` hook
- **Deep links:** `execora://invoices/123`, `execora://invoices`, `execora://payment?customerId=abc` → navigate to InvoiceDetail, InvoiceList, Payment

### Sprint 16 — Public Invoice Portal ✅
- `PubInvoiceScreen` — no auth, fetches from `GET /pub/invoice/:id/:token`
- Shop header, invoice no, status badge, items, tax, total, UPI Pay Now, Download PDF
- Deep link: `execora://pub/invoice/:id/:token` (works without login)

### Sprint 17 — Thermal Printing ✅
- Receipt PDF via expo-print + expo-sharing
- Thermal settings (58mm/80mm, header, footer)
- Print Receipt in BillingScreen success modal

### Sprint 18 — Offline Mode ✅
- NetInfo for connectivity
- Offline invoice queue (MMKV)
- Offline banner when disconnected
- Billing: create bills offline → queue → sync when online
- Walk-in customer handled on sync

### Sprint 19 — Polish + QA ✅
- **Haptics:** `lib/haptics.ts` — light (buttons), success (save/record), error (failures)
- Button: haptic on press; BillingScreen: success/error; PaymentScreen: success/error; BarcodeScanner: light on scan
- **ErrorCard:** Error state with retry on InvoiceListScreen, CustomersScreen
- **EmptyState:** Dark mode text variants
- **Tailwind:** `darkMode: "media"` for system preference

### Sprint 20 — Store Compliance ✅
- **iOS:** Privacy manifest (UserDefaults, FileTimestamp), infoPlist usage descriptions (Camera, Mic, Photos, Bluetooth, Local Network)
- **Android:** targetSdkVersion 34, compileSdkVersion 35, minSdkVersion 26, permissions (Bluetooth, etc.)
- **EAS:** production profile with app-bundle, autoIncrement, submit config
- **Docs:** `MOBILE_STORE_COMPLIANCE.md` — manual checklist for App Store Connect + Play Console

### Sprint 21 — Extended Finance ✅
- **ExpiryScreen:** Product expiry page, filter (expired/7d/30d/90d/all), write-off batch
- **BalanceSheetScreen:** P&L summary (revenue, expenses, profit, outstanding)
- **BankReconScreen:** Cashbook with period filter (week/month/2 months)
- **API:** productExtApi.expiryPage, writeOffBatch; reportsApi.pnl
- **More grid:** Expiry, Bank Recon, Balance (BalanceSheet) tiles

---

## API Clients (apps/mobile/src/lib/api.ts)

| API | Methods | Status |
|-----|---------|--------|
| authApi | login, me | ✅ from @execora/shared |
| customerApi | search, get, create, update, list | ✅ from @execora/shared |
| productApi | search, list, get, byBarcode | ✅ from @execora/shared |
| invoiceApi | create, get, list, pdf | ✅ from @execora/shared |
| invoiceExtApi | cancel, update, sendEmail | ✅ |
| customerExtApi | delete, getLedger, getCommPrefs, updateCommPrefs | ✅ |
| paymentApi | record | ✅ |
| reminderApi | list, create | ✅ |
| expenseApi | list, create, remove, summary | ✅ |
| cashbookApi | get | ✅ |
| purchaseApi | list, create, remove | ✅ |
| summaryApi | daily, range | ✅ |
| productExtApi | lowStock | ✅ |
| feedbackApi | submit | ✅ |

---

## Screens Implemented

| Screen | Path | Notes |
|--------|------|-------|
| LoginScreen | `screens/LoginScreen.tsx` | Email + password |
| DashboardScreen | `screens/DashboardScreen.tsx` | KPIs, quick actions, low stock, recent invoices |
| BillingScreen | `screens/BillingScreen.tsx` | 3-step billing wizard |
| InvoiceListScreen | `screens/InvoiceListScreen.tsx` | List + status filters |
| InvoiceDetailScreen | `screens/InvoiceDetailScreen.tsx` | Full detail, edit, cancel, share |
| CustomersScreen | `screens/CustomersScreen.tsx` | List + search |
| CustomerDetailScreen | `screens/CustomerDetailScreen.tsx` | Ledger, invoices, payment |
| PaymentScreen | `screens/PaymentScreen.tsx` | Record payment |
| OverdueScreen | `screens/OverdueScreen.tsx` | Udhaar list |
| ItemsScreen | `screens/ItemsScreen.tsx` | Products, stock adjust |
| MoreScreen | `screens/MoreScreen.tsx` | 16-item grid |
| ExpensesScreen | `screens/ExpensesScreen.tsx` | Expense list |
| CashBookScreen | `screens/CashBookScreen.tsx` | Cash in/out |
| DayBookScreen | `screens/DayBookScreen.tsx` | All transactions |
| ReportsScreen | `screens/ReportsScreen.tsx` | Summary KPIs |
| PurchasesScreen | `screens/PurchasesScreen.tsx` | Purchase list |
| RecurringScreen | `screens/RecurringScreen.tsx` | Placeholder |
| MonitoringScreen | `screens/MonitoringScreen.tsx` | Placeholder |
| SettingsScreen | `screens/SettingsScreen.tsx` | Profile, logout |
| ComingSoonScreen | `screens/ComingSoonScreen.tsx` | Reusable placeholder |
| FeedbackScreen | `screens/FeedbackScreen.tsx` | NPS 0–10 + optional text → POST /api/v1/feedback |
| VoiceScreen | `screens/VoiceScreen.tsx` | Voice billing (existing) |
| PubInvoiceScreen | `screens/PubInvoiceScreen.tsx` | Public invoice portal (no auth) |

---

## Recommended Next Sprints (Monitoring Last)

**Do these first, in order:** 22 → 23  
**Do Monitoring (Sprint 14) last.** (Sprints 15–21 ✅ done)

| Order | Sprint | Focus |
|-------|--------|-------|
| 1 | **22** | Advanced features (import, e-invoice, GSTR-3B, etc.) |
| 3 | **23** | Feedback + Coming Soon screens |
| **4 (last)** | **14** | **Store Monitoring** (KPI bar, hourly chart, employee cards, camera) |

---

## Not Yet Implemented

- Expo Router migration (optional; React Navigation works)
- BottomSheet ✅ (design system)
- DatePicker, NumpadSheet (design system)
- Dark mode (partial: `darkMode: media` + EmptyState/ErrorCard variants)
- Full Settings sub-pages (profile, etc.) — Thermal Print ✅
- Purchase Orders, Credit Notes, GSTR-3B, E-Invoicing, Import, Indirect Income (web has these; mobile has Coming Soon stubs)
- Feedback ✅ (NPS form in More grid)

---

## Run Commands

```bash
pnpm mobile          # or: npx expo start
pnpm android         # Android emulator
```

Set `EXPO_PUBLIC_API_URL` for API base (default: `http://10.0.2.2:3006` for Android emulator).

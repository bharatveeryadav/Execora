# Mobile App — Master Reference

**Owner:** Mobile team  
**Last updated:** March 2026  
**Key source files:** `apps/mobile/src/` · `apps/mobile/package.json` · `apps/mobile/app.json`

> Single authoritative reference. Verified against live `apps/mobile/src/` codebase.  
> Appendix docs (sprint plans, parity tracker, store compliance) are linked at the bottom — do NOT merge them here.

---

## Table of Contents

1. [Stack & Versions](#1-stack--versions)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Sprint Status (0–28)](#3-sprint-status-028)
4. [All 40 Screens](#4-all-40-screens)
5. [Component Library (28 components)](#5-component-library-28-components)
6. [Custom Hooks (7)](#6-custom-hooks-7)
7. [Contexts (3)](#7-contexts-3)
8. [Lib Utilities (15 modules)](#8-lib-utilities-15-modules)
9. [API Clients](#9-api-clients)
10. [Build Config & Permissions](#10-build-config--permissions)
11. [Parity Gaps — Sprints 24P–28P](#11-parity-gaps--sprints-24p28p)
12. [Run Commands](#12-run-commands)
13. [Related Docs](#13-related-docs)

---

## 1. Stack & Versions

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React Native | 0.76.9 |
| Build toolchain | Expo SDK | ~52.0.49 |
| Language | TypeScript | ^5.4.0 |
| Navigation | React Navigation v7 | ^7.0.0 |
| Styling | NativeWind v4 (Tailwind) | ^4.0.0 |
| Server state | TanStack React Query v5 | ^5.40.0 |
| Local storage | react-native-mmkv | ^3.0.0 |
| Monorepo package | @execora/shared | workspace:* |
| Animation | react-native-reanimated | ~3.16.0 |
| Gestures | react-native-gesture-handler | ~2.20.0 |
| Fonts | @expo-google-fonts/inter | ^0.2.3 |
| Icons | @expo/vector-icons | ~14.0.4 |

**Key Expo packages:**

| Package | Version |
|---------|---------|
| expo-camera | ~16.0.18 |
| expo-barcode-scanner | ~13.0.1 |
| expo-notifications | ~0.29.14 |
| expo-haptics | ~14.0.1 |
| expo-print | ~14.0.3 |
| expo-document-picker | ~13.0.3 |
| expo-file-system | ~18.0.12 |
| expo-image-picker | ~16.0.6 |
| expo-sharing | ~13.0.1 |
| expo-device | ~7.0.3 |
| expo-constants | ~17.0.8 |

> Original plan ([MOBILE_APP_PLAN.md](../archive/legacy/) — archived) described a Capacitor wrapper. Actual build chose React Native for offline reliability and native performance.

---

## 2. Navigation Architecture

React Navigation v7 with 1 root stack → 5 named stacks + 1 bottom tab navigator.

```
RootStack
├── AuthStack
│   └── Login                    LoginScreen
├── MainTabs (BottomTabNavigator)
│   ├── Dashboard tab            DashboardScreen
│   ├── ItemsTab                 ItemsStack
│   ├── CustomersTab             CustomersStack
│   ├── InvoicesTab              InvoicesStack
│   └── MoreTab                  MoreStack
└── PubInvoice                   PubInvoiceScreen (no auth)

ItemsStack
  ItemsList → ProductDetail → UpdateProduct → ItemsMenu

CustomersStack
  CustomerList → CustomerDetail → Payment → Overdue

InvoicesStack
  InvoiceList → InvoiceDetail → BillsMenu → Expenses
             → Reports → Purchases → Payment → CreditNotes
             → Overdue → ComingSoon

MoreStack
  More → Billing → BillingForm → InvoiceDetail
      → Items, CompanyProfile, SettingsThermal, Reports
      → DayBook, CashBook, Expenses, Recurring, Purchases
      → Monitoring, Settings, DocumentSettings, DocumentTemplates
      → Feedback, Expiry, BalanceSheet, BankRecon
      → Gstr, CreditNotes, PurchaseOrders, IndirectIncome
      → Import, ComingSoon (SalesOrders, DebitOrders, Journals, etc.)
```

**Type definitions** in `navigation/index.tsx`:

| TypeScript Type | Stack |
|----------------|-------|
| `RootStackParams` | Root (Auth / Main / PubInvoice) |
| `AuthStackParams` | Auth (Login) |
| `MainTabParams` | Bottom tabs (5 tabs) |
| `ItemsStackParams` | Items feature stack |
| `CustomersStackParams` | Customers feature stack |
| `InvoicesStackParams` | Invoices feature stack |
| `BillingStackParams` | Billing form + invoice detail |
| `MoreStackParams` | More menu + all secondary screens |

**Tab Icons (Ionicons):**

| Tab | Route name | Icon |
|-----|-----------|------|
| Dashboard | `Dashboard` | `home` |
| Items | `ItemsTab` | `cube-outline` |
| Customers | `CustomersTab` | `people-outline` |
| Invoices | `InvoicesTab` | `document-text-outline` |
| More | `MoreTab` | `menu-outline` |

---

## 3. Sprint Status (0–28)

### Core Sprints (0–23) — All Complete ✅

| Sprint | Name |
|--------|------|
| 0 | Project Setup (Expo SDK 52, NativeWind, QueryClient) |
| 1 | Auth + Navigation Shell (Login, MMKV, TabBar, AuthContext) |
| 2 | Design System Components (Button, Input, Card, Badge, Skeleton…) |
| 2B | WebSocket Layer (ws.ts, useWsInvalidation, WSProvider) |
| 3 | Home Dashboard (KPIs, quick actions, low-stock strip) |
| 4 | Invoice List + Detail (status filters, edit, cancel, share) |
| 5 | Classic Billing (3-step wizard: customer → items → payment) |
| 6 | Inventory / Products (list, search, stock adjust, low-stock) |
| 7 | Parties / Customers (list, CustomerDetail, ledger, payment) |
| 8 | Payment Recording (customer select, method, receipt) |
| 9 | Expenses (list, filters, Add Expense BottomSheet) |
| 10 | Day Book + Cash Book (combined transactions, period filters) |
| 11 | Reports (Revenue, Expenses, Profit, Bills count) |
| 12 | Overdue, Recurring, Purchases (aging, placeholders) |
| 13 | More Screen + Settings (16-item grid, profile, theme, logout) |
| 14 | Store Monitoring (KPIs, hourly chart, employee risk, cash recon) |
| 15 | Native Integrations (Barcode, Push notifications, Deep links) |
| 16 | Public Invoice Portal (no-auth, UPI Pay Now, PDF download) |
| 17 | Thermal Printing (58mm/80mm, expo-print, header/footer) |
| 18 | Offline Mode (NetInfo, MMKV queue, offline banner, sync) |
| 19 | Polish + QA (Haptics, ErrorCard, EmptyState, dark mode) |
| 20 | Store Compliance (iOS privacy manifest, Android SDK 34, EAS) |
| 21 | Extended Finance (Expiry, Balance Sheet, Bank Recon) |
| 22 | Advanced Features (GSTR, Credit Notes, Purchase Orders) |
| 23 | Feedback + Coming Soon (NPS 0–10, 8 placeholders) |

### Hardening Sprints (24–26) — In Progress / Pending

| Sprint | Name | Status |
|--------|------|--------|
| 24 | Production hardening (error boundaries, crash analytics) | 🔄 in progress |
| 25 | Documentation freeze + test coverage | 🔄 in progress |
| 26 | Store compliance review + launch checklist | ⏳ pending |

### Parity Sprints (24P–28P) — Web Feature Parity

See [MOBILE_WEB_PARITY_SPRINT.md](MOBILE_WEB_PARITY_SPRINT.md) for full task breakdown.

| Sprint | Focus | Status |
|--------|-------|--------|
| 24P | Documents: CompanyProfile, DocumentSettings, DocumentTemplates | ⏳ pending |
| 25P | Finance: IndirectIncome, Balance Sheet improvements | ⏳ pending |
| 26P | Import/Export: customer + product CSV import | ⏳ pending |
| 27P | E-Invoicing and GST improvements | ⏳ pending |
| 28P | Multi-user and team management | ⏳ pending |

---

## 4. All 40 Screens

Verified against `apps/mobile/src/screens/` — 40 files.

| # | Screen | File | Sprint | Notes |
|---|--------|------|--------|-------|
| 1 | LoginScreen | `screens/LoginScreen.tsx` | S1 | Email + password, MMKV token storage |
| 2 | DashboardScreen | `screens/DashboardScreen.tsx` | S3 | KPIs, quick actions, low-stock strip, recent invoices |
| 3 | BillingScreen | `screens/BillingScreen.tsx` | S5 | 3-step wizard; `useBillingForm` reducer |
| 4 | BillsMenuScreen | `screens/BillsMenuScreen.tsx` | S22 | Bills sub-menu (InvoicesTab secondary nav) |
| 5 | InvoiceListScreen | `screens/InvoiceListScreen.tsx` | S4 | List, status filters, search |
| 6 | InvoiceDetailScreen | `screens/InvoiceDetailScreen.tsx` | S4 | Full detail, edit, cancel, share PDF |
| 7 | PartiesScreen | `screens/PartiesScreen.tsx` | S7 | Tab entry alias for customers list |
| 8 | CustomersScreen | `screens/CustomersScreen.tsx` | S7 | Customer list + search |
| 9 | CustomerDetailScreen | `screens/CustomerDetailScreen.tsx` | S7 | Ledger, invoice history, payment button |
| 10 | PaymentScreen | `screens/PaymentScreen.tsx` | S8 | Record payment (cash/UPI/cheque) |
| 11 | OverdueScreen | `screens/OverdueScreen.tsx` | S12 | Udhaar / pending collections list |
| 12 | ItemsScreen | `screens/ItemsScreen.tsx` | S6 | Product list, barcode, stock adjust |
| 13 | ItemsMenuScreen | `screens/ItemsMenuScreen.tsx` | S22 | Items sub-menu (added items routes) |
| 14 | ProductDetailScreen | `screens/ProductDetailScreen.tsx` | S21 | Product detail + expiry info |
| 15 | UpdateProductScreen | `screens/UpdateProductScreen.tsx` | S21 | Edit product name/price/stock |
| 16 | MoreScreen | `screens/MoreScreen.tsx` | S13 | 16-item grid + coming-soon stubs |
| 17 | ExpensesScreen | `screens/ExpensesScreen.tsx` | S9 | Expense list + add BottomSheet |
| 18 | CashBookScreen | `screens/CashBookScreen.tsx` | S10 | Cash in/out by period |
| 19 | DayBookScreen | `screens/DayBookScreen.tsx` | S10 | All transactions by date |
| 20 | ReportsScreen | `screens/ReportsScreen.tsx` | S11 | Revenue, Expenses, Profit, Bills count |
| 21 | PurchasesScreen | `screens/PurchasesScreen.tsx` | S12 | Purchase list + add |
| 22 | RecurringScreen | `screens/RecurringScreen.tsx` | S12 | Recurring bills placeholder |
| 23 | MonitoringScreen | `screens/MonitoringScreen.tsx` | S14 | KPIs, hourly chart, employee risk, cash recon, camera |
| 24 | SettingsScreen | `screens/SettingsScreen.tsx` | S13 | Profile display, theme toggle, logout |
| 25 | ComingSoonScreen | `screens/ComingSoonScreen.tsx` | S23 | Reusable placeholder; title + emoji params |
| 26 | ImportScreen | `screens/ImportScreen.tsx` | S23 | CSV import (customers/suppliers) |
| 27 | FeedbackScreen | `screens/FeedbackScreen.tsx` | S23 | NPS 0–10 → POST /api/v1/feedback |
| 28 | PubInvoiceScreen | `screens/PubInvoiceScreen.tsx` | S16 | Public portal, no auth, UPI Pay Now, PDF download |
| 29 | SettingsThermalScreen | `screens/SettingsThermalScreen.tsx` | S17 | Thermal printer width, header, footer config |
| 30 | ExpiryScreen | `screens/ExpiryScreen.tsx` | S21 | Product expiry list + write-off batch |
| 31 | BalanceSheetScreen | `screens/BalanceSheetScreen.tsx` | S21 | Simplified P&L summary |
| 32 | BankReconScreen | `screens/BankReconScreen.tsx` | S21 | Cash book period filter reconciliation |
| 33 | GstrScreen | `screens/GstrScreen.tsx` | S22 | GSTR-1 summary table |
| 34 | CreditNotesScreen | `screens/CreditNotesScreen.tsx` | S22 | Credit notes list |
| 35 | PurchaseOrdersScreen | `screens/PurchaseOrdersScreen.tsx` | S22 | Purchase orders list |
| 36 | CompanyProfileScreen | `screens/CompanyProfileScreen.tsx` | S24P | Company name, GSTIN, address, logo |
| 37 | DocumentSettingsScreen | `screens/DocumentSettingsScreen.tsx` | S24P | Invoice numbering, due dates, notes |
| 38 | DocumentTemplatesScreen | `screens/DocumentTemplatesScreen.tsx` | S24P | Invoice PDF template picker |
| 39 | IndirectIncomeScreen | `screens/IndirectIncomeScreen.tsx` | S25P | Indirect income type entries |
| 40 | VoiceScreen | `screens/VoiceScreen.tsx` | S5 | Voice billing (STT → LLM intent → handler) |

> Screens 36–39 (S24P/S25P) were added during parity sprints; some may be partially integrated.

---

## 5. Component Library (28 components)

### `components/ui/` — 10 primitives

| Component | Purpose |
|-----------|---------|
| `Badge.tsx` | Status badge (coloured pill) |
| `BottomSheet.tsx` | Modal bottom sheet with gesture dismiss |
| `Button.tsx` | Primary/secondary/ghost button variants |
| `Card.tsx` | Surface container with optional shadow |
| `Chip.tsx` | Filter chip / tag |
| `EmptyState.tsx` | Empty list placeholder with icon + message |
| `ErrorCard.tsx` | Error boundary fallback card |
| `Input.tsx` | Text input with label, error, helper text |
| `ScaledText.tsx` | Text respecting `TypographyContext` scale factor |
| `Skeleton.tsx` | Loading skeleton |

### `components/common/` — 6 shared widgets

| Component | Purpose |
|-----------|---------|
| `AmountText.tsx` | Currency-formatted text (₹) |
| `BarcodeScanner.tsx` | `expo-camera` barcode scanner modal |
| `Header.tsx` | Screen header with back button + action slot |
| `OfflineBanner.tsx` | Sticky top banner when `isOffline` |
| `StatusBadge.tsx` | Invoice/payment status badge (draft/paid/etc.) |
| `TruncatableText.tsx` | Text with "Show more / Show less" toggle |

### `components/billing/` — 2 billing-specific

| Component | Purpose |
|-----------|---------|
| `MobileItemRow.tsx` | Line-item row in billing form |
| `ProductPickerModal.tsx` | Search + select product during billing |

### `components/dashboard/` — 2 dashboard widgets

| Component | Purpose |
|-----------|---------|
| `QuickActionsSection.tsx` | Quick action buttons grid on dashboard |
| `RecentActivitySection.tsx` | Recent invoices strip on dashboard |

### `components/composites/` — 2 composite UI

| Component | Purpose |
|-----------|---------|
| `FilterBar.tsx` | Horizontal scrollable filter bar |
| `TabBar.tsx` | Custom bottom tab bar (replaces default) |

### Root-level in `components/` — 2 template previews

| Component | Purpose |
|-----------|---------|
| `InvoiceTemplatePreview.tsx` | PDF template preview component |
| `InvoiceTemplatePreviewUtils.tsx` | Preview helper utilities |

---

## 6. Custom Hooks (7)

All in `apps/mobile/src/hooks/`.

| Hook | File | Purpose |
|------|------|---------|
| `useBillingForm` | `useBillingForm.ts` | `useReducer`-based form state for billing wizard; consolidates 36+ `useState` calls via `lib/formReducer.ts` |
| `useDataQueries` | `useDataQueries.ts` | Centralised React Query hooks for customers, products, invoices, payments |
| `useOffline` | `useOffline.ts` | Wraps `OfflineContext`; exposes `isOffline` and triggers queue flush on reconnect |
| `usePushAndDeepLinks` | `usePushAndDeepLinks.ts` | Expo push notification token registration + deep link routing on `execora://` scheme |
| `useResponsive` | `useResponsive.ts` | Screen dimension helpers (`isTablet`, width breakpoints) |
| `useWS` | `useWS.ts` | WebSocket subscription helper (wraps `WSProvider`) |
| `useWsInvalidation` | `useWsInvalidation.ts` | Subscribes to WS events and auto-invalidates matching React Query cache keys |

---

## 7. Contexts (3)

All in `apps/mobile/src/contexts/`.

| Context | File | What it exposes |
|---------|------|-----------------|
| `AuthContext` | `AuthContext.tsx` | `user`, `token`, `login(email, password)`, `logout()`, `isAuthenticated`; persists token in MMKV |
| `OfflineContext` | `OfflineContext.tsx` | `isOffline` (boolean), `queuedActions[]`, `flushQueue()`; backed by `lib/offlineQueue.ts` |
| `TypographyContext` | `TypographyContext.tsx` | `scaleFactor`, `setScaleFactor()` — user-adjustable font scale; consumed by `ScaledText` |

**Provider tree order** (in `App.tsx`):
```
QueryClientProvider
  WSProvider
    AuthContext.Provider
      OfflineContext.Provider
        TypographyContext.Provider
          NavigationContainer
```

---

## 8. Lib Utilities (15 modules)

All in `apps/mobile/src/lib/`.

| Module | File | Purpose |
|--------|------|---------|
| `api` | `api.ts` | All HTTP API clients (18 objects — see §9) |
| `alerts` | `alerts.ts` | `Alert.alert` wrappers with standard OK / confirm patterns |
| `constants` | `constants.ts` | Shared enums and constant values (invoice statuses, etc.) |
| `env` | `env.ts` | `EXPO_PUBLIC_*` env var accessors with validation |
| `formReducer` | `formReducer.ts` | Action types + reducer function for `useBillingForm` |
| `haptics` | `haptics.ts` | `expo-haptics` wrappers: `light()`, `success()`, `error()` |
| `offlineQueue` | `offlineQueue.ts` | MMKV-backed queue of offline actions; replay on reconnect |
| `printReceipt` | `printReceipt.ts` | Generates A4 HTML → PDF via `expo-print` |
| `queryKeys` | `queryKeys.ts` | Centralised React Query key factories (prevents cache key typos) |
| `storage` | `storage.ts` | MMKV typed wrappers: `get`, `set`, `remove`; auth token storage |
| `thermalReceipt` | `thermalReceipt.ts` | Generates 58mm/80mm thermal ESC/POS content |
| `thermalSettings` | `thermalSettings.ts` | MMKV-persisted thermal printer config (width, header, footer) |
| `typography` | `typography.ts` | Tailwind typography scale helpers, font family constants |
| `utils` | `utils.ts` | Date formatting, currency formatting, string helpers |
| `ws` | `ws.ts` | WebSocket client class; handles auto-reconnect and auth token injection |

---

## 9. API Clients

All defined in `apps/mobile/src/lib/api.ts`. Base URL from `EXPO_PUBLIC_API_URL`.

| API Object | Methods |
|-----------|---------|
| `authApi` | `login`, `me` |
| `customerApi` | `search`, `get`, `create`, `update`, `list` |
| `productApi` | `search`, `list`, `get`, `byBarcode` |
| `invoiceApi` | `create`, `get`, `list`, `pdf` |
| `invoiceExtApi` | `cancel`, `update`, `sendEmail` |
| `customerExtApi` | `delete`, `getLedger`, `getCommPrefs`, `updateCommPrefs` |
| `paymentApi` | `record` |
| `reminderApi` | `list`, `create` |
| `expenseApi` | `list`, `create`, `remove`, `summary` |
| `cashbookApi` | `get` |
| `purchaseApi` | `list`, `create`, `remove` |
| `summaryApi` | `daily`, `range` |
| `productExtApi` | `lowStock`, `expiryPage`, `writeOffBatch` |
| `reportsApi` | `pnl`, `gstr1` |
| `creditNoteApi` | `list` |
| `purchaseOrderApi` | `list` |
| `feedbackApi` | `submit` |
| `monitoringApi` | `events`, `stats`, `unread`, `markRead`, `cashRecon` |

**Auth:** JWT Bearer token from MMKV via `storage.getToken()`.  
**WebSocket:** connects to `WS_URL` (derived from `EXPO_PUBLIC_API_URL`) with `?token=<jwt>`.

---

## 10. Build Config & Permissions

### App Identifiers

| Key | Value |
|-----|-------|
| App name | Execora |
| Bundle ID (iOS) | `com.execora.app` |
| Application ID (Android) | `com.execora.app` |
| Deep link scheme | `execora://` |
| Dev server port | `8084` |

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `EXPO_PUBLIC_API_URL` | `http://10.0.2.2:3006` | API base URL (10.0.2.2 = Android emulator localhost) |
| `EXPO_PUBLIC_LOGIN_EMAIL` | — | Auto-fill login for dev |
| `EXPO_PUBLIC_LOGIN_PASSWORD` | — | Auto-fill password for dev |

### iOS Permissions (Info.plist)

| Permission | Usage |
|-----------|-------|
| `NSCameraUsageDescription` | Barcode scanning + monitoring camera |
| `NSMicrophoneUsageDescription` | Voice billing |
| `NSPhotoLibraryUsageDescription` | Upload logo / attachments |
| `NSBluetoothAlwaysUsageDescription` | Thermal Bluetooth printer |
| `NSLocalNetworkUsageDescription` | Local network BT printer discovery |

### Android Permissions (AndroidManifest)

| Permission | Usage |
|-----------|-------|
| `CAMERA` | Barcode scanning + monitoring camera |
| `POST_NOTIFICATIONS` | Push notifications (Android 13+) |
| `RECORD_AUDIO` | Voice billing |
| `BLUETOOTH` / `BLUETOOTH_CONNECT` | Thermal Bluetooth printer |
| `READ_EXTERNAL_STORAGE` | File picker |
| `VIBRATE` | Haptic feedback fallback |

### EAS Build Commands

```bash
eas build --platform android --profile preview   # APK for testing
eas build --platform ios --profile preview       # TestFlight IPA
eas build --platform all --profile production    # Store builds
eas submit --platform android                    # Play Console upload
eas submit --platform ios                        # App Store upload
```

---

## 11. Parity Gaps — Sprints 24P–28P

Features present on web but not fully available on mobile. See [MOBILE_WEB_PARITY_SPRINT.md](MOBILE_WEB_PARITY_SPRINT.md) for full task list.

| Feature | Web | Mobile |
|---------|-----|--------|
| Company Profile (name, GSTIN, logo) | ✅ | 🔄 screen added, API integration pending |
| Document Settings (invoice numbering) | ✅ | 🔄 screen added, integration pending |
| Document Templates (PDF template picker) | ✅ | 🔄 screen added, integration pending |
| Indirect Income entries | ✅ | 🔄 screen added, integration pending |
| Customer CSV import | ✅ | 🔄 `ImportScreen` stubbed |
| GSTR-3B | ✅ | ⏳ Coming Soon stub |
| E-Invoicing (IRN generation) | ✅ | ⏳ Coming Soon stub |
| Sales Orders | ✅ | ⏳ Coming Soon stub |
| Debit Orders | ✅ | ⏳ Coming Soon stub |
| Delivery Challans | ✅ | ⏳ Coming Soon stub |
| Journals | ✅ | ⏳ Coming Soon stub |
| Online Store | ✅ | ⏳ Coming Soon stub |
| Full Settings sub-pages (profile edit, team) | ✅ | ⏳ pending |
| Full dark mode | Partial | ⏳ `darkMode: media` on EmptyState/ErrorCard; full toggle pending |

---

## 12. Run Commands

```bash
# Development
pnpm mobile                                                        # Expo start (default port)
pnpm --filter @execora/mobile exec expo start --clear --port 8084  # Explicit port 8084

# Platform-specific
pnpm android    # Android emulator
pnpm ios        # iOS simulator (macOS only)

# Type checking
cd apps/mobile && npx tsc --noEmit

# Clean start
cd apps/mobile && npx expo start --clear
```

**Pre-requisites:**
- Android: Android Studio + emulator, or physical device with ADB
- iOS: Xcode 15+ on macOS only
- EAS: `npm install -g eas-cli` (or `npx eas`)

---

## 13. Related Docs

### Appendix Docs (detailed specs — do NOT merge into this file)

| Doc | Purpose |
|-----|---------|
| [REACT_NATIVE_SPRINT_PLAN.md](REACT_NATIVE_SPRINT_PLAN.md) | Per-sprint task breakdowns and acceptance criteria |
| [MOBILE_WEB_PARITY_SPRINT.md](MOBILE_WEB_PARITY_SPRINT.md) | Web feature parity gap tracker (Sprints 24P–28P) |
| [MOBILE_STORE_COMPLIANCE.md](MOBILE_STORE_COMPLIANCE.md) | App Store + Play Console compliance checklist |

### Cross-Domain References

| Doc | Domain |
|-----|--------|
| [../backend/MASTER.md](../backend/MASTER.md) | All API routes consumed by mobile |
| [../web/MASTER.md](../web/MASTER.md) | Web feature parity reference |
| [../../TASKS_PENDING.md](../../TASKS_PENDING.md) | Active task backlog |
| [../../TASKS_COMPLETED.md](../../TASKS_COMPLETED.md) | Completed work log |


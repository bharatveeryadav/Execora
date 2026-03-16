# Execora — Complete Mobile App Plan
## End-to-End Native Mobile App (iOS + Android)
### Version 1.0 | March 16, 2026

---

## STRATEGY SUMMARY

Execora's web app already has ~90% mobile-ready code (Tailwind responsive, BottomNav, safe-area CSS).
The mobile app strategy is:

1. **Phase 1 — Web Polish** (1 week): Fix remaining responsive issues across all 27+ pages so every screen works perfectly at 390px wide (iPhone 14) and 360px (Android).
2. **Phase 2 — Capacitor Shell** (2 days): Wrap the web app in a Capacitor native shell → ship to App Store + Play Store with zero business logic rewrite.
3. **Phase 3 — Native Enhancements** (2 weeks): Add native-only features — haptics, push notifications, native barcode scanner, offline mode, deep links.

**Why Capacitor, not React Native:**
| Dimension | Capacitor | React Native |
|---|---|---|
| Code reuse | 100% — same React app | ~30% (logic only) |
| Time to ship | 3–5 days | 4–6 weeks rewrite |
| Parity with web | Instant (same codebase) | Permanent divergence |
| Performance | WKWebView (98% sufficient) | Fully native |
| App Store | ✅ iOS + Android | ✅ |

---

## CURRENT STATE ASSESSMENT

### Already Done ✅
- `vite-plugin-pwa` + Workbox service worker (offline-first products, customers, invoices)
- `manifest.webmanifest` with PWA shortcuts + icons
- `index.html` — apple-mobile-web-app-meta, theme-color
- `pb-safe` / `pt-safe` CSS utilities (env safe-area-inset-*)
- `BottomNav` — 5 tabs + More drawer (16 items), pb-safe, touch targets 52px min
- `AppLayout` — desktop sidebar / mobile BottomNav branch
- `isMobile` hook — drives sidebar vs. bottom nav decision
- `max-w-3xl mx-auto` content constraint
- FAB positioning at `bottom-20` on mobile (above BottomNav)
- Dialog-based forms (edit/add) — works on mobile

### Remaining Issues to Fix 🔧
1. BottomNav included per-page instead of in AppLayout — causes inconsistencies
2. Some pages missing `pb-20` clearance for BottomNav
3. HTML tables (ClassicBilling items, InvoiceDetail items) break at 390px width
4. ClassicBilling billing form needs mobile-native flow (single-column, steps)
5. Reports page — charts not fully responsive on 390px
6. Settings sub-pages not all mobile tested
7. No haptic feedback on key actions (bill save, payment record)
8. Barcode scanner uses browser API (slower, less reliable on Android)
9. No push notifications (currently only browser Notification API)
10. No deep linking (`execora://invoices/123`)

---

## PHASE 1 — WEB RESPONSIVE POLISH

### Sprint P1 — Layout Foundation (2 days)

#### Task P1.1 — Move BottomNav into AppLayout

**Problem:** BottomNav is imported manually in Index, ClassicBilling, Inventory, Parties, and potentially others. Any page that forgets the import shows no navigation.

**Fix:** Add BottomNav once to `AppLayout.tsx` mobile branch.

```tsx
// apps/web/src/components/AppLayout.tsx
if (isMobile) {
  return (
    <div className="flex flex-col min-h-svh">
      <div className="flex-1 pt-safe pb-[56px] overflow-y-auto">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
```

**Remove `<BottomNav />` from:**
- `apps/web/src/pages/Index.tsx`
- `apps/web/src/pages/ClassicBilling.tsx`
- `apps/web/src/pages/Inventory.tsx`
- `apps/web/src/pages/Parties.tsx`
- Any other page importing BottomNav (`grep -r "import BottomNav"`)

#### Task P1.2 — Safe-area top for notch

**Problem:** On iPhone 14 Pro / Dynamic Island, content starts under the status bar.

**Fix:** `pt-safe` in AppLayout mobile branch (already defined as `padding-top: max(0px, env(safe-area-inset-top))`).

```tsx
<div className="flex-1 pt-safe pb-[56px] overflow-y-auto">
```

#### Task P1.3 — Audit all pages for pb-20 clearance

Pages that need `pb-20 md:pb-0` at page root:
- Index.tsx ✅ (has pb-20)
- Invoices.tsx — verify
- Payment.tsx — verify
- Expenses.tsx — verify
- DayBook.tsx — verify
- CashBook.tsx — verify
- CustomerDetail.tsx — verify
- OverduePage.tsx — verify
- Reports.tsx — N/A (full-page standalone)

**Standard pattern to apply to all pages:**
```tsx
<div className="px-4 pb-20 md:pb-6 max-w-3xl mx-auto">
  {/* page content */}
</div>
```

---

### Sprint P2 — Table → Mobile Card Conversion (2 days)

#### Task P2.1 — ClassicBilling items table

**Problem:** The items table (Product | Qty | Unit | Rate | Disc% | Amount) renders as an HTML table that breaks at 390px.

**Fix:** Replace table rows with stacked card rows on mobile.

```tsx
{/* Mobile: stacked card per item */}
<div className="md:hidden space-y-2">
  {items.map((item, idx) => (
    <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <ProductAutocomplete value={item.name} onChange={...} className="flex-1" />
        <button onClick={() => removeItem(idx)} className="text-destructive shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Qty</p>
          <Input type="number" value={item.qty} onChange={...} className="h-8 text-sm" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Rate ₹</p>
          <Input type="number" value={item.rate} onChange={...} className="h-8 text-sm" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Disc%</p>
          <Input type="number" value={item.discount} onChange={...} className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{item.unit}</span>
        <span className="font-semibold">₹{item.amount.toFixed(2)}</span>
      </div>
    </div>
  ))}
</div>

{/* Desktop: original table */}
<div className="hidden md:block overflow-x-auto">
  {/* existing table */}
</div>
```

#### Task P2.2 — InvoiceDetail items table

**Problem:** Items list in invoice detail breaks on mobile.

**Fix:** Wrap in `overflow-x-auto` minimum fix, or convert to card rows:

```tsx
{/* Minimum fix */}
<div className="overflow-x-auto -mx-4 px-4">
  <table className="min-w-[480px] w-full">
    {/* existing table */}
  </table>
</div>
```

#### Task P2.3 — Inventory product list

**Current:** Likely a table. Verify if cards are used or if table exists.
**Fix:** Ensure product list uses card rows, not `<table>`.

#### Task P2.4 — EmployeeSummary (already cards ✅)

---

### Sprint P3 — ClassicBilling Mobile UX (3 days)

The ClassicBilling page is the most critical screen. Kirana owners create 50–200 bills/day on this screen. It must be frictionless on mobile.

#### Task P3.1 — Step-based billing flow on mobile

The current form is a single long scroll. On mobile, convert to a 3-step wizard:

**Step 1 — Customer** (auto-skip if walk-in)
```
┌─────────────────────────────────┐
│ New Bill          Step 1/3      │
│ ─────────────────────────────── │
│ Customer (optional)             │
│ [Search or Walk-in] ↓          │
│ ─────────────────────────────── │
│              [Next →]           │
└─────────────────────────────────┘
```

**Step 2 — Items** (main step)
```
┌─────────────────────────────────┐
│ ← Back            Step 2/3     │
│ ─────────────────────────────── │
│ [Search product or scan barcode]│
│                                 │
│ ┌─ Rice 5kg ──────────────────┐ │
│ │  [−]  3  [+]      ₹450     │ │
│ └───────────────────────────── ┘ │
│ ┌─ Sugar 1kg ─────────────────┐ │
│ │  [−]  2  [+]      ₹120     │ │
│ └───────────────────────────── ┘ │
│                                 │
│ [+ Add More Items]              │
│ ─────────────────────────────── │
│ Total: ₹570           [Next →]  │
└─────────────────────────────────┘
```

**Step 3 — Payment**
```
┌─────────────────────────────────┐
│ ← Back            Step 3/3     │
│ ─────────────────────────────── │
│ Summary              ₹570      │
│ ─────────────────────────────── │
│  💵 Cash   📱 UPI   💳 Card    │
│  🏪 Credit                     │
│ ─────────────────────────────── │
│ Amount Received                 │
│ [      570      ]               │
│ ─────────────────────────────── │
│        [✓ Save Bill]            │
└─────────────────────────────────┘
```

**Implementation approach:**
- Add `step` state (1 | 2 | 3) to ClassicBilling
- Mobile-only: render step wizard; desktop: render full form (unchanged)
- Use `isMobile` hook to switch rendering
- No logic duplication — same state object, different render

#### Task P3.2 — Quick-add product bottom sheet

On Step 2 (Items), product search opens a bottom sheet (not inline):
```
┌─────────────────────────────────┐
│  ╌╌╌╌╌╌╌  (drag handle)        │
│ Search product...    [📷 Scan] │
│ ─────────────────────────────── │
│ 🔢 Rice 5kg       ₹150/kg     │
│ 🔢 Sugar           ₹45/kg     │
│ 🔢 Atta 10kg      ₹320       │
│ ─────────────────────────────── │
│         Recent Items            │
│ 🕐 Dal 1kg        ₹130       │
│ 🕐 Oil 500ml      ₹85        │
└─────────────────────────────────┘
```

Uses Shadcn `Sheet` with `side="bottom"` + drag dismiss.

#### Task P3.3 — Numpad-style quantity input

On mobile, typing in number inputs is cumbersome. Replace small inputs with a numpad bottom sheet:
```
Tapping qty → opens numpad:
┌─────────────────────────────────┐
│  Rice 5kg                       │
│        3 kg           ✕        │
│ ─────────────────────────────── │
│  7    8    9                   │
│  4    5    6                   │
│  1    2    3                   │
│  .    0    ←                   │
│         [Done]                  │
└─────────────────────────────────┘
```

---

### Sprint P4 — Reports + Charts Mobile (1 day)

#### Task P4.1 — Responsive charts

Recharts `<ResponsiveContainer width="100%" height={200}>` is already used in most charts. Verify all chart containers use % width, not fixed pixel width.

#### Task P4.2 — Reports navigation on mobile

Reports page is full-page standalone. On mobile:
- Report category selector: horizontal scrollable chips at top
- Report list: vertical card list (not grid)
- Chart section: full-width charts stacked vertically
- Period selector: horizontal scrollable buttons

#### Task P4.3 — Download/Share buttons

On mobile, PDF download → native share sheet (Capacitor Share plugin):
```ts
import { Share } from '@capacitor/share';
await Share.share({ title: 'Invoice #123', url: pdfUrl });
```
Falls back to `window.open(pdfUrl)` on web.

---

## PHASE 2 — CAPACITOR NATIVE SHELL

### Sprint C1 — Project Setup (1 day)

#### Step C1.1 — Create `apps/mobile/` directory

```bash
mkdir -p apps/mobile && cd apps/mobile
npm init -y
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/status-bar @capacitor/keyboard @capacitor/haptics @capacitor/app
npm install @capacitor/push-notifications @capacitor/share
npm install @capacitor/camera
npm install @capacitor-community/barcode-scanner
```

#### Step C1.2 — `apps/mobile/capacitor.config.ts`

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:   'com.execora.billing',
  appName: 'Execora',
  webDir:  '../web/dist',        // Vite build output
  bundledWebRuntime: false,

  server: {
    // Dev mode only — comment out for production
    // url:       'http://192.168.1.X:5173',
    // cleartext: true,
  },

  ios: {
    scheme:         'execora',
    contentInset:   'automatic',  // WKWebView auto safe-area
  },

  android: {
    allowMixedContent:            false,
    captureInput:                 true,
    webContentsDebuggingEnabled:  false,   // set true for dev builds
  },

  plugins: {
    StatusBar: {
      style:             'Dark',
      backgroundColor:   '#0f172a',
      overlaysWebView:   false,
    },
    Keyboard: {
      resize:             'body',
      style:              'dark',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

#### Step C1.3 — `apps/mobile/package.json`

```json
{
  "name": "@execora/mobile",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "sync":    "npx cap sync",
    "open:ios": "npx cap open ios",
    "open:android": "npx cap open android",
    "run:ios": "npx cap run ios",
    "run:android": "npx cap run android"
  },
  "dependencies": {
    "@capacitor/android": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/camera": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/keyboard": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/share": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@capacitor-community/barcode-scanner": "^3.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0"
  }
}
```

#### Step C1.4 — Root turbo build scripts

```json
// package.json (root) — add to scripts:
"mobile:sync":    "pnpm --filter @execora/web build && cd apps/mobile && npx cap sync",
"mobile:ios":     "pnpm mobile:sync && cd apps/mobile && npx cap open ios",
"mobile:android": "pnpm mobile:sync && cd apps/mobile && npx cap open android",
"mobile:dev:ios": "cd apps/mobile && npx cap run ios --livereload --external"
```

#### Step C1.5 — Web build script for native

```json
// apps/web/package.json — add to scripts:
"build:native": "VITE_API_BASE_URL=https://api.yourdomain.com vite build",
"build:native:local": "VITE_API_BASE_URL=http://192.168.1.X:3006 vite build"
```

#### Step C1.6 — Init iOS + Android projects

```bash
cd apps/mobile
npx cap add ios
npx cap add android
```

Git track rules (add to `.gitignore`):
```gitignore
# Capacitor build artifacts
apps/mobile/ios/App/Pods/
apps/mobile/android/.gradle/
apps/mobile/android/app/build/
apps/mobile/node_modules/
```

Git track (DO commit):
```
apps/mobile/ios/App/App/             (source files)
apps/mobile/ios/App/App.xcworkspace/ (workspace)
apps/mobile/android/app/src/         (source)
apps/mobile/android/app/build.gradle
apps/mobile/capacitor.config.ts
```

---

### Sprint C2 — API Configuration for Native (0.5 days)

**Problem:** Vite dev proxy (`/api → localhost:3006`) doesn't work in native apps — there's no localhost.

**Solution:** `VITE_API_BASE_URL` already read in `apps/web/src/lib/api.ts`. Set this per build target.

**For self-hosted (ThemeForest):** Ship a `config.json` at web root:
```json
{ "apiBase": "https://customer-domain.com" }
```

Read at runtime in `apps/web/src/lib/api.ts`:
```ts
// Runtime config override (for native builds pointing to self-hosted server)
let runtimeApiBase: string | null = null;
export async function loadRuntimeConfig() {
  try {
    const r = await fetch('/config.json');
    const c = await r.json();
    if (c.apiBase) runtimeApiBase = c.apiBase;
  } catch {}
}

const API_BASE = runtimeApiBase
  ?? (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
```

---

### Sprint C3 — Native Feature Upgrades (3 days)

#### Task C3.1 — Haptic feedback

Create `apps/web/src/lib/haptics.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticLight() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticError() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type: 'ERROR' } as any);
}
```

**Add haptics to:**
| Page | Trigger | Type |
|------|---------|------|
| ClassicBilling | Bill saved | `hapticSuccess()` |
| Payment.tsx | Payment recorded | `hapticSuccess()` |
| InvoiceDetail | Status changed | `hapticLight()` |
| Inventory | Item added to cart | `hapticLight()` |
| Expenses | Expense added | `hapticLight()` |
| Any form | Validation error | `hapticError()` |

#### Task C3.2 — Native barcode scanner

Replace `@zxing/browser` with native camera scanner.

Update `apps/web/src/components/BarcodeScanner.tsx`:

```tsx
import { Capacitor } from '@capacitor/core';

async function scanBarcode(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    // Native: faster, works offline, no browser permission popup
    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    await BarcodeScanner.prepare();
    const result = await BarcodeScanner.startScan();
    await BarcodeScanner.stopScan();
    return result.hasContent ? result.content : null;
  } else {
    // Web: existing @zxing/browser implementation
    return scanBarcodeWeb();
  }
}
```

#### Task C3.3 — Push notifications

```ts
// apps/web/src/lib/push.ts
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPush() {
  if (!Capacitor.isNativePlatform()) return;

  const result = await PushNotifications.requestPermissions();
  if (result.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    // Send token to backend: POST /api/v1/push/register { token, platform }
    fetch('/api/v1/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('execora_token')}` },
      body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
    }).catch(() => {});
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Handle foreground notification
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Deep link navigation
    const data = action.notification.data;
    if (data?.route) {
      window.location.href = data.route; // e.g. /invoices/123
    }
  });
}
```

Call `registerPush()` in AppLayout after auth check.

#### Task C3.4 — Native share (PDF/receipt)

```ts
// In InvoiceDetail.tsx — replace window.open(pdfUrl) on native
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

async function sharePDF(pdfUrl: string, invoiceNo: string) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title:          `Invoice ${invoiceNo}`,
      text:           `Here is invoice ${invoiceNo} from Execora`,
      url:            pdfUrl,
      dialogTitle:    'Share Invoice',
    });
  } else {
    window.open(pdfUrl, '_blank');
  }
}
```

#### Task C3.5 — App URL / deep linking

Configure deep links so `execora://invoices/123` opens the right screen.

**iOS** — `ios/App/App/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.execora.billing</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>execora</string>
    </array>
  </dict>
</array>
```

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="execora" />
</intent-filter>
```

**Web side listener:**
```ts
import { App } from '@capacitor/app';
App.addListener('appUrlOpen', (data) => {
  const url = new URL(data.url);
  // execora://invoices/123 → /invoices/123
  const path = url.pathname;
  navigate(path);
});
```

#### Task C3.6 — Back button handling (Android)

Android back button can cause the app to exit unexpectedly.

```ts
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack || location.pathname === '/') {
    App.exitApp();  // Exit only from home screen
  } else {
    window.history.back();
  }
});
```

Add to `AppLayout.tsx`.

#### Task C3.7 — Keyboard avoidance

Capacitor Keyboard plugin handles keyboard resize. Additional CSS:
```css
/* Prevent keyboard from pushing content under BottomNav */
.ion-page {
  contain: layout size style;
}
```

When keyboard opens, push up the bottom fixed elements:
```ts
import { Keyboard } from '@capacitor/keyboard';
Keyboard.addListener('keyboardWillShow', (info) => {
  document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
});
Keyboard.addListener('keyboardWillHide', () => {
  document.documentElement.style.setProperty('--keyboard-height', '0px');
});
```

---

## PHASE 3 — ALL SCREENS: MOBILE UI SPECIFICATION

### Screen 1 — Home Dashboard `/`

**Mobile Layout:**
```
┌─────────────────────────────────┐  ← 390px
│ [≡] Execora          [🔔] [👤] │  ← header 52px
│─────────────────────────────────│
│ 🌅 Good morning, Ramesh!        │
│ ─────────────────────────────── │
│ ┌── Today ──────────────────┐   │
│ │ Bills   Revenue  Pending  │   │
│ │  12     ₹8,450   ₹1,200  │   │
│ └───────────────────────────┘   │
│                                 │
│ ⚡ Quick Actions                │
│ [+ Bill] [💳 Pay] [📦 Stock]  │
│                                 │
│ ── Recent Activity ───────────  │
│ 🧾 Invoice #45    ₹1,200  2m   │
│ 💳 Payment        ₹500    5m   │
│ 📦 Low Stock: Dal             8m│
│                                 │
│─────────────────────────────────│
│ 🏠  👥  📦  🧾  ⋯           │  ← BottomNav
└─────────────────────────────────┘
```

**Specific Changes:**
- Header: hamburger (opens profile/settings drawer) + notification bell + avatar
- KPI cards: 3 per row (Bills, Revenue, Pending) in rounded cards
- Quick Actions: 3-button row (+ Bill, Record Payment, Add Stock)
- Recent Activity: card list, max 5 items, "See all" link
- No sidebar on mobile — hamburger opens a side drawer

---

### Screen 2 — Classic Billing `/billing`

**Mobile Layout (Step 2 — Items):**
```
┌─────────────────────────────────┐
│ ← New Bill      Customer: Walk-in│
│─────────────────────────────────│
│ [🔍 Search or scan barcode  📷] │
│─────────────────────────────────│
│ ┌─ Rice 5kg ──────────────────┐ │
│ │  [−] 3 [+]     ₹450  🗑    │ │
│ └─────────────────────────────┘ │
│ ┌─ Sugar 1kg ─────────────────┐ │
│ │  [−] 2 [+]     ₹120  🗑    │ │
│ └─────────────────────────────┘ │
│ [+ Add Item]                    │
│─────────────────────────────────│
│ 3 items · ₹570 incl. GST        │
│               [Payment →]       │
└─────────────────────────────────┘
```

**Mobile Layout (Step 3 — Payment):**
```
┌─────────────────────────────────┐
│ ← Payment                       │
│─────────────────────────────────│
│  RICE 5KG × 3        ₹450      │
│  SUGAR × 2           ₹120      │
│  ─────────────────  ─────────  │
│  Total               ₹570      │
│─────────────────────────────────│
│  [💵 Cash] [📱 UPI] [💳 Card] │
│  [📒 Credit]                    │
│─────────────────────────────────│
│  Amount Received                │
│  ┌─────────────────────────┐   │
│  │       ₹  570            │   │
│  └─────────────────────────┘   │
│  [Quick: 500  600  1000  ⟲]    │
│─────────────────────────────────│
│         [✓ Save Bill  ₹570]    │
└─────────────────────────────────┘
```

**Components needed:**
- `MobileBillingWizard` — step controller (mobile only)
- `ItemSearchSheet` — bottom sheet for product search (mobile)
- `NumpadSheet` — numpad for qty/amount input (mobile)
- `MobilePaymentStep` — payment method + amount entry (mobile)

**Shared:** All billing state (`items`, `customer`, `amounts`) stays in existing `ClassicBilling.tsx`. Mobile renders different UI, same logic.

---

### Screen 3 — Invoices List `/invoices`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Invoices        [🔍] [⊕]     │
│─────────────────────────────────│
│ [Sales] [Purchase] [Quotation]  │  ← scrollable tabs
│─────────────────────────────────│
│ [All][Draft][Pending][Partial][Paid]│  ← scrollable status chips
│─────────────────────────────────│
│ Today · ₹8,450 · 12 bills       │
│─────────────────────────────────│
│ ┌─────────────────────────────┐ │
│ │ 🧾 #INV-045  Ramesh Sharma  │ │
│ │    ₹1,200    Pending   2m   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🧾 #INV-044  Walk-in        │ │
│ │    ₹570      Paid      5m   │ │
│ └─────────────────────────────┘ │
│─────────────────────────────────│
│            [⊕ New Bill]         │  ← FAB
└─────────────────────────────────┘
```

**Changes:**
- Date filter: show only Today/Yesterday/Week/Month as chips (no dropdown on mobile)
- FAB: large centered (or bottom-right) with [+ New Bill] text
- Summary strip: Today's total + bill count
- Status chips: horizontal scroll with `scrollbar-none`

---

### Screen 4 — Invoice Detail `/invoices/:id`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ←    Invoice #INV-045  [⋯]     │
│─────────────────────────────────│
│   PENDING              ₹1,200  │
│   Ramesh Sharma · 📞9876543210  │
│   01 Mar 2026                   │
│─────────────────────────────────│
│ Items                           │
│  Dal 1kg × 5    ₹650           │
│  Oil 500ml × 1  ₹125           │
│  GST (5%)       ₹38.75         │
│  ─────────────  ────────────── │
│  Total          ₹813.75        │
│─────────────────────────────────│
│ [💳 Record Payment] [📤 Share] │
│─────────────────────────────────│
└─────────────────────────────────┘
```

**Changes:**
- Action buttons: prominent "Record Payment" + "Share" always visible at bottom
- More actions in `⋯` dropdown: Print, Email, Edit Notes, Cancel, Download PDF
- Items list: `overflow-x-auto` or stacked rows

---

### Screen 5 — Parties `/parties`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ Parties              [🔍] [⊕]  │
│─────────────────────────────────│
│ [Customers]  [Vendors]          │
│─────────────────────────────────│
│ 📊 Total Receivable: ₹24,500   │
│─────────────────────────────────│
│ ┌──── Ramesh Sharma ──────────┐ │
│ │ 📞 98765-43210              │ │
│ │ Outstanding: ₹1,200    7d>  │ │
│ └─────────────────────────────┘ │
│ ┌──── Priya Retail ───────────┐ │
│ │ 📞 98765-00000              │ │
│ │ Balance: ₹0         ✓      │ │
│ └─────────────────────────────┘ │
│─────────────────────────────────│
│            [⊕ Add Customer]     │
└─────────────────────────────────┘
```

---

### Screen 6 — Customer Detail `/customers/:id`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Ramesh Sharma    [✏️] [⋯]   │
│─────────────────────────────────│
│ ● 98765-43210  📱 WhatsApp     │
│ Balance: ₹1,200 outstanding     │
│─────────────────────────────────│
│ [Overview] [Bills] [Ledger] [⏰]│
│─────────────────────────────────│
│ (Overview tab)                  │
│ ┌─ Contact ─────────────────┐  │
│ │ Phone: 98765-43210        │  │
│ │ City: Jaipur              │  │
│ │ Credit limit: ₹5,000      │  │
│ └───────────────────────────┘  │
│ ┌─ Notes ───────────────────┐  │
│ │ Prefers morning delivery  │  │
│ └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

### Screen 7 — Record Payment `/payment`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Record Payment               │
│─────────────────────────────────│
│ Customer                        │
│ [Search customer...          ↓] │
│─────────────────────────────────│
│ Balance: ₹1,200 outstanding     │
│─────────────────────────────────│
│ Method                          │
│ [💵 Cash] [📱 UPI] [💳 Card]  │
│─────────────────────────────────│
│ Amount                          │
│ ┌─────────────────────────────┐ │
│ │     ₹  1,200                │ │
│ └─────────────────────────────┘ │
│ [200] [500] [1000] [Full]       │
│─────────────────────────────────│
│         [✓ Record Payment]      │
└─────────────────────────────────┘
```

---

### Screen 8 — Inventory `/inventory`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ Items                [🔍] [⊕]  │
│─────────────────────────────────│
│ [All] [Low Stock] [Out of Stock]│
│─────────────────────────────────│
│ ⚠️ 3 items low stock           │
│─────────────────────────────────│
│ ┌────────────────────────────┐  │
│ │ 🍚 Rice Basmati 5kg        │  │
│ │    Stock: 45 kg · ₹150/kg │  │
│ │    [− Adjust]     [+ Stock]│  │
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │ ⚠️ Dal 1kg         LOW     │  │
│ │    Stock: 3 kg · ₹130/kg  │  │
│ │    [− Adjust]     [+ Stock]│  │
│ └────────────────────────────┘  │
│─────────────────────────────────│
│            [⊕ Add Product]      │
└─────────────────────────────────┘
```

**Changes:**
- Filter chips (scrollable): All | Low Stock | Out of Stock
- Each product: card with name, stock level, price
- Low stock shown with ⚠️ badge + yellow border
- Quick buttons: Adjust stock (−) and Add stock (+)
- Add/Edit: bottom sheet (not modal dialog)
- Barcode scan: top-right icon in search bar

---

### Screen 9 — Expenses `/expenses`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Expenses          March 2026  │
│─────────────────────────────────│
│ This Month: ₹12,450             │
│ Entries: 24 · Top: Stock Purch. │
│─────────────────────────────────│
│ [All] [This Week] [This Month]  │
│─────────────────────────────────│
│ [🔍 Search expenses...]         │
│─────────────────────────────────│
│ ── Mar 15 ─────────────────── ─ │
│ 🛒 Stock Purchase  ₹5,000      │
│    Sharma Wholesale · Rice+Dal  │
│─────────────────────────────────│
│ ── Mar 14 ─────────────────── ─ │
│ 🏢 Rent            ₹8,000      │
│─────────────────────────────────│
│            [⊕ Add Expense]      │
└─────────────────────────────────┘
```

---

### Screen 10 — Day Book `/daybook`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Day Book         [🔄]        │
│─────────────────────────────────│
│ [Today][Yest][Week][Month][Last]│
│─────────────────────────────────│
│ In: ₹8,450   Out: ₹5,000      │
│ Net: +₹3,450                   │
│─────────────────────────────────│
│ [All][Bills][Payments][Expenses]│
│─────────────────────────────────│
│ ── March 15 ─────────────────── │
│ ↗ Invoice #45    ₹1,200  10:30 │
│ ↗ Payment        ₹500    11:15 │
│ ↙ Expense: Rent  ₹8,000  13:00 │
│─────────────────────────────────│
│ EOD Reconciliation     [▼ Open] │
└─────────────────────────────────┘
```

---

### Screen 11 — Cash Book `/cashbook`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Cash Book        [🔄]        │
│─────────────────────────────────│
│ ┌─── Net Cash ───────────────┐  │
│ │      +₹3,450               │  │
│ │   In ₹8,450  Out ₹5,000   │  │
│ └────────────────────────────┘  │
│─────────────────────────────────│
│ From [15/03/2026] To [today]    │
│─────────────────────────────────│
│ ── Mar 15 ─────────────────── ─ │
│ ↗ Payment by Ramesh  ₹1,200   │
│ ↙ Petrol Expense       ₹200   │
│ ↗ Cash Sale            ₹570   │
└─────────────────────────────────┘
```

---

### Screen 12 — Overdue `/overdue`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Overdue         [📤 Remind]  │
│─────────────────────────────────│
│ ₹24,500 across 8 customers     │
│─────────────────────────────────│
│ [🔍 Search...]    [Sort: Due ↓] │
│─────────────────────────────────│
│ ┌── Ramesh Sharma ────────────┐ │
│ │ 📞 98765-43210              │ │
│ │ ₹3,500 due · 🔴 32 days    │ │
│ │ [View Bills] [💬 WhatsApp] │ │
│ └─────────────────────────────┘ │
│ ┌── Priya General Store ──────┐ │
│ │ ₹1,200 due · 🟡 8 days     │ │
│ │ [View Bills] [💬 WhatsApp] │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### Screen 13 — Reports `/reports`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Reports                       │
│─────────────────────────────────│
│ [Today][Week][Month][FY][Custom]│
│─────────────────────────────────│
│ ── Key Numbers ─────────────── │
│ Revenue   Expenses   Profit     │
│ ₹45,000   ₹22,000   ₹23,000  │
│─────────────────────────────────│
│ ── Quick Reports ───────────── │
│ 📊 Sales Summary      >        │
│ 📉 Profit & Loss      >        │
│ 📋 GSTR-1             >        │
│ 📋 GSTR-3B            >        │
│ 👥 Party Statement    >        │
│ 📦 Stock Summary      >        │
│─────────────────────────────────│
│ ── GST Returns ─────────────── │
│ 🏛 GSTR-1  🏛 GSTR-2  🏛 3B   │
└─────────────────────────────────┘
```

---

### Screen 14 — Settings `/settings`

**Mobile Layout (Settings Home):**
```
┌─────────────────────────────────┐
│ ← Settings                      │
│─────────────────────────────────│
│ ┌── Business Profile ─────────┐ │
│ │ 🏪 My Kirana Store          │ │
│ │ GSTIN: 27AAAAA0000A1Z5      │ │
│ │                [Edit →]     │ │
│ └─────────────────────────────┘ │
│─────────────────────────────────│
│ 👤 Team & Users          >     │
│ 🧾 Invoice Templates     >     │
│ 🖨️  Thermal Printer       >     │
│ 🔔 Notifications          >     │
│ 💳 Payment Gateway        >     │
│ 🏦 Bank Accounts          >     │
│ 🔄 Auto Reminders         >     │
│ 🌙 Theme: System          >     │
│ 💾 Backup & Restore       >     │
│─────────────────────────────────│
│ v1.0.0 · execora.app            │
└─────────────────────────────────┘
```

---

### Screen 15 — Monitoring `/monitoring`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Store Monitor    [🔄][⚙]    │
│─────────────────────────────────│
│ [Bills][Cash][Footfall][Alerts] │  ← KPI chips
│─────────────────────────────────│
│ ┌── Live Camera ─────────────┐  │
│ │                             │  │
│ │   [Camera stream 16:9]      │  │
│ │                 🔴 LIVE     │  │
│ └─────────────────────────────┘  │
│─────────────────────────────────│
│ ── Today's Stats ─────────────  │
│ 12 bills · ₹8,450 · 45 people  │
│─────────────────────────────────│
│ [Activity][Faces][Employees]    │
│─────────────────────────────────│
│  🧾 Bill #45  ₹1,200  2m ago   │
│  💳 Payment   ₹500    5m ago   │
└─────────────────────────────────┘
```

---

### Screen 16 — Login

**Mobile Layout:**
```
┌─────────────────────────────────┐
│                                 │
│          [EXECORA LOGO]         │
│       Smart Billing for         │
│       Kirana Stores             │
│                                 │
│  Phone / Email                  │
│  ┌─────────────────────────┐   │
│  │ Enter email or phone    │   │
│  └─────────────────────────┘   │
│                                 │
│  Password                       │
│  ┌─────────────────────────┐   │
│  │ ••••••••••••            │   │
│  └─────────────────────────┘   │
│                                 │
│         [Login to Execora]      │
│                                 │
│      Forgot Password?           │
└─────────────────────────────────┘
```

---

### Screen 17 — Recurring Billing `/recurring`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Recurring Bills   [⊕]        │
│─────────────────────────────────│
│ ┌── Monthly: Ramesh Store ────┐ │
│ │ Next: 01 Apr · ₹2,500      │ │
│ │ [Pause ⏸]        [Delete 🗑]│ │
│ └─────────────────────────────┘ │
│ ┌── Weekly: Priya Retail ─────┐ │
│ │ Next: 18 Mar · ₹450 🟢     │ │
│ │ [Pause ⏸]        [Delete 🗑]│ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### Screen 18 — Purchases `/purchases`

**Mobile Layout:**
```
┌─────────────────────────────────┐
│ ← Purchases         [📷 Scan]  │
│─────────────────────────────────│
│ This Month: ₹22,000 · 15 items │
│─────────────────────────────────│
│ [All] [This Week] [This Month]  │
│─────────────────────────────────│
│ ── Mar 15 ─────────────────── ─ │
│ 🛒 Rice 50kg    ₹7,500         │
│    Sharma Wholesale             │
│ 🛒 Dal 20kg     ₹2,600         │
│    Gupta Traders                │
│─────────────────────────────────│
│            [⊕ Add Purchase]     │
└─────────────────────────────────┘
```

---

## PHASE 3 — BOTTOM NAV REDESIGN

The current BottomNav has 5 tabs + More drawer. The "More" drawer opens a 3-column grid with 16 items. This works well on mobile and should be kept.

**Current tabs:** Home | Parties | Items | Bills | More

**Proposed tabs (same, with improved icons):**
| Tab | Icon | Route |
|-----|------|-------|
| Home | House | `/` |
| Parties | Users | `/parties` |
| Items | Package | `/inventory` |
| Bills | FileText | `/billing` (create) or `/invoices` (list) |
| More | Grid3x3 | Opens drawer |

**More drawer items (16):**
| | | |
|---|---|---|
| 💳 Payment | 📊 Reports | 📅 DayBook |
| 💰 CashBook | ⚡ Expenses | 🔄 Recurring |
| 📦 Purchases | ⏰ Overdue | 🛡 Monitoring |
| ⚙️ Settings | 🎙 Voice | 📥 Import |
| 🧾 Invoices | 📋 GSTR | 💼 Balance Sheet |
| ❓ Help | | |

---

## APP STORE REQUIREMENTS

### iOS App Store

**Required Assets:**
| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 1024×1024 PNG | No alpha, no rounded corners |
| iPhone 6.9" screenshots | 1320×2868 | iPhone 15 Pro Max |
| iPhone 6.7" screenshots | 1290×2796 | iPhone 14 Plus |
| iPhone 6.5" screenshots | 1242×2688 | iPhone 11 Pro Max |
| iPad Pro screenshots | 2048×2732 | |

**Info.plist permissions:**
```xml
<key>NSCameraUsageDescription</key>
<string>Execora uses camera to scan barcodes and take product photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Save invoice PDFs to your photo library</string>
<key>NSMicrophoneUsageDescription</key>
<string>Execora uses microphone for voice billing commands</string>
```

**5 Screenshots needed (each screen):**
1. Home dashboard (with KPI cards)
2. New Bill creation (items screen)
3. Payment recording
4. Invoice list (with status badges)
5. Customer management

### Android Play Store

**Required Assets:**
| Asset | Size |
|-------|------|
| Feature Graphic | 1024×500 |
| Icon | 512×512 |
| Phone screenshots | 1080×1920 min |
| Tablet screenshots | 1600×900 min |

**AndroidManifest.xml permissions:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

**Target SDK:** API 34 (Android 14)
**Min SDK:** API 26 (Android 8.0)

---

## SPRINT PLAN

### Sprint W1 — Web Responsive Foundation (5 days)
| Task | File(s) | Priority |
|------|---------|----------|
| Move BottomNav to AppLayout | AppLayout.tsx + 4 pages | P0 |
| Add pt-safe to AppLayout mobile branch | AppLayout.tsx | P0 |
| Audit all pages for pb-20 clearance | All pages | P0 |
| ClassicBilling items table → mobile cards | ClassicBilling.tsx | P0 |
| InvoiceDetail items table → overflow-x-auto | InvoiceDetail.tsx | P0 |
| Inventory: verify card-based list (no table) | Inventory.tsx | P1 |
| EmployeeSummary: already cards ✅ | — | done |

### Sprint W2 — ClassicBilling Mobile Wizard (5 days)
| Task | File(s) | Priority |
|------|---------|----------|
| 3-step wizard (mobile only) | ClassicBilling.tsx | P0 |
| ItemSearchSheet (bottom sheet) | new component | P0 |
| NumpadSheet (qty/amount entry) | new component | P0 |
| MobilePaymentStep | new component | P0 |
| Quick presets (₹200 ₹500 ₹1000 Full) | ClassicBilling.tsx | P1 |

### Sprint W3 — Other Page Polish (3 days)
| Task | File(s) | Priority |
|------|---------|----------|
| Reports mobile layout + chart resize | Reports.tsx | P1 |
| Settings sub-pages mobile audit | Settings*.tsx | P1 |
| OverduePage mobile card improvements | OverduePage.tsx | P1 |
| Purchases mobile list view | Purchases.tsx | P1 |
| CustomerDetail tab swipe | CustomerDetail.tsx | P2 |

### Sprint C1 — Capacitor Setup (2 days)
| Task | Files | Priority |
|------|-------|----------|
| Create apps/mobile directory | new | P0 |
| capacitor.config.ts | new | P0 |
| npm install all Capacitor plugins | package.json | P0 |
| npx cap add ios + android | — | P0 |
| Root pnpm scripts | package.json (root) | P0 |
| API base URL config | api.ts | P0 |
| .gitignore rules | .gitignore | P0 |

### Sprint C2 — Native Features (5 days)
| Task | Files | Priority |
|------|-------|----------|
| Haptic feedback utility + wire up | haptics.ts + 6 pages | P0 |
| Native barcode scanner | BarcodeScanner.tsx | P0 |
| Android back button handling | AppLayout.tsx | P0 |
| Deep linking (execora://) | iOS plist + Android manifest + AppLayout | P1 |
| Push notification registration | push.ts + AppLayout | P1 |
| Native PDF share | InvoiceDetail.tsx | P1 |
| Keyboard avoidance | index.css | P1 |

### Sprint C3 — App Store Submission (3 days)
| Task | Notes | Priority |
|------|-------|----------|
| Generate app icons (all sizes) | @capacitor/assets CLI | P0 |
| Create splash screens | @capacitor/assets CLI | P0 |
| iOS Info.plist permissions | Manual edit | P0 |
| Android permissions manifest | Manual edit | P0 |
| Record 5 screenshots per device | Simulator/device | P0 |
| Feature graphic (Play Store) | 1024×500 design | P0 |
| App Store Connect setup | Apple account | P0 |
| Google Play Console setup | Google account | P0 |
| TestFlight beta (iOS) | 20 beta testers | P1 |
| Internal testing (Android) | 10 internal testers | P1 |

---

## ICON GENERATION

```bash
# Install once
npm install -g @capacitor/assets

# Place a 1024×1024 PNG at apps/mobile/assets/icon.png
# Place a 2732×2732 PNG at apps/mobile/assets/splash.png

# Generate all sizes (iOS + Android)
cd apps/mobile
npx capacitor-assets generate \
  --iconBackgroundColor '#0f172a' \
  --splashBackgroundColor '#0f172a' \
  --splashBackgroundColorDark '#0f172a'
```

This auto-generates:
- iOS: AppIcon.appiconset (all 15 sizes)
- iOS: LaunchScreen.storyboard
- Android: mipmap-* (hdpi/xhdpi/xxhdpi/xxxhdpi)
- Android: splash drawables

---

## BUILD COMMANDS

```bash
# ── Development ────────────────────────────────────────────────────
# Live reload in iOS Simulator (same device as API server)
pnpm mobile:dev:ios

# ── Staging/Production ──────────────────────────────────────────────
# 1. Build web with production API URL
cd apps/web && VITE_API_BASE_URL=https://api.execora.app pnpm build

# 2. Sync to native projects
cd apps/mobile && npx cap sync

# 3. Open in Xcode / Android Studio
npx cap open ios
npx cap open android

# 4. Archive in Xcode → Upload to App Store Connect
# 5. Bundle in Android Studio → Upload to Play Store

# ── One-liner scripts ──────────────────────────────────────────────
pnpm mobile:sync       # build web + cap sync
pnpm mobile:ios        # sync + open Xcode
pnpm mobile:android    # sync + open Android Studio
```

---

## TESTING CHECKLIST

### Devices to test (minimum)
- iPhone 14 Pro (390×844, Dynamic Island) — iOS 17
- iPhone SE 3rd gen (375×667, small form) — iOS 16
- iPad Air (820×1180, tablet) — iOS 17
- Samsung Galaxy S23 (393×873) — Android 13
- Redmi Note 12 (393×873) — Android 12 (common India device)

### Screen-by-screen checklist
- [ ] Login: form renders, keyboard avoidance works, no overflow
- [ ] Home: KPI cards, quick actions, recent activity — all visible without scroll on iPhone 14
- [ ] ClassicBilling: 3-step wizard, product search sheet, numpad, save
- [ ] ClassicBilling: Thermal print works (bluetooth printer)
- [ ] Invoice list: status chips scroll, FAB above BottomNav
- [ ] Invoice detail: items table scrolls, PDF share works
- [ ] Payment: customer search, presets, method selection
- [ ] Inventory: product cards, stock adjust, barcode scan (native)
- [ ] Parties: tabs, customer card, balance shown
- [ ] Expenses: add expense sheet, category picker, list
- [ ] Day Book: period selector, filters, EOD reconciliation
- [ ] Reports: chart responsive, download/share works
- [ ] Settings: all sub-pages accessible, form inputs work
- [ ] BottomNav: all 5 tabs work, More drawer shows 16 items
- [ ] Monitoring: camera starts, face detection, live feed
- [ ] Back button (Android): works on all screens, exits only from Home
- [ ] Deep links: `execora://invoices/123` opens correct screen
- [ ] Push notifications: arrive when app is background/killed
- [ ] Offline: products + customers load from Workbox cache

---

## KNOWN RISKS & MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|------------|
| WKWebView memory limit (face AI 6MB model) | Medium | Lazy load face-api only on Monitoring screen |
| Android WebView differences from Chrome | Low | Test on Android WebView 100+ (covers 95%+ devices) |
| iOS App Store review: camera usage justification | Low | Clear permission descriptions in Info.plist |
| API latency on mobile networks (3G) | Medium | Workbox cache + optimistic UI updates |
| Keyboard covers form inputs | Medium | Capacitor Keyboard plugin resize:'body' + CSS var |
| Barcode scanner needs camera permission | Low | Request on first use, show explanation |
| Thermal printer: Capacitor BLE plugin needed | High | Use `@capacitor-community/bluetooth-le` for BT printers |

---

## FUTURE PHASES (Post-Launch)

### Phase 4 — Offline-first billing (2 weeks)
- IndexedDB queue for bills created offline
- Background sync when connection restored
- Offline product catalog (full sync on app open)
- Conflict resolution for concurrent edits

### Phase 5 — Native voice billing (2 weeks)
- On-device STT using iOS SFSpeechRecognizer / Android SpeechRecognizer (no cloud)
- Falls back to current Google STT approach
- Works in noisy kirana environments (noise cancellation)

### Phase 6 — Tablet support (1 week)
- iPad split-screen: customer list left | billing form right
- Two-panel layout for 768px+ with Capacitor

### Phase 7 — Biometric auth (1 week)
- Face ID / Touch ID login using `@capacitor-community/biometric-auth`
- Optional: auto-login with biometric after first login

### Phase 8 — NFC payments (2 weeks)
- Read NFC tap payment confirmation (Razorpay/PhonePe NFC)
- Auto-record payment on NFC tap
- Uses `@capacitor-community/nfc`

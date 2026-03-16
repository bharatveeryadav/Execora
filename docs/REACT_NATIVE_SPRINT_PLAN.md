# Execora — React Native App
## Complete Sprint Plan: End to End (All 53 Routes + All Features)
### Version 2.0 | March 16, 2026 — Full coverage audit complete

---

## IMPLEMENTATION STATUS (apps/mobile)

> **See [MOBILE_APP_IMPLEMENTATION_STATUS.md](./MOBILE_APP_IMPLEMENTATION_STATUS.md)** for detailed current state.

**Implemented:** Sprints 0–13 in `apps/mobile/` using React Navigation (not Expo Router). Design system (Button, Input, Card, Badge, Chip, Skeleton, EmptyState, Header, StatusBadge, AmountText), WebSocket layer, Dashboard with KPIs + quick actions + low stock, Invoice list/detail, Billing wizard, Customers, Payment, Items, Expenses, CashBook, DayBook, Reports, Purchases, Overdue, More grid (16 items), Settings, Coming Soon stubs.

**Path:** `apps/mobile/` (plan references `apps/native/`).

**Sprint order:** Do Sprints 15–23 first; do **Sprint 14 (Store Monitoring) last**.

---

## TECH STACK

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React Native 0.76 + Expo SDK 52 | New Architecture by default, Hermes engine, EAS Build |
| Router | Expo Router v4 | File-based routing, typed routes, Server Components ready |
| Styling | NativeWind v4 (Tailwind for RN) | Same class names as web, Tailwind v3.4 |
| State / Data | React Query v5 + Zustand v4 | Same as web — zero new learning curve |
| Auth storage | @react-native-async-storage/async-storage v2 | Official, maintained, replaces localStorage |
| Icons | @expo/vector-icons v14 (Ionicons) | Built-in, tree-shakeable |
| Charts | `victory-native` v41+ (Skia renderer) | 60fps native charts via `@shopify/react-native-skia`; v41 merged XL API into main package |
| Forms | Controlled components + react-hook-form v7 | Validation + perf, minimal bundle |
| Camera/Barcode | expo-camera v15 | Unified camera + barcode API (expo-barcode-scanner deprecated) |
| Haptics | expo-haptics v14 | Native impact/notification/selection feedback |
| Push | expo-notifications v0.29 | FCM + APNs, works with EAS |
| Printing | expo-print + expo-sharing | PDF generation + native share sheet |
| Crash Reporting | @sentry/react-native v6 (SDK v8 core) | Native + JS crash reporting, New Architecture compatible |
| OTA Updates | expo-updates v0.26 | Staged rollouts, rollback support |
| Build / CI | EAS Build + EAS Submit (Expo Application Services) | Cloud builds, no Xcode/Android Studio needed locally |

---

## PROJECT STRUCTURE

```
apps/native/
├── app/                          ← Expo Router file-based routes
│   ├── _layout.tsx               ← Root layout (providers, splash)
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx           ← Redirect to app if logged in
│   │   └── login.tsx             ← Login screen
│   ├── (app)/
│   │   ├── _layout.tsx           ← Tab bar navigator
│   │   ├── index.tsx             ← Home dashboard
│   │   ├── billing.tsx           ← Classic billing (create bill)
│   │   ├── invoices/
│   │   │   ├── index.tsx         ← Invoice list
│   │   │   └── [id].tsx          ← Invoice detail
│   │   ├── inventory/
│   │   │   ├── index.tsx         ← Product list
│   │   │   └── [id].tsx          ← Product detail/edit
│   │   ├── parties/
│   │   │   ├── index.tsx         ← Customers + Vendors tabs
│   │   │   └── [id].tsx          ← Customer detail
│   │   └── more.tsx              ← More grid (16 shortcuts)
│   ├── payment.tsx               ← Record payment
│   ├── expenses.tsx              ← Expenses
│   ├── cashbook.tsx              ← Cash book
│   ├── daybook.tsx               ← Day book + EOD reconciliation
│   ├── reports.tsx               ← Reports home
│   ├── overdue.tsx               ← Overdue invoices
│   ├── recurring.tsx             ← Recurring billing
│   ├── purchases.tsx             ← Stock purchases
│   ├── monitoring.tsx            ← Store monitor dashboard
│   ├── settings/
│   │   ├── index.tsx             ← Settings home
│   │   ├── profile.tsx           ← Company profile
│   │   ├── users.tsx             ← Team management
│   │   ├── thermal.tsx           ← Thermal printer config
│   │   ├── reminders.tsx         ← Auto reminders
│   │   └── payment-gateway.tsx   ← UPI / gateway config
│   └── pub/
│       └── [id]/[token].tsx      ← Public invoice portal (no auth)
│
├── src/
│   ├── components/
│   │   ├── ui/                   ← Base design system
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── Chip.tsx
│   │   │   └── Modal.tsx
│   │   ├── common/               ← Shared business components
│   │   │   ├── Header.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── CustomerSearch.tsx
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── AmountInput.tsx
│   │   │   ├── NumpadSheet.tsx
│   │   │   └── DatePicker.tsx
│   │   ├── billing/              ← Billing-specific
│   │   │   ├── BillingItem.tsx
│   │   │   ├── ItemSearchSheet.tsx
│   │   │   ├── PaymentStep.tsx
│   │   │   └── BillSummary.tsx
│   │   ├── invoice/
│   │   │   ├── InvoiceCard.tsx
│   │   │   └── InvoiceItemRow.tsx
│   │   └── monitoring/
│   │       ├── KPIBar.tsx
│   │       ├── EmployeeCard.tsx
│   │       └── AlertFeed.tsx
│   ├── lib/
│   │   ├── api.ts                ← Same API endpoints, adapted for RN
│   │   ├── storage.ts            ← AsyncStorage wrapper
│   │   ├── haptics.ts            ← Haptic feedback helpers
│   │   └── format.ts             ← Rupee, date, relative time formatters
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── QueryProvider.tsx
│   └── hooks/
│       ├── useAuth.ts
│       ├── useDebounce.ts
│       └── useProducts.ts        ← Cached product list for billing
│
├── assets/
│   ├── icon.png                  ← 1024×1024
│   ├── splash.png                ← 2048×2048
│   └── adaptive-icon.png         ← Android adaptive
│
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
└── global.css
```

---

## TAB BAR DESIGN

5 tabs at bottom:

| Tab | Icon | Route | Notes |
|-----|------|-------|-------|
| Home | house | `/(app)/` | KPI, quick actions, recent |
| Bills | document-text | `/(app)/invoices` | Invoice list |
| **+ New** | plus (FAB) | `/(app)/billing` | Large pill button in center |
| Parties | people | `/(app)/parties` | Customers + vendors |
| More | grid | `/(app)/more` | All other screens as grid |

---

## SPRINT BREAKDOWN

---

### SPRINT 0 — Project Setup (1 day)

**Goal:** Runnable blank app on iOS Simulator and Android Emulator.

| Task | File | Detail |
|------|------|--------|
| Init Expo project | `package.json` | Expo SDK 52, all packages |
| App config | `app.json` | Bundle ID, permissions, deep link scheme `execora://` |
| Babel + Metro | `babel.config.js`, `metro.config.js` | NativeWind + Reanimated |
| Tailwind config | `tailwind.config.js` | Colors matching web: primary `#0f172a`, accent `#3b82f6`, etc. |
| TypeScript paths | `tsconfig.json` | `@/*` → `src/*` |
| Root providers | `app/_layout.tsx` | GestureHandler, SafeArea, QueryClient, AuthProvider, Toast |
| `.gitignore` | `.gitignore` | Ignore `ios/`, `android/`, `.expo/`, `node_modules/` |
| CI / EAS config | `eas.json` | dev / preview / production build profiles |

**Deliverable:** `expo start` → app opens on simulator, shows blank screen.

---

### SPRINT 1 — Auth + Navigation Shell (1 day)

**Goal:** Login → Tab bar → Logout flow complete.

| Task | File | Detail |
|------|------|--------|
| AsyncStorage token management | `src/lib/storage.ts` | get/set/remove/getJSON wrappers |
| API client (base) | `src/lib/api.ts` | `request()` with JWT + auto-refresh + 401 handling |
| Auth context | `src/contexts/AuthContext.tsx` | login / logout / isAuthenticated / user |
| Auth layout guard | `app/(auth)/_layout.tsx` | Redirect to `/(app)` if already logged in |
| Login screen | `app/(auth)/login.tsx` | Email + password + optional tenant, haptic on success/error |
| App layout guard | `app/(app)/_layout.tsx` | Redirect to login if not authenticated |
| Tab bar | `app/(app)/_layout.tsx` | 5 tabs: Home, Bills, +New, Parties, More |
| More screen (stub) | `app/(app)/more.tsx` | 4×4 grid of shortcuts |
| Logout in Settings stub | `app/settings/index.tsx` | Shows logout button |

**Deliverable:** Login → tab bar visible → logout → back to login.

---

### SPRINT 2 — Design System Components (1 day)

**Goal:** All reusable UI primitives built and tested.

| Component | File | Features |
|-----------|------|---------|
| Button | `src/components/ui/Button.tsx` | Variants: primary/outline/ghost/danger; sizes: sm/md/lg; loading spinner |
| Input | `src/components/ui/Input.tsx` | Label, error, hint, left/right icon, NativeWind |
| Card | `src/components/ui/Card.tsx` | `Card` (static) + `PressableCard` (tappable) |
| Badge | `src/components/ui/Badge.tsx` | Variants: success/warning/danger/info/muted |
| BottomSheet | `src/components/ui/BottomSheet.tsx` | Modal + slide-up, drag handle, title, scrollable body |
| Skeleton | `src/components/ui/Skeleton.tsx` | Pulsing loader, `SkeletonCard` preset |
| EmptyState | `src/components/ui/EmptyState.tsx` | Icon + title + description + CTA |
| Chip | `src/components/ui/Chip.tsx` | Selectable filter chip (used in status filters) |
| Divider | `src/components/ui/Divider.tsx` | Horizontal/vertical divider with optional label |
| Header | `src/components/common/Header.tsx` | Back button + title + subtitle + rightSlot, respects safe-area |
| StatusBadge | `src/components/common/StatusBadge.tsx` | `paid/pending/partial/cancelled/draft` color-coded |
| AmountText | `src/components/common/AmountText.tsx` | `₹1,23,456` formatted, optional credit/debit color |
| DatePicker | `src/components/common/DatePicker.tsx` | Tappable date field → native date picker |
| NumpadSheet | `src/components/common/NumpadSheet.tsx` | 0-9 + backspace numpad in bottom sheet for amount/qty input |

**Deliverable:** Storybook-style demo screen showing all components.

---

### SPRINT 2B — Real-Time WebSocket Layer (1 day)

**Goal:** Every device and every tab for a tenant sees instant data updates — no polling, no manual refresh.

> This sprint must ship before any data screen (Dashboard, Invoices, Parties, etc.). It is the foundation of real-time sync across web + native + multiple devices simultaneously.

---

#### How it works (architecture)

```
Device A (phone)        Device B (tablet)       Device C (web)
    |                        |                        |
    └── WS conn ──┐          └── WS conn ──┐          └── WS conn ──┐
                  │                        │                        │
                  ▼                        ▼                        ▼
              API Server — TenantBroadcaster (broadcaster.ts)
                  │
                  ├── Map<tenantId, Set<WebSocket>>   ← strict per-tenant isolation
                  │
              REST route mutates DB
              └─→ broadcaster.send(tenantId, 'invoice:created', {...})
                  └─→ ALL 3 devices receive JSON event instantly
                      └─→ React Query cache invalidated
                          └─→ UI re-renders with fresh data
```

**Tenant isolation guarantee:** The `TenantBroadcaster` stores connections in a `Map<tenantId, Set<WebSocket>>`. A `send(tenantId, ...)` call ONLY fans out to sockets registered under that exact `tenantId`. Tenant A's events never reach Tenant B's devices.

---

#### Files to create: `apps/native/src/lib/`

**`ws.ts` — WebSocket singleton for React Native**

```ts
import { storage } from './storage';

const TOKEN_KEY = 'execora_token';
const SESSION_KEY = 'execora_ws_session';

type Handler = (payload: unknown) => void;

class ExecoraWSClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;  // starts at 1s, doubles up to 30s
  private sessionId: string | null = null;
  private _intentionalDisconnect = false;

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async connect(apiBaseUrl: string) {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    this._intentionalDisconnect = false;

    const token = await storage.get(TOKEN_KEY);
    const savedSession = await storage.get(SESSION_KEY);
    const wsBase = apiBaseUrl.replace(/^http/, 'ws');

    // Include sessionId for reconnect — server restores Redis voice context
    const sessionParam = savedSession ? `&sessionId=${savedSession}` : '';
    const url = token
      ? `${wsBase}/ws?token=${token}${sessionParam}`
      : `${wsBase}/ws${sessionParam ? '?' + sessionParam.slice(1) : ''}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectDelay = 1000;  // reset backoff on success
      this.emit('__connected__', {});
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data) as { type: string; [k: string]: unknown };
        // Capture sessionId from server welcome message
        if (msg.type === 'voice:start' && msg.data && (msg.data as any).sessionId) {
          const sid = (msg.data as any).sessionId as string;
          this.sessionId = sid;
          storage.set(SESSION_KEY, sid).catch(() => {});
        }
        this.emit(msg.type, msg);
      } catch { /* ignore malformed */ }
    };

    this.socket.onclose = () => {
      this.emit('__disconnected__', {});
      if (!this._intentionalDisconnect) this._scheduleReconnect(apiBaseUrl);
    };

    this.socket.onerror = () => {
      // onclose fires after onerror — reconnect handled there
    };
  }

  private _scheduleReconnect(apiBaseUrl: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      this.connect(apiBaseUrl);
    }, this.reconnectDelay);
  }

  disconnect() {
    this._intentionalDisconnect = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.socket?.close();
    this.socket = null;
  }

  send(type: string, data?: Record<string, unknown>) {
    if (!this.isConnected) return;
    this.socket!.send(JSON.stringify(data ? { type, data } : { type }));
  }

  on(type: string, handler: Handler): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  private emit(type: string, payload: unknown) {
    this.listeners.get(type)?.forEach((h) => { try { h(payload); } catch {} });
  }
}

export const wsClient = new ExecoraWSClient();
```

Key differences from web `ws.ts`:
- `localStorage` → `await storage.get()` (AsyncStorage)
- Exponential backoff reconnect (1s → 2s → 4s → … → 30s cap) — handles app backgrounding
- Session ID persistence → voice context survives reconnect
- No `import.meta.env` (not available in RN) → `apiBaseUrl` passed in from config

---

**`useWsInvalidation.ts` — React Query cache invalidation hook**

```ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/ws';

// Maps every WS event type to the React Query keys it should invalidate.
// Must stay in sync with backend broadcaster.send() calls.
export const WS_EVENT_QUERIES: Record<string, string[][]> = {
  // ── Invoices ─────────────────────────────────────────────────────────────
  'invoice:created':   [['invoices'], ['summary'], ['customers']],
  'invoice:confirmed': [['invoices'], ['summary'], ['customers']],
  'invoice:updated':   [['invoices']],
  'invoice:cancelled': [['invoices'], ['summary'], ['customers']],
  // NOTE: 'invoice:draft' does NOT exist — no backend route emits it. Do not add.
  // ── Payments ─────────────────────────────────────────────────────────────
  'payment:recorded':  [['customers'], ['summary'], ['ledger'], ['cashbook'], ['invoices']],
  // ── Customers ────────────────────────────────────────────────────────────
  'customer:created':  [['customers'], ['summary']],
  'customer:deleted':  [['customers'], ['summary']],
  'customer:updated':  [['customers']],
  // NOTE: 'customer:balance' does NOT exist — balance changes arrive via 'payment:recorded'
  // ── Products / Inventory ─────────────────────────────────────────────────
  'stock:updated':     [['products'], ['lowStock']],
  'product:created':   [['products'], ['lowStock']],
  'product:updated':   [['products'], ['lowStock']],
  // ── Expenses / Purchases ─────────────────────────────────────────────────
  'expense:created':   [['expenses'], ['cashbook']],
  'expense:deleted':   [['expenses'], ['cashbook']],
  'purchase:created':  [['purchases'], ['cashbook']],
  'purchase:deleted':  [['purchases'], ['cashbook']],   // expense.routes.ts DELETE /purchases/:id
  // ── Drafts (staging system) ───────────────────────────────────────────────
  'draft:created':     [['drafts']],
  'draft:updated':     [['drafts']],
  'draft:confirmed':   [['drafts'], ['purchases'], ['products'], ['expenses']],
  'draft:discarded':   [['drafts']],
  // ── Reminders ────────────────────────────────────────────────────────────
  'reminder:created':  [['reminders']],
  'reminder:cancelled':[['reminders']],
  'reminders:updated': [['reminders']],                 // ai.routes.ts POST /ai/predictive-reminders
  // ── Monitoring ───────────────────────────────────────────────────────────
  'monitoring:event':  [['monitoring']],
  'monitoring:snap':   [['monitoring']],
};

/**
 * Call once per screen. Subscribes to WS events that touch the given scopes
 * and invalidates React Query caches, causing automatic background refetch.
 *
 * @param scopes  e.g. ['invoices', 'customers'] — or 'all' to subscribe to everything
 *
 * Example:
 *   function InvoiceListScreen() {
 *     useWsInvalidation(['invoices', 'summary']);
 *     // ...
 *   }
 */
export function useWsInvalidation(scopes: string[] | 'all' = 'all') {
  const qc = useQueryClient();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    for (const [event, keys] of Object.entries(WS_EVENT_QUERIES)) {
      if (scopes !== 'all') {
        const relevant = keys.some((k) => scopes.includes(k[0]));
        if (!relevant) continue;
      }
      const off = wsClient.on(event, () => {
        for (const key of keys) {
          qc.invalidateQueries({ queryKey: key });
        }
      });
      cleanups.push(off);
    }

    return () => cleanups.forEach((off) => off());
  }, [qc]);
}
```

---

**`WSProvider.tsx` — Connect on login, disconnect on logout**

```tsx
// apps/native/src/components/WSProvider.tsx
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { wsClient } from '@/lib/ws';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';

export function WSProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { apiBaseUrl } = useConfig();

  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect();
      return;
    }
    wsClient.connect(apiBaseUrl);

    // Reconnect when app comes back to foreground (background kills WS)
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isAuthenticated) {
        wsClient.connect(apiBaseUrl);
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, apiBaseUrl]);

  return <>{children}</>;
}
```

Add `<WSProvider>` to `app/_layout.tsx` inside `<AuthProvider>`:

```tsx
<AuthProvider>
  <WSProvider>       {/* ← connects WS once auth is ready */}
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  </WSProvider>
</AuthProvider>
```

---

#### Complete WS event → broadcaster.send() reference

Every REST mutation in the backend calls `broadcaster.send(tenantId, event, payload)`. All events are tenant-scoped. Here is the complete table:

| WS Event | Triggered by | Invalidates |
|----------|-------------|-------------|
| `invoice:created` | POST /invoices | invoices, summary, customers |
| `invoice:confirmed` | POST /invoices/:id/convert | invoices, summary, customers |
| `invoice:updated` | PATCH /invoices/:id | invoices |
| `invoice:cancelled` | POST /invoices/:id/cancel | invoices, summary, customers |
| `payment:recorded` | POST /ledger/payment, POST /ledger/mixed-payment | customers, summary, ledger, cashbook, invoices |
| `customer:created` | POST /customers | customers, summary |
| `customer:updated` | PUT /customers/:id | customers |
| `customer:deleted` | DELETE /customers/:id | customers, summary |
| ~~`customer:balance`~~ | Not emitted — use `payment:recorded` instead | customers, summary |
| `stock:updated` | PATCH /products/:id/stock | products, lowStock |
| `product:created` | POST /products, draft confirm (product type) | products, lowStock |
| `product:updated` | PUT /products/:id, draft confirm (stock_adjustment) | products, lowStock |
| `expense:created` | POST /expenses | expenses, cashbook |
| `expense:deleted` | DELETE /expenses/:id | expenses, cashbook |
| `purchase:created` | draft confirm (purchase_entry), POST /expenses (purchase type) | purchases, cashbook |
| `purchase:deleted` | DELETE /expenses/:id (purchase type) | purchases, cashbook |
| `draft:created` | POST /drafts | drafts |
| `draft:updated` | PUT /drafts/:id | drafts |
| `draft:confirmed` | POST /drafts/:id/confirm | drafts, purchases, products, expenses |
| `draft:discarded` | DELETE /drafts/:id | drafts |
| `reminder:created` | POST /reminders, POST /reminders/bulk | reminders |
| `reminder:cancelled` | PUT /reminders/:id (status=cancelled) | reminders |
| `reminders:updated` | POST /ai/predictive-reminders | reminders |
| `monitoring:event` | POST /monitoring/events, POST /monitoring/cash-reconciliation | monitoring |
| `monitoring:snap` | POST /monitoring/snap | monitoring |

**Tenant isolation:** The server-side `TenantBroadcaster` (fixed in this session) only delivers events to WebSocket connections registered under the same `tenantId`. Tenant A's events never reach Tenant B's devices.

---

**Deliverable:** All screens auto-refresh when any device in the same tenant makes a mutation. Open two devices on the same account → create a bill on Device A → Device B's invoice list and dashboard update instantly within ~100ms.

---

### SPRINT 3 — Home Dashboard (1 day)

**Goal:** Home screen live with real API data.

**Screen:** `app/(app)/index.tsx`

| Section | Data source | Detail |
|---------|------------|--------|
| Header | Auth context | Greeting ("Good morning, Ramesh"), notification bell with badge, avatar |
| KPI Row (3 cards) | `GET /api/v1/reports/summary?from=today` | Bills Today, Revenue, Pending — tap each to drill down |
| Today's Profit card | Same summary | Green if positive, red if negative, trending icon |
| Quick Actions (4 buttons) | Static | New Bill → `/billing`, Payment → `/payment`, Inventory → `/inventory`, Reports → `/reports` |
| Recent Bills (last 8) | `GET /api/v1/invoices?limit=8` | Invoice card: #no + customer name + time + amount + status badge |
| Low Stock alert strip | `GET /api/v1/products/low-stock` | Shows if any items low, tappable → inventory |
| Pull-to-refresh | React Query `refetch` | Refreshes summary + invoices |

**Deliverable:** Home screen shows real today's data, refreshes on pull.

---

### SPRINT 4 — Invoices List + Detail (2 days)

#### Day 1 — Invoice List

**Screen:** `app/(app)/invoices/index.tsx`

| Section | Detail |
|---------|--------|
| Header | "Bills" title + search icon + filter icon |
| Doc type tabs | Sales · Purchase · Quotation (horizontal scroll) |
| Status filter chips | All · Draft · Pending · Partial · Paid · Cancelled (horizontal scroll) |
| Date filter | Today / Yesterday / This Week / This Month / Custom (bottom sheet) |
| Summary strip | Total value + bill count for current filter |
| Invoice list | FlatList: card per invoice — icon + #no + customer + date + amount + status |
| FAB | Fixed "+" button → `/billing` |
| Empty state | "No bills yet" with CTA |
| Loading state | 5× SkeletonCard |
| Search | Filters locally on invoice #, customer name |

#### Day 2 — Invoice Detail

**Screen:** `app/(app)/invoices/[id].tsx`

| Section | Detail |
|---------|--------|
| Header | Invoice #no + back button + share/more menu |
| Status banner | Full-width colored banner: PENDING ₹1,200 |
| Customer card | Name + phone tap → call, address if present |
| Items list | Product name · qty · unit · rate · discount% · line total; scrollable |
| Tax breakdown | CGST + SGST (or IGST) + totals table |
| Payment history | List of payments made against this invoice |
| Payment status | Paid/Pending/Partial summary card |
| Action buttons (always visible at bottom) | Record Payment · Share |
| "..." menu (top right) | Print PDF · Download · Email · Edit Notes · Cancel invoice · Undo cancel |
| Cancel confirm | Alert dialog with reason input |
| Record payment sheet | Amount + method + reference + date |

**Deliverable:** Full invoice list with filters + detail with all actions.

---

### SPRINT 5 — Classic Billing (3 days)

**Most critical screen.** Kirana owners use this 50–200× daily.

**Screen:** `app/(app)/billing.tsx`

#### 3-Step Mobile Wizard

**Step 1 — Customer (can skip)**
- CustomerSearch component (search or "Walk-in" shortcut)
- Walk-in toggle (most common, skip to Step 2 in one tap)

**Step 2 — Items (main step)**
- Search bar + barcode scan icon
- Tapping search → `ItemSearchSheet` bottom sheet (FlatList of products, recently used at top)
- Each added item shows as card: product name · unit · [−] qty [+] · ₹rate · 🗑
- Tapping qty → `NumpadSheet` for fast number entry
- Long-press item card → edit rate or discount
- "Add Item" button at bottom
- Live total bar at bottom: "3 items · ₹570 incl. GST" + Next →

**Step 3 — Payment**
- Bill summary (items list, condensed)
- Method selector: Cash · UPI · Card · Credit (4 large buttons)
- Amount received field (pre-filled with total, editable for partial)
- Quick presets: ₹200 · ₹500 · ₹1000 · Full amount
- Change to return: calculated live ("Return ₹30")
- Notes field (optional)
- Template selector: 4 invoice templates (thumbnail row)
- "Save Bill" button → POST /api/v1/invoices → success haptic + confetti + navigate to invoice detail

**Components built:**
| Component | File |
|-----------|------|
| Billing wizard step controller | `app/(app)/billing.tsx` |
| Item search bottom sheet | `src/components/billing/ItemSearchSheet.tsx` |
| Billing item card (qty +/−) | `src/components/billing/BillingItem.tsx` |
| Bill summary panel | `src/components/billing/BillSummary.tsx` |
| Payment step | `src/components/billing/PaymentStep.tsx` |

**API:** `POST /api/v1/invoices`

**Deliverable:** Full end-to-end bill creation from walk-in to saved invoice with haptic success.

---

### SPRINT 6 — Inventory / Products (2 days)

**Screen:** `app/(app)/inventory/index.tsx` + `app/(app)/inventory/[id].tsx`

#### Day 1 — Product List

| Section | Detail |
|---------|--------|
| Header | "Items" + search + add button |
| Filter chips | All · Low Stock · Out of Stock · Category |
| Low stock alert banner | "3 items need restocking" → filtered view |
| Product list (FlatList) | Card: emoji/image + name + stock level + price + unit |
| Stock level indicator | Green bar (normal) → yellow (low) → red (out) |
| Quick action buttons | [+ Add Stock] [Adjust] per card |
| Add/Edit product | Bottom sheet with: name, category, unit, MRP, cost, GST%, HSN, barcode, stock |
| Barcode scan | Expo Camera scanner inline in add sheet |
| Pull-to-refresh | Refetch product list |
| FAB | "+" → add product bottom sheet |

#### Day 2 — Product Detail

| Section | Detail |
|---------|--------|
| Header | Product name + edit button |
| Product info card | Image, name, SKU, barcode, category, unit |
| Pricing card | MRP, cost, GST rate, HSN |
| Stock card | Current stock + low threshold + adjust button |
| Stock adjustment | Bottom sheet: +/− amount + note (purchase/sale/damage/manual) |
| Sales history | Last 10 invoices containing this product |
| Delete | Confirmation alert |

**API:** `GET/POST/PUT/DELETE /api/v1/products`, `POST /api/v1/products/:id/stock`

**Deliverable:** Full product CRUD + stock adjustment + barcode scan.

---

### SPRINT 7 — Parties (Customers + Vendors) (2 days)

#### Day 1 — Parties List

**Screen:** `app/(app)/parties/index.tsx`

| Section | Detail |
|---------|--------|
| Header | "Parties" + search + add |
| Tabs | Customers · Vendors |
| Summary bar | Total receivable (customers) / total payable (vendors) |
| Customer list | Card: avatar (initials) + name + phone + outstanding balance + aging badge |
| Aging badges | 🔴 30+ days · 🟡 7–30 days · ⚪ fresh |
| FAB | Add Customer / Add Vendor |
| Search | Live filter on name/phone |

#### Day 2 — Customer Detail

**Screen:** `app/(app)/parties/[id].tsx`

| Tab | Content |
|-----|---------|
| Overview | Contact info (phone → tap to call, WhatsApp button), address, tags, credit limit, notes |
| Bills | All invoices for this customer — same card list as Invoices screen, filtered |
| Ledger | Running balance table: date · description · debit · credit · balance |
| Reminders | Create/view payment reminders; WhatsApp send button |

| Action | Detail |
|--------|--------|
| Edit | Bottom sheet: name, phone, email, address, credit limit, tags, notes |
| Delete | Confirm dialog |
| Record Payment | Shortcut → `/payment` pre-filled with this customer |
| WhatsApp | Open WhatsApp chat (wa.me link) |

**API:** `GET/POST/PUT/DELETE /api/v1/customers`, `GET /api/v1/customers/:id/ledger`

**Deliverable:** Full customer CRUD + ledger + bill history.

---

### SPRINT 8 — Payment Recording (1 day)

**Screen:** `app/payment.tsx`

| Section | Detail |
|---------|--------|
| Header | "Record Payment" + back |
| Customer select | CustomerSearch component (pre-fillable via route params `?customerId=`) |
| Outstanding balance | Shows current balance once customer selected |
| Method selector | Cash · UPI · Card · Bank (4 large equal-width buttons) |
| Amount input | Numeric, pre-filled with full balance |
| Quick presets | ₹200 · ₹500 · ₹1000 · Full (dynamic based on balance) |
| Reference field | UPI transaction ID, cheque no, etc. |
| Date field | Default today, backdatable |
| Apply to | Radio: Oldest first · Specific invoices |
| Invoice selector | Checkboxes (shown if "Specific" chosen) |
| Summary card | Previous balance · Payment · New balance |
| Save | POST /api/v1/payments → haptic success → receipt sheet |
| Receipt sheet | Invoice-style receipt: customer, amount, method, balance; WhatsApp share button |

**API:** `POST /api/v1/payments`

**Deliverable:** Full payment recording with receipt and WhatsApp share.

---

### SPRINT 9 — Expenses (1 day)

**Screen:** `app/expenses.tsx`

| Section | Detail |
|---------|--------|
| Header | "Expenses" + add button |
| This Month KPI | Total + entry count + top category (3 cards) |
| Period tabs | All · This Week · This Month (chips) |
| Search | Filter by category/vendor/note |
| Category bar chart | Top 5 categories as horizontal bars |
| Expense list | Grouped by date: emoji + category + amount + vendor/note + delete swipe |
| Add expense sheet | Category (10 options), amount, vendor, note, date |
| Delete | Swipe-left or long-press → confirm |

**Categories:** Stock Purchase · Rent · Salary · Electricity · Transport · Repairs · Marketing · Packaging · Bank Charges · Miscellaneous

**API:** `GET/POST/DELETE /api/v1/expenses`

**Deliverable:** Full expense tracking with chart.

---

### SPRINT 10 — Day Book + Cash Book (2 days)

#### Day 1 — Day Book

**Screen:** `app/daybook.tsx`

| Section | Detail |
|---------|--------|
| Header | "Day Book" + refresh |
| Period selector | Today · Yesterday · This Week · This Month · Last Month (horizontal chips) |
| Summary strip | Money In · Money Out · Net (3 cards, color-coded) |
| Type filter chips | All · Bills · Payments · Expenses · Cash In · Cash Out |
| Transaction list | Grouped by date: arrow icon (↗/↙) + label + sublabel + amount (green/red) |
| EOD Reconciliation (collapsible) | Opening cash + receipts + outflows = expected; actual input field; discrepancy shown; save to API |

#### Day 2 — Cash Book

**Screen:** `app/cashbook.tsx`

| Section | Detail |
|---------|--------|
| Net cash card | Big number: +₹3,450 green or −₹1,200 red |
| Today In / Today Out | 2-column summary |
| Date range | From/To date pickers |
| Transaction list | Grouped by date: arrow + category + note + amount |
| Add expense shortcut | Floating button → expenses |

**API:** `GET /api/v1/reports/daybook`, `GET /api/v1/reports/cashbook`

**Deliverable:** Day book + cash book with period filters and EOD reconciliation.

---

### SPRINT 11 — Reports (2 days)

**Screen:** `app/reports.tsx`

#### Day 1 — Summary + Charts

| Section | Detail |
|---------|--------|
| Period selector | Today · Yesterday · Week · Month · FY · Custom (date range picker) |
| KPI cards | Revenue · Expenses · Profit · Bills Count |
| Revenue vs Expenses bar chart | Victory Native BarChart, 30-day or weekly bars |
| Top customers card | Top 5 by revenue this period |
| Top products card | Top 5 by qty sold this period |

#### Day 2 — Report List + GST

| Section | Detail |
|---------|--------|
| Quick reports list | Sales Summary · P&L · Party Statement · Stock Summary → each opens detail screen |
| GST reports section | GSTR-1 · GSTR-3B → tabular data, download PDF |
| Aging report | Customer aging buckets: 0–7d · 7–30d · 30–60d · 60d+ |
| Download / Share | PDF via expo-print + expo-sharing |

**API:** `GET /api/v1/reports/summary`, `GET /api/v1/reports/gstr1`, `GET /api/v1/reports/aging`

**Deliverable:** Summary dashboard + charts + GSTR-1 + aging report, all downloadable.

---

### SPRINT 12 — Overdue + Recurring + Purchases (2 days)

#### Overdue — `app/overdue.tsx`

| Section | Detail |
|---------|--------|
| Header | Total outstanding across all customers |
| Search + Sort | Sort by: Most Due · Oldest · Newest |
| Customer cards | Avatar + name + phone + outstanding + aging badge |
| Expand per customer | List of unpaid invoices with amounts |
| Bulk WhatsApp reminder | Select customers → compose message → open WhatsApp |
| Record payment | Tap customer → prefilled `/payment` |

#### Recurring — `app/recurring.tsx`

| Section | Detail |
|---------|--------|
| Template list | Customer + frequency + next run date + status toggle |
| Add template sheet | Customer select · Frequency (weekly/monthly/quarterly) · Item rows · Amount · Start date |
| Toggle active/paused | Switch per template |
| Delete | Swipe → confirm |

#### Purchases — `app/purchases.tsx`

| Section | Detail |
|---------|--------|
| Header | "Purchases" + scan bill button |
| This Month total | KPI strip |
| Period tabs | All · This Week · This Month |
| Purchase list | Category emoji + item + qty + unit + rate + vendor |
| Add purchase sheet | Category · item name · qty · unit · rate · vendor · date |
| Bill scan (OCR) | Camera → send to `/api/v1/ocr/bill` → auto-fill add form |
| Delete | Swipe left |

**Deliverable:** All 3 screens complete.

---

### SPRINT 13 — More Screen + Settings (2 days)

#### More Screen — `app/(app)/more.tsx`

4-column grid of 16 shortcuts:

| | | | |
|---|---|---|---|
| 💳 Payment | 📊 Reports | 📅 Day Book | 💰 Cash Book |
| ⚡ Expenses | 🔄 Recurring | 📦 Purchases | ⏰ Overdue |
| 🛡 Monitor | ⚙️ Settings | 📥 Import | 🧾 GST |
| 💼 Balance | 📋 Aging | 🔔 Alerts | ❓ Help |

Each tile: emoji + label, tappable → route.

#### Settings — `app/settings/index.tsx`

| Section | Items |
|---------|-------|
| Business Profile | Name, GSTIN, phone, address, logo |
| Team & Users | List of users + add user bottom sheet |
| Invoice Templates | 4 template thumbnails, select default |
| Thermal Printer | BT printer search + connect + test print |
| Notifications | Push alerts toggle per event type |
| Payment Gateways | UPI gateway API key config |
| Banks | Bank account details for invoices |
| Auto Reminders | WhatsApp reminder schedule |
| Theme | Light / Dark / System |
| API Server | URL input (for self-hosted) |
| App Version + Logout | |

**Deliverable:** More grid + complete settings with all sub-pages.

---

### SPRINT 14 — Store Monitoring (2 days) — **DO LAST**

> Implement Sprints 15–23 first; do Monitoring last.

**Screen:** `app/monitoring.tsx`

#### Day 1 — Dashboard + Activity

| Section | Detail |
|---------|--------|
| Header | "Store Monitor" + refresh + settings |
| KPI bar | Bills · Cash Expected · Footfall · Conversion% · Alerts |
| Hourly chart | 24-bar chart using Victory Native, peak hour highlighted |
| Alert banner | Shows unread alert count, tap → alert list |
| Activity feed | FlatList of monitoring events, live via polling every 10s |
| Cash reconciliation | EOD cash entry card |

#### Day 2 — Employee Cards + Camera

| Section | Detail |
|---------|--------|
| Employee tab | Cards with risk badges (OK / Watch / Alert) |
| Cancel rate bar | Color-coded progress bar per employee |
| Tap employee card | Full activity timeline sheet |
| Camera tab | expo-camera live view (counter-side mode) |
| Drawer log button | "Log Drawer Opened" — checks for no-ring |
| Alerts tab | Full alert list with mark-read |

**API:** All `/api/v1/monitoring/*` endpoints

**Deliverable:** Store monitoring dashboard with employee risk cards and camera.

---

### SPRINT 15 — Native Integrations (2 days)

#### Day 1 — Barcode Scanner

- Replace expo-barcode-scanner stub with full camera UI
- Scan screen overlay: viewfinder box + torch toggle + cancel
- On decode: vibrate + callback with result
- Used in: Inventory add/edit, Billing item search
- File: `src/components/common/BarcodeScanner.tsx`

#### Day 2 — Push Notifications + Deep Links

**Push Notifications:**
- Register with expo-notifications on app start
- Send device token to `POST /api/v1/push/register`
- Handle foreground: show Toast
- Handle background tap: deep-link to relevant screen
- Notification types: bill.created · payment.received · low.stock · overdue.alert

**Deep Links (execora://):**
- `execora://invoices/123` → opens invoice detail
- `execora://payment?customerId=abc` → opens payment pre-filled
- `execora://invoices` → opens invoice list
- Configured in `app.json` scheme + `App.addListener('url')` in root layout

**Deliverable:** Push notifications working + deep links navigate correctly.

---

### SPRINT 16 — Public Invoice Portal (1 day)

**Screen:** `app/pub/[id]/[token].tsx`

| Section | Detail |
|---------|--------|
| No auth required | Open without login |
| Shop header | Shop name + logo |
| Invoice number | Large, prominent |
| Status badge | Paid ✅ / Pending ⏳ / Cancelled ❌ |
| Items list | Product · qty · rate · amount |
| Tax breakdown | GST breakdown |
| Total | Bold total amount |
| Payment QR | UPI QR code if configured |
| Download PDF | expo-print + expo-sharing |

**Deliverable:** Customer can open invoice link, see details, download PDF.

---

### SPRINT 17 — Thermal Printing (1 day)

**Bluetooth thermal printer support (popular in kirana stores):**

| Task | Detail |
|------|--------|
| BLE printer search | Scan for nearby bluetooth devices, filter thermal printers |
| Pair + save | Save paired printer to AsyncStorage |
| Print receipt | Format bill as ESC/POS commands → send via BLE |
| Fallback | If no BT printer → generate PDF via expo-print → share sheet |
| Test print | Settings → Thermal Printer → "Test Print" button |
| Library | `@capacitor-community/bluetooth-le` or `react-native-ble-plx` |

**Deliverable:** BT printer pairing + receipt printing from billing screen.

---

### SPRINT 18 — Offline Mode (2 days)

**Goal:** Core billing works without internet.

| Feature | Detail |
|---------|--------|
| Offline product cache | Fetch + cache all products to AsyncStorage on app open |
| Offline customer cache | Same — cache customer list |
| Offline bill queue | Bills created offline stored in AsyncStorage queue |
| Background sync | When connection restored → process queue → sync to server |
| Network indicator | "Offline mode" banner when no connectivity |
| Conflict handling | If server has newer data → prompt user |
| Library | NetInfo (`@react-native-community/netinfo`) for connectivity detection |

**File:** `src/lib/offlineQueue.ts`

**Deliverable:** Create + save bills offline, auto-sync when online.

---

### SPRINT 19 — Polish + QA (3 days)

#### Day 1 — Animations + UX

| Task | Detail |
|------|--------|
| Screen transitions | Slide from right (default), fade for tabs |
| List animations | FlatList items fade-in on load |
| Success animation | Lottie confetti on bill save + payment record |
| Loading states | Skeleton cards on every list/data screen |
| Error states | Error card with retry button on every screen |
| Empty states | Illustrated empty states with CTAs |

#### Day 2 — Haptics + Accessibility

| Task | Detail |
|------|--------|
| Haptic feedback | All buttons: light; Save/Record: success; Errors: error |
| Font scaling | All Text components respect system font size |
| Touch targets | All interactive elements ≥ 44×44px |
| Dark mode | All colors use NativeWind dark: variants |
| Reduced motion | Respect `accessibilityPreferences.reducedMotion` |

#### Day 3 — Device Testing

| Device | OS | Test |
|--------|----|------|
| iPhone 15 Pro | iOS 17 | Primary test device |
| iPhone SE 3 | iOS 16 | Small screen validation |
| iPad Air | iPadOS 17 | Tablet layout |
| Samsung Galaxy S23 | Android 13 | Primary Android |
| Redmi Note 12 | Android 12 | Budget device (common in India) |
| OnePlus Nord | Android 11 | Mid-range |

**Test checklist per device:**
- [ ] Login flow
- [ ] Bill creation (3-step wizard)
- [ ] Keyboard avoidance on all forms
- [ ] BottomSheet drag dismiss
- [ ] Barcode scanner camera permission
- [ ] Haptic feedback on iOS
- [ ] Back button (Android)
- [ ] Deep link opens correct screen
- [ ] Push notification arrives in background
- [ ] Offline bill creation + sync

---

### SPRINT 20 — Store Compliance + Submission (3 days)

> Most rejections come from incomplete privacy configuration. Do every step below before submitting.

---

#### Day 1 — Apple App Store Compliance

##### A. Privacy Manifest (Required since May 2024 — rejection without this)

Create `apps/native/ios/PrivacyInfo.xcprivacy` (XML file in Xcode project):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- UserDefaults: used by AsyncStorage + expo-updates -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <!-- File timestamp: used by expo-file-system -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- User ID: collected for authentication -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <!-- Crash Data: Sentry crash reporting -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeCrashData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAnalytics</string></array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

Add to `app.json` under `expo.ios.infoPlist` (in Expo managed workflow, these become NSUsageDescription strings):

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Scan product barcodes to quickly add items to your bills",
        "NSMicrophoneUsageDescription": "Record voice commands to create bills hands-free",
        "NSPhotoLibraryUsageDescription": "Upload your shop logo for invoices",
        "NSPhotoLibraryAddUsageDescription": "Save invoice PDFs to your photo library",
        "NSBluetoothAlwaysUsageDescription": "Connect to your thermal receipt printer",
        "NSBluetoothPeripheralUsageDescription": "Connect to your thermal receipt printer",
        "NSLocalNetworkUsageDescription": "Discover thermal printers on your local network"
      }
    }
  }
}
```

> **Rule:** Strings must describe exactly what the feature does — vague strings like "for app features" cause automatic rejection.

##### B. App Store Connect — Privacy Nutrition Labels

In App Store Connect → App Privacy → Data Types, declare:

| Data Type | Collected? | Linked to User | Used for Tracking | Purpose |
|-----------|-----------|----------------|-------------------|---------|
| Name | Yes | Yes | No | App Functionality |
| Email Address | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Crash Data | Yes | No | No | Analytics |
| Performance Data | Yes | No | No | Analytics |
| Other Diagnostic Data | Yes | No | No | Analytics |

Do **NOT** declare: Location, Contacts, Browsing History, Search History, Financial Info, Health Info — we don't collect these.

##### C. Export Compliance

In App Store Connect → Compliance:
- "Does your app use encryption?" → **Yes**
- "Does it use only encryption that is exempt?" → **Yes** (standard HTTPS/TLS only — no custom encryption)
- This exempt status means no US export compliance documentation needed.

##### D. App Store Screenshots (exact dimensions required)

| Device | Resolution | Required |
|--------|-----------|---------|
| iPhone 15 Pro Max (6.7") | 1290 × 2796 px | ✅ Mandatory |
| iPhone SE 3 (4.7") | 750 × 1334 px | Optional (6.7" covers it) |
| iPad Pro 12.9" | 2048 × 2732 px | Required if supporting iPad |

5 screenshots per device: **Home Dashboard → Create Bill (Step 2) → Invoice List → Customer Ledger → Reports**

Screenshots must be actual device screenshots — not mockups or design files. Use iPhone Simulator → File → Take Screenshot.

##### E. App Store Metadata

```
Name (30 chars max):    Execora — GST Billing
Subtitle (30 chars):    Kirana Store Billing & Accounts
Category:               Business
Secondary Category:     Finance
Age Rating:             4+
Privacy Policy URL:     https://execora.app/privacy
Support URL:            https://execora.app/support
Keywords (100 chars):   billing,invoice,GST,kirana,vyapar,khata,dukan,upi,receipt,accounts
```

---

#### Day 2 — Google Play Store Compliance

##### A. Target API Level 34 (Mandatory since August 2024)

New apps **must** target Android 14 (API 34). Set in `app.json`:

```json
{
  "expo": {
    "android": {
      "compileSdkVersion": 35,
      "targetSdkVersion": 34,
      "minSdkVersion": 26,
      "package": "com.execora.billing",
      "versionCode": 1,
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.VIBRATE",
        "android.permission.INTERNET",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.POST_NOTIFICATIONS"
      ]
    }
  }
}
```

> `minSdkVersion: 26` = Android 8.0 — covers 97%+ of active Android devices. Do not set lower.
> `POST_NOTIFICATIONS` — Android 13+ requires explicit permission for push notifications.
> `BLUETOOTH_CONNECT` + `BLUETOOTH_SCAN` — Android 12+ bluetooth permissions (thermal printer).

##### B. App Bundle (.aab) — NOT .apk

Play Store requires `.aab` (Android App Bundle) for all new app submissions since 2021. APKs are rejected.
EAS already produces `.aab` by default for `production` profile — do not override with `buildType: "apk"`.

##### C. Data Safety Section (Play Console)

In Play Console → App Content → Data Safety, declare:

| Data Type | Collected | Shared | Required | Encrypted | User can delete |
|-----------|----------|--------|---------|----------|----------------|
| Name | Yes | No | No | Yes | Yes |
| Email address | Yes | No | Yes (login) | Yes | Yes |
| User IDs | Yes | No | Yes | Yes | Yes |
| Crash logs | Yes | No (Sentry only) | No | Yes | No |
| Diagnostics | Yes | No | No | Yes | No |

Check: "Data is encrypted in transit" ✅ and "Users can request data deletion" ✅ (add a data deletion request form at your privacy policy URL).

##### D. Play Store Listing

```
Title (30 chars):          Execora GST Billing
Short description (80):    GST billing, invoices & khata for kirana stores
Full description (4000):   [write full description — cover: billing features,
                            GST compliance, offline mode, thermal printing,
                            UPI payments, customer ledger]
Category:                  Business
Content rating:            Everyone
Tags:                      billing, GST, invoice, kirana, business
Feature graphic:           1024 × 500 px (PNG/JPG, no alpha)
Screenshots:               Minimum 2, recommended 8 (1080×1920 or 1080×2400)
```

##### E. Pre-Launch Report

After uploading to internal testing track:
- Play Console auto-runs your app on real devices (Firebase Test Lab)
- Check Pre-launch report → fix any crashes before promoting to production track
- Common issues: missing permission handling, crash on older API levels, ANR on main thread

---

#### Day 3 — EAS Build + Submit

##### EAS Config (`eas.json` — complete, production-ready)

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": { "enterpriseProvisioning": "adhoc" },
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_ENV": "staging",
        "EXPO_PUBLIC_API_BASE_URL": "https://api-staging.execora.app"
      }
    },
    "production": {
      "channel": "production",
      "autoIncrement": "buildNumber",
      "ios": {
        "credentialsSource": "remote"
      },
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "remote"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_API_BASE_URL": "https://api.execora.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "dev@execora.app",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID",
        "language": "en-US",
        "releaseType": "AFTER_APPROVAL"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "draft",
        "changesNotSentForReview": false
      }
    }
  }
}
```

##### Build Commands

```bash
# One-time setup
npm install -g eas-cli@latest
eas login
eas credentials                    # configure iOS certs + Android keystore (stored in EAS — never local)

# iOS TestFlight build + upload
eas build --platform ios --profile production
eas submit --platform ios --latest  # uploads to TestFlight automatically

# Android internal testing build + upload
eas build --platform android --profile production
eas submit --platform android --latest

# Check build status
eas build:list --platform all --limit 5
```

##### Store Review Timelines

| Store | Internal Testing | External Review | Production |
|-------|-----------------|----------------|-----------|
| Apple App Store | Instant (TestFlight) | 1–3 days | After approval |
| Google Play | Instant | 1–7 days | Staged rollout: 1% → 10% → 50% → 100% |

**Deliverable:** App live on TestFlight (iOS) and internal track (Android) with full compliance.

---

### SPRINT 21 — Extended Finance Screens (1 day)

**Goal:** Product expiry management, balance sheet, and bank reconciliation screens.

| Screen | Route | API / Data |
|--------|-------|-----------|
| Product Expiry | `app/(app)/expiry.tsx` | `GET /api/v1/products/expiry-page?filter=30d`, `PATCH /products/batches/:id/write-off` |
| Balance Sheet | `app/(app)/balance-sheet.tsx` | `GET /api/v1/reports/pnl` (assets vs liabilities view) |
| Bank Reconciliation | `app/(app)/bank-reconciliation.tsx` | `GET /api/v1/cashbook` + manual match UI |

All three are **read-heavy** screens with minimal interaction. Implement as filter + list + action sheets.

**Deliverable:** 3 new screens accessible from More grid, all showing live data.

---

### SPRINT 22 — Advanced Features Screens (1 day)

**Goal:** Import, e-invoicing, GSTR-3B, credit notes, purchase orders, and indirect income screens.

| Screen | Route | Notes |
|--------|-------|-------|
| Import CSV | `app/(app)/import.tsx` | File picker → upload → preview → confirm; uses `expo-document-picker` |
| E-Invoicing / IRN | `app/(app)/einvoicing.tsx` | Info screen + GST API status; full IRN generation is future sprint |
| GSTR-3B | `app/(app)/gstr3b.tsx` | Summary table from `GET /api/v1/reports/gstr1` data |
| Credit Notes | `app/(app)/credit-notes.tsx` | List + create; `GET/POST /api/v1/credit-notes` |
| Purchase Orders | `app/(app)/purchase-orders.tsx` | List + create + receive; full PO flow via `/api/v1/purchase-orders` |
| Indirect Income | `app/(app)/indirect-income.tsx` | Filter on expense list for income-type entries |

**Deliverable:** 6 screens accessible from More grid.

---

### SPRINT 23 — Feedback + Coming Soon Screens (1 day)

**Goal:** NPS feedback form and 8 placeholder "Coming Soon" screens.

| Screen | Route | Notes |
|--------|-------|-------|
| Feedback | `app/(app)/feedback.tsx` | NPS 0–10 slider + optional text → `POST /api/v1/feedback` |
| Debit Orders | `app/(app)/debit-orders.tsx` | "Coming Soon" placeholder with back button |
| Delivery Challans | `app/(app)/delivery-challans.tsx` | "Coming Soon" placeholder |
| Packaging Lists | `app/(app)/packaging-lists.tsx` | "Coming Soon" placeholder |
| Journals | `app/(app)/journals.tsx` | "Coming Soon" placeholder |
| Online Store | `app/(app)/online-store.tsx` | "Coming Soon" placeholder |
| Addons | `app/(app)/addons.tsx` | "Coming Soon" placeholder |
| My Drive | `app/(app)/mydrive.tsx` | "Coming Soon" placeholder |
| Tutorial | `app/(app)/tutorial.tsx` | Embedded walkthrough or link to docs |

All Coming Soon screens share one `ComingSoon` component: icon + title + "Notify me" button.

**Deliverable:** Feedback form live. All 8 stubs reachable from More grid, no dead routes.

---

---

## COVERAGE AUDIT — ALL 53 WEB ROUTES

| # | Web Route | Sprint | Status |
|---|-----------|--------|--------|
| 1 | `/login` | S1 | ✅ |
| 2 | `/pub/:id/:token` — Public invoice portal | S16 | ✅ |
| 3 | `/` — Home dashboard | S3 | ✅ |
| 4 | `/billing` — Classic Billing | S5 | ✅ |
| 5 | `/invoices` — Invoice list | S4 | ✅ |
| 6 | `/invoices/:id` — Invoice detail | S4 | ✅ |
| 7 | `/parties` — Customers + Vendors | S7 | ✅ |
| 8 | `/customers/:id` — Customer detail | S7 | ✅ |
| 9 | `/inventory` — Product list | S6 | ✅ |
| 10 | `/payment` — Record payment | S8 | ✅ |
| 11 | `/expenses` — Expenses | S9 | ✅ |
| 12 | `/cashbook` — Cash book | S10 | ✅ |
| 13 | `/daybook` — Day book | S10 | ✅ |
| 14 | `/reports` — Reports | S11 | ✅ |
| 15 | `/overdue` — Overdue invoices | S12 | ✅ |
| 16 | `/recurring` — Recurring billing | S12 | ✅ |
| 17 | `/purchases` — Stock purchases | S12 | ✅ |
| 18 | `/monitoring` — Store monitor | S14 | ✅ |
| 19 | `/expiry` — Product expiry | **S21** | ✅ added |
| 20 | `/balance-sheet` — Balance sheet | **S21** | ✅ added |
| 21 | `/bank-reconciliation` — Bank recon | **S21** | ✅ added |
| 22 | `/import` — Import CSV data | **S22** | ✅ added |
| 23 | `/einvoicing` — E-Invoice / IRN | **S22** | ✅ added |
| 24 | `/gstr3b` — GSTR-3B filing | **S22** | ✅ added |
| 25 | `/credit-notes` — Credit notes | **S22** | ✅ added |
| 26 | `/purchase-orders` — PO management | **S22** | ✅ added |
| 27 | `/indirect-income` — Other income | **S22** | ✅ added |
| 28 | `/feedback` — Feedback form | **S23** | ✅ added |
| 29 | `/settings/profile/company` | S13 | ✅ |
| 30 | `/settings/profile/user` | **S13** | ✅ added |
| 31 | `/settings/profile/users` — Team | S13 | ✅ |
| 32 | `/settings/general/preferences` | **S13** | ✅ added |
| 33 | `/settings/general/thermal-print` | S17 | ✅ |
| 34 | `/settings/general/barcode` | **S13** | ✅ added |
| 35 | `/settings/general/signatures` | **S13** | ✅ added |
| 36 | `/settings/general/notes` | **S13** | ✅ added |
| 37 | `/settings/general/terms` | **S13** | ✅ added |
| 38 | `/settings/general/auto-reminders` | S13 | ✅ |
| 39 | `/settings/general/other` | **S13** | ✅ added |
| 40 | `/settings/banks/banks` | S13 | ✅ |
| 41 | `/settings/banks/wallet` | **S13** | ✅ added |
| 42 | `/settings/banks/other` | **S13** | ✅ added |
| 43 | `/settings/payment-gateway/api` | S13 | ✅ |
| 44 | `/settings/more` | **S13** | ✅ added |
| 45 | `/settings/billing` — Subscription | **S13** | ✅ added |
| 46 | `/debit-orders` — Coming Soon | **S23** | ✅ added |
| 47 | `/delivery-challans` — Coming Soon | **S23** | ✅ added |
| 48 | `/packaging-lists` — Coming Soon | **S23** | ✅ added |
| 49 | `/journals` — Coming Soon | **S23** | ✅ added |
| 50 | `/online-store` — Coming Soon | **S23** | ✅ added |
| 51 | `/addons` — Coming Soon | **S23** | ✅ added |
| 52 | `/mydrive` — Coming Soon | **S23** | ✅ added |
| 53 | `/tutorial` — Coming Soon | **S23** | ✅ added |

**All 53 routes covered. ✅**

---

## FEATURES AUDIT — ALL WEB FEATURES

| Feature | Sprint | Status |
|---------|--------|--------|
| Voice billing (STT mic) — More drawer 🎤 | S20 | ✅ |
| Quick Invoice modal — More "New Bill" | S5 | ✅ |
| GlobalSearch (invoices + customers + products) | S3 | ✅ |
| AI Agent Feed on home | S3 | ✅ |
| Business Health Score widget | S3 | ✅ |
| Dashboard Expiry Alert strip | S3 | ✅ |
| GST per item (CGST/SGST/IGST) in billing | S5 | ✅ |
| B2B invoice with buyer GSTIN + IGST | S5 | ✅ |
| 4 invoice templates with preview | S5 | ✅ |
| Amount in words (Indian: lakh/crore) | S5 | ✅ |
| Partial payment at billing time | S5 | ✅ |
| Overall + item-level discounts | S5 | ✅ |
| OCR bill scan (OpenAI Vision) in Purchases | S12 | ✅ |
| WhatsApp share (receipt, reminders) | S8, S7 | ✅ |
| Thermal receipt print (BT printer) | S17 | ✅ |
| Barcode scan (camera) | S15 | ✅ |
| Product image upload | S6 | ✅ |
| EOD cash reconciliation | S10 | ✅ |
| Drawer no-ring detection | S14 | ✅ |
| Employee risk scoring | S14 | ✅ |
| Confetti on bill save | S19 | ✅ |
| Dark mode (all screens) | S19 | ✅ |
| Offline mode + sync queue | S18 | ✅ |
| More drawer — 17 items (exact web match) | S13 | ✅ |
| Pull-to-refresh (all list screens) | Each sprint | ✅ |
| Haptic feedback everywhere | S19 | ✅ |
| Push notifications | S15 | ✅ |
| Deep links (execora://) | S15 | ✅ |
| Public invoice portal (no auth) | S16 | ✅ |
| Customer ledger running balance | S7 | ✅ |
| Payment aging badges (0–7d/7–30d/30d+) | S12 | ✅ |
| GSTR-1 report | S11 | ✅ |
| GSTR-3B dedicated screen | S22 | ✅ |
| E-Invoicing IRN + QR | S22 | ✅ |
| Credit notes | S22 | ✅ |
| Purchase orders | S22 | ✅ |
| Balance sheet | S21 | ✅ |
| Bank reconciliation | S21 | ✅ |
| Product expiry tracking | S21 | ✅ |
| Import CSV (customers/products/invoices) | S22 | ✅ |
| Indirect income | S22 | ✅ |
| Feedback form | S23 | ✅ |
| All Coming Soon screens (8) | S23 | ✅ |
| All 15 Settings sub-pages | S13 | ✅ |

**All web features covered. ✅**

---

## UPDATED MILESTONE SUMMARY

| Milestone | Sprints | Days | What ships |
|-----------|---------|------|-----------|
| **M1 — Foundation** | 0–2B | 4d | Expo app + login + all 16 UI components + WS real-time layer |
| **M2 — Core Billing** | 3–5 | 5d | Home (all widgets) + invoices + 3-step billing wizard + quick modal |
| **M3 — Products + Parties** | 6–7 | 4d | Inventory CRUD + barcode + customers + ledger |
| **M4 — Financial** | 8–10 | 4d | Payment + expenses + day book + cash book |
| **M5 — Reports + More** | 11–13 | 6d | Charts + GSTR-1 + overdue + recurring + purchases + 17-item More grid + all 15 settings sub-pages |
| **M6 — Monitoring** | 14 | 2d | Store dashboard + employee risk + camera |
| **M7 — Native** | 15–17 | 4d | Barcode cam + push + deep links + BT printing |
| **M8 — Offline + Polish** | 18–19 | 5d | Offline queue + animations + dark mode + a11y + QA |
| **M9 — Extended Pages** | 20–23 | 6d | Voice mode + expiry + balance sheet + bank recon + e-invoice + GSTR-3B + credit notes + PO + import + feedback + 8 coming-soon |
| **M10 — Production Hardening** | 24 | 2d | Sentry + logging + error boundaries + CI/CD + OTA |
| **M11 — Docs Freeze** | 25 | 1d | All developer docs complete |
| **M12 — Store Compliance + Launch** | 26 | 3d | Privacy Manifest + Data Safety + screenshots + EAS build + TestFlight + Play internal |

**Total: ~46 working days (9–10 weeks) for 1 developer**

**Route coverage: 53/53 ✅**
**Feature coverage: 45/45 ✅**

---

## API REUSE STRATEGY

All existing `apps/api` backend endpoints are reused as-is. Zero changes needed on the backend.

Only change in `apps/native/src/lib/api.ts`:
- `localStorage.getItem(TOKEN_KEY)` → `await storage.get(TOKEN_KEY)` (AsyncStorage)
- `fetch` calls → identical
- Base URL → configurable via Settings screen (self-hosted support)

---

### Complete Backend Endpoint Inventory (80 endpoints)

> Audited from all 21 route files in `apps/api/src/api/routes/`. Every endpoint below must be covered in `apps/native/src/lib/api.ts`.

#### AUTH (`auth.routes.ts`) — 6 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| POST | `/api/v1/auth/register` | Sprint 1 — Onboarding |
| POST | `/api/v1/auth/login` | Sprint 1 — Login |
| POST | `/api/v1/auth/refresh` | api.ts interceptor |
| POST | `/api/v1/auth/logout` | Settings screen |
| PUT | `/api/v1/auth/me/profile` | Sprint 18 — Profile (name, phone, tenant) |
| PUT | `/api/v1/auth/me/password` | Sprint 18 — Change Password |

#### INVOICES (`invoice.routes.ts`) — 11 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/invoices` | Sprint 5 — Invoice List |
| GET | `/api/v1/invoices/:id` | Sprint 5 — Invoice Detail |
| POST | `/api/v1/invoices` | Sprint 4 — Classic Billing |
| POST | `/api/v1/invoices/proforma` | Sprint 6 — Proforma/Quotation |
| POST | `/api/v1/invoices/:id/convert` | Sprint 6 — Convert Proforma |
| PATCH | `/api/v1/invoices/:id` | Sprint 5 — Edit Invoice |
| POST | `/api/v1/invoices/:id/cancel` | Sprint 5 — Cancel Invoice |
| POST | `/api/v1/invoices/:id/reverse-payment` | Sprint 9 — Reverse Payment |
| GET | `/api/v1/invoices/:id/portal-token` | Sprint 5 — Share Invoice |
| POST | `/api/v1/invoices/:id/send-email` | Sprint 5 — Email Invoice |
| POST | `/api/v1/ledger/mixed-payment` | Sprint 9 — Cash+UPI Split |

#### PRODUCTS (`product.routes.ts`) — 11 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/products` | Sprint 7 — Product List |
| POST | `/api/v1/products` | Sprint 7 — Add Product |
| PUT | `/api/v1/products/:id` | Sprint 7 — Edit Product |
| PATCH | `/api/v1/products/:id/stock` | Sprint 7 — Stock Adjust |
| GET | `/api/v1/products/search` | Sprint 4 — Billing Item Search |
| GET | `/api/v1/products/barcode/:barcode` | Sprint 4 — Barcode Scan Lookup |
| GET | `/api/v1/products/low-stock` | Sprint 7 — Low Stock Alerts |
| GET | `/api/v1/products/expiring` | Sprint 7 — Expiry Alert Banner |
| GET | `/api/v1/products/expiry-page` | Sprint 7 — Expiry Page (filter) |
| PATCH | `/api/v1/products/batches/:id/write-off` | Sprint 7 — Write-off Expired Batch |
| GET | `/api/v1/products/top-selling` | Sprint 10 — Dashboard Widget |

#### CUSTOMERS (`customer.routes.ts`) — 11 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/customers` | Sprint 8 — Customer List |
| POST | `/api/v1/customers` | Sprint 8 — Add Customer |
| GET | `/api/v1/customers/:id` | Sprint 8 — Customer Detail |
| PUT | `/api/v1/customers/:id` | Sprint 8 — Edit Customer |
| DELETE | `/api/v1/customers/:id` | Sprint 8 — Soft-delete Customer |
| GET | `/api/v1/customers/:id/ledger` | Sprint 8 — Khata View |
| GET | `/api/v1/customers/:id/invoices` | Sprint 8 — Customer Invoices |
| POST | `/api/v1/customers/:id/payment` | Sprint 9 — Record Payment |
| GET | `/api/v1/customers/search` | Sprint 4 — Customer Search at Billing |
| GET | `/api/v1/customers/:id/communication-prefs` | Sprint 18 — Notification Prefs |
| PUT | `/api/v1/customers/:id/communication-prefs` | Sprint 18 — Update Notif Prefs |

#### LEDGER (`ledger.routes.ts`) — 4 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/ledger` | Sprint 8 — Ledger List |
| POST | `/api/v1/ledger/payment` | Sprint 9 — Record Payment |
| POST | `/api/v1/ledger/credit` | Sprint 9 — Add Credit/Advance |
| GET | `/api/v1/ledger/aging` | Sprint 11 — Khata Aging Report |

#### EXPENSES & PURCHASES (`expense.routes.ts`) — 9 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/expenses` | Sprint 12 — Expense List |
| POST | `/api/v1/expenses` | Sprint 12 — Add Expense |
| GET | `/api/v1/expenses/:id` | Sprint 12 — Expense Detail |
| PUT | `/api/v1/expenses/:id` | Sprint 12 — Edit Expense |
| DELETE | `/api/v1/expenses/:id` | Sprint 12 — Delete Expense |
| GET | `/api/v1/expenses/summary` | Sprint 12 — Expense Summary Widget |
| GET | `/api/v1/cashbook` | Sprint 12 — Cashbook View |
| GET | `/api/v1/expenses/categories` | Sprint 12 — Category Dropdown |
| GET | `/api/v1/purchases` | Sprint 12 — Purchase List |

#### REPORTS (`report.routes.ts`) — 8 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/reports/sales` | Sprint 13 — Sales Report |
| GET | `/api/v1/reports/gstr1` | Sprint 13 — GSTR-1 Report |
| GET | `/api/v1/reports/gstr1/csv` | Sprint 13 — Download GSTR-1 CSV |
| GET | `/api/v1/reports/itemwise-pnl` | Sprint 13 — Item P&L |
| GET | `/api/v1/reports/pnl` | Sprint 13 — P&L Report |
| GET | `/api/v1/reports/pnl/pdf` | Sprint 13 — Download P&L PDF |
| GET | `/api/v1/reports/pnl/csv` | Sprint 13 — Download P&L CSV |
| POST | `/api/v1/reports/email` | Sprint 13 — Email Report |

#### SUMMARY (`summary.routes.ts`) — 2 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/summary` | Sprint 10 — Dashboard Today |
| GET | `/api/v1/summary/range` | Sprint 10 — Dashboard Date Range |

#### MONITORING (`monitoring.routes.ts`) — 12 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/monitoring/events` | Sprint 14 — Activity Log |
| GET | `/api/v1/monitoring/events/unread` | Sprint 14 — Unread Badge |
| POST | `/api/v1/monitoring/events/read-all` | Sprint 14 — Mark All Read |
| POST | `/api/v1/monitoring/events/:id/read` | Sprint 14 — Mark One Read |
| POST | `/api/v1/monitoring/events` | Sprint 14 — Log Manual Event |
| GET | `/api/v1/monitoring/stats` | Sprint 14 — Stats Widget |
| GET | `/api/v1/monitoring/config` | Sprint 14 — Monitoring Settings |
| PUT | `/api/v1/monitoring/config` | Sprint 14 — Update Config |
| POST | `/api/v1/monitoring/snap` | Sprint 14 — Upload Camera Snap |
| GET | `/api/v1/monitoring/snap/*` | Sprint 14 — Snap Presigned URL |
| POST | `/api/v1/monitoring/cash-reconciliation` | Sprint 14 — EOD Cash Count |
| GET | `/api/v1/monitoring/cash-reconciliation/:date` | Sprint 14 — Get Reconciliation |

#### REMINDERS (`reminder.routes.ts`) — 4 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/reminders` | Sprint 15 — Reminder List |
| POST | `/api/v1/reminders` | Sprint 15 — Create Reminder |
| PUT | `/api/v1/reminders/:id` | Sprint 15 — Update Reminder |
| POST | `/api/v1/reminders/bulk` | Sprint 15 — Bulk Send Reminders |

#### USERS (`users.routes.ts`) — 6 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/users` | Sprint 18 — Team Management |
| POST | `/api/v1/users/invite` | Sprint 18 — Invite Team Member |
| GET | `/api/v1/users/:id` | Sprint 18 — User Detail |
| PUT | `/api/v1/users/:id` | Sprint 18 — Update Role/Status |
| DELETE | `/api/v1/users/:id` | Sprint 18 — Remove Team Member |
| POST | `/api/v1/users/:id/reset-password` | Sprint 18 — Reset Password (admin) |

#### AI (`ai.routes.ts`) — 7 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| POST | `/api/v1/ai/ocr-bill` | Sprint 16 — OCR Bill Scan |
| POST | `/api/v1/ai/catalog-seed` | Sprint 16 — AI Catalog Seeding |
| GET | `/api/v1/ai/jobs/:id` | Sprint 16 — Poll AI Job Status |
| GET | `/api/v1/ai/replenishment` | Sprint 16 — Reorder Suggestions |
| GET | `/api/v1/ai/anomaly-check` | Sprint 16 — Sales Anomaly Alert |
| POST | `/api/v1/ai/predictive-reminders` | Sprint 16 — AI Payment Reminders |
| GET | `/api/v1/ai/demand-forecast` | Sprint 16 — Demand Forecast |

#### DRAFTS (`draft.routes.ts`) — 6 endpoints ⚠️ Previously untracked
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/drafts` | Sprint 12 — Draft Purchases List |
| POST | `/api/v1/drafts` | Sprint 12 — Save Draft (purchase_entry/product/stock_adjustment) |
| GET | `/api/v1/drafts/:id` | Sprint 12 — View Draft |
| PUT | `/api/v1/drafts/:id` | Sprint 12 — Edit Draft |
| POST | `/api/v1/drafts/:id/confirm` | Sprint 12 — Confirm Draft → execute |
| DELETE | `/api/v1/drafts/:id` | Sprint 12 — Discard Draft |

#### SUPPLIERS (`supplier.routes.ts`) — 2 endpoints ⚠️ Previously untracked
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/suppliers` | Sprint 12 — Supplier List (PO screen) |
| POST | `/api/v1/suppliers` | Sprint 12 — Add Supplier |

#### CREDIT NOTES (`credit-note.routes.ts`) — 6 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/credit-notes` | Sprint 6 — Credit Note List |
| POST | `/api/v1/credit-notes` | Sprint 6 — Create Credit Note |
| GET | `/api/v1/credit-notes/:id` | Sprint 6 — Credit Note Detail |
| POST | `/api/v1/credit-notes/:id/issue` | Sprint 6 — Issue Credit Note |
| POST | `/api/v1/credit-notes/:id/cancel` | Sprint 6 — Cancel Credit Note |
| DELETE | `/api/v1/credit-notes/:id` | Sprint 6 — Delete Draft Credit Note |

#### PURCHASE ORDERS (`purchase-order.routes.ts`) — 6 endpoints
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/api/v1/purchase-orders` | Sprint 12 — PO List |
| POST | `/api/v1/purchase-orders` | Sprint 12 — Create PO |
| GET | `/api/v1/purchase-orders/:id` | Sprint 12 — PO Detail |
| PATCH | `/api/v1/purchase-orders/:id` | Sprint 12 — Edit PO |
| POST | `/api/v1/purchase-orders/:id/receive` | Sprint 12 — Receive PO (updates stock) |
| POST | `/api/v1/purchase-orders/:id/cancel` | Sprint 12 — Cancel PO |

#### FEEDBACK (`feedback.routes.ts`) — 1 endpoint
| Method | Path | Used in Sprint |
|--------|------|---------------|
| POST | `/api/v1/feedback` | Sprint 19 — NPS Score submission |

#### PUBLIC PORTAL (`portal.routes.ts`) — 1 endpoint
| Method | Path | Used in Sprint |
|--------|------|---------------|
| GET | `/pub/invoice/:id/:token/pdf` | Sprint 5 — Customer-facing PDF download |

---

### API Client Blueprint (`apps/native/src/lib/api.ts`)

```ts
// All domain API objects exported from src/lib/api.ts
export const authApi   = { register, login, refresh, logout, updateProfile, changePassword };
export const invoiceApi = { list, getById, create, createProforma, convertProforma, update, cancel,
                            reversePayment, getPortalToken, sendEmail, recordMixedPayment };
export const productApi = { list, create, update, adjustStock, search, getByBarcode, getLowStock,
                            getExpiring, getExpiryPage, writeOffBatch, getTopSelling };
export const customerApi = { list, create, getById, update, remove, getLedger, getInvoices,
                              recordPayment, search, getCommPrefs, updateCommPrefs };
export const ledgerApi   = { list, recordPayment, addCredit, getAging };
export const expenseApi  = { list, create, getById, update, remove, getSummary,
                              getCashbook, getCategories, getPurchases };
export const reportApi   = { getSales, getGstr1, downloadGstr1Csv, getItemwisePnl, getPnl,
                              downloadPnlPdf, downloadPnlCsv, emailReport };
export const summaryApi  = { getToday, getRange };
export const monitoringApi = { getEvents, getUnreadCount, markAllRead, markRead, logEvent,
                               getStats, getConfig, updateConfig, uploadSnap, getSnapUrl,
                               submitCashReconciliation, getCashReconciliation };
export const reminderApi = { list, create, update, bulkSend };
export const usersApi    = { list, invite, getById, update, remove, resetPassword };
export const aiApi       = { ocrBill, catalogSeed, pollJob, getReplenishment, checkAnomaly,
                              predictiveReminders, getDemandForecast };
export const draftApi    = { list, create, getById, update, confirm, discard };
export const supplierApi = { list, create };
export const creditNoteApi = { list, create, getById, issue, cancel, remove };
export const purchaseOrderApi = { list, create, getById, update, receive, cancel };
export const feedbackApi = { submit };
export const portalApi   = { getInvoicePdf };
```

**Total: 80 endpoints across 18 domains — all accounted for.**

---

## WHAT IS NOT INCLUDED (FUTURE)

| Feature | Why deferred |
|---------|-------------|
| Voice billing (STT) | Needs separate on-device STT integration sprint |
| Face recognition | High memory (6MB TF model) — use web for monitoring |
| E-invoicing (IRN/QR) | GST API integration separate sprint |
| Biometric login | Nice-to-have, sprint post-launch |
| NFC payments | Advanced, post-launch |
| WhatsApp Business API | Separate integration, not MVP |
| Loan tracking | Low priority for kirana stores |
| Multi-language (Hindi) | Post-launch i18n sprint |

---

---

# PART II — PRODUCTION STANDARDS & DEVELOPER LIFECYCLE

> This section is mandatory reading for every developer working on the Execora native app.
> It defines how we write code, how we ship it, how we monitor it, and how we evolve it safely.

---

## 1. CODE ARCHITECTURE STANDARDS

### 1.1 TypeScript Strictness

```json
// tsconfig.json — enforced settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Rules:**
- No `any`. Use `unknown` + type guard if truly unknown.
- No `as` casts except for `as const` or safe narrowed types.
- Every function that can fail must return `Result<T, E>` or throw a typed error — never silently swallow.
- All async functions must handle errors explicitly — no unhandled promise rejections.

### 1.2 Folder Naming Conventions

```
src/
  components/
    ui/              ← Pure display, zero business logic, no API calls
    common/          ← Business-aware shared components (CustomerSearch, DatePicker)
    billing/         ← Feature-scoped components (never used outside billing)
    invoice/
    monitoring/
  lib/
    api.ts           ← One file. All API calls. Named exports per domain.
    storage.ts       ← AsyncStorage wrapper. Typed keys.
    haptics.ts       ← Haptic helpers.
    format.ts        ← Pure formatting functions. No side effects.
    logger.ts        ← Production logger. All log calls go through here.
    errors.ts        ← Error classes + error boundary helpers.
    constants.ts     ← App-wide constants (no magic strings anywhere).
  contexts/          ← React contexts. One file = one context.
  hooks/             ← Custom hooks. One concern per hook.
```

**Naming rules:**
- Files: `PascalCase` for components, `camelCase` for utilities
- Components: always named exports from index barrel files
- Hooks: always `use` prefix
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`, no `I` prefix

### 1.3 Barrel Exports

Every `components/ui/`, `components/common/`, `lib/` folder has an `index.ts`:

```ts
// src/components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card, PressableCard } from './Card';
export { Badge } from './Badge';
export { BottomSheet } from './BottomSheet';
export { Skeleton, SkeletonCard } from './Skeleton';
export { EmptyState } from './EmptyState';
export { Chip } from './Chip';
export { Divider } from './Divider';
```

```ts
// Import always from barrel — never sub-path
import { Button, Card, Badge } from '@/components/ui';     // ✅
import { Button } from '@/components/ui/Button';           // ❌ breaks if file moves
```

### 1.4 Component Rules

```tsx
// ✅ CORRECT — explicit props type, memoized, stable
interface InvoiceCardProps {
  invoice: Invoice;
  onPress: (id: string) => void;
}

export const InvoiceCard = React.memo(({ invoice, onPress }: InvoiceCardProps) => {
  const handlePress = useCallback(() => onPress(invoice.id), [invoice.id, onPress]);
  return <PressableCard onPress={handlePress}>...</PressableCard>;
});

InvoiceCard.displayName = 'InvoiceCard';  // required for React DevTools + error stacks
```

**Rules:**
- All list-rendered components wrapped in `React.memo`
- Event handlers in `useCallback` when passed as props to memoized children
- No anonymous default exports (breaks error stacks)
- `displayName` set on all memo'd components

### 1.5 Error Boundaries

Every route screen is wrapped in an `ErrorBoundary`:

```tsx
// app/(app)/index.tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function HomeScreen() {
  return (
    <ErrorBoundary fallback={<ErrorFallback screen="Home" />}>
      <HomeContent />
    </ErrorBoundary>
  );
}
```

`ErrorBoundary` must:
- Catch render errors
- Log to Sentry (`Sentry.captureException`)
- Show a user-friendly fallback with "Retry" button
- Never crash the whole app

---

## 2. PRODUCTION LOGGING & MONITORING

### 2.1 Logger (`src/lib/logger.ts`)

Central logger — **all** log output routes through here. No `console.log` anywhere in production code.

Design goals:
- **PII-safe** — redacts phone numbers, emails, amounts before sending to Sentry
- **Structured** — every log has `screen`, `action`, optional `requestId` for correlation
- **Level-gated** — `debug` stripped in production build; `warn`/`error` always sent to Sentry
- **Typed** — TypeScript prevents passing arbitrary objects

```ts
// src/lib/logger.ts
import * as Sentry from '@sentry/react-native';

const IS_PROD = process.env.EXPO_PUBLIC_ENV === 'production';

// Fields that must never reach Sentry
const PII_KEYS = new Set(['phone', 'email', 'password', 'token', 'pan', 'aadhaar', 'amount']);

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  screen?: string;
  action?: string;
  requestId?: string;         // correlate a user action → API call → error
  invoiceId?: string;
  customerId?: string;
  [key: string]: unknown;     // allow extra fields — redacted automatically
}

/** Remove PII fields before any context reaches external services */
function redact(ctx: LogContext | undefined): LogContext | undefined {
  if (!ctx) return ctx;
  const safe: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    safe[k] = PII_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return safe;
}

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',   // cyan
  info:  '\x1b[32m',   // green
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};

class Logger {
  private emit(level: LogLevel, message: string, context?: LogContext) {
    const safeCtx = redact(context);

    // Dev: color-coded output in Metro terminal
    if (!IS_PROD) {
      const tag = `${COLORS[level]}[${level.toUpperCase()}]\x1b[0m`;
      // eslint-disable-next-line no-console
      (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(
        `${tag} ${message}`, safeCtx ?? '',
      );
    }

    // Production: breadcrumbs for all levels (visible in Sentry issue timeline)
    const sentryLevel = level === 'debug' ? 'debug'
      : level === 'info'  ? 'info'
      : level === 'warn'  ? 'warning'
      : 'error';

    Sentry.addBreadcrumb({
      category: safeCtx?.screen ? `screen.${safeCtx.screen}` : 'app',
      message,
      data: safeCtx,
      level: sentryLevel,
      timestamp: Date.now() / 1000,
    });
  }

  debug(msg: string, ctx?: LogContext) {
    if (IS_PROD) return;   // strip debug logs entirely from production
    this.emit('debug', msg, ctx);
  }

  info(msg: string, ctx?: LogContext)  { this.emit('info', msg, ctx); }
  warn(msg: string, ctx?: LogContext)  { this.emit('warn', msg, ctx); }

  error(msg: string, error?: unknown, ctx?: LogContext) {
    this.emit('error', msg, ctx);
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: redact(ctx) as Record<string, unknown>,
        tags: {
          screen: ctx?.screen ?? 'unknown',
          action: ctx?.action ?? 'unknown',
        },
      });
    }
  }

  /** Call at the top of each screen component (useEffect on mount) */
  screen(name: string, params?: Record<string, string>) {
    this.info(`Screen: ${name}`, { screen: name, ...params });
  }
}

export const logger = new Logger();
```

**Usage rules:**
```ts
// ✅ Structured context — screen + action always present
logger.info('Invoice created', { screen: 'Billing', action: 'createInvoice', invoiceId: id });
logger.error('Payment API failed', err, { screen: 'Payment', action: 'recordPayment' });
logger.warn('Offline queue full', { screen: 'Billing', action: 'queueBill' });

// ✅ Screen tracking — call in every screen's useEffect
useEffect(() => { logger.screen('InvoiceList'); }, []);

// ❌ Never — bypasses PII redaction + Sentry
console.log('user phone:', phone);

// ❌ Never — no context, impossible to debug in production
logger.error('Something failed');
```

### 2.2 Sentry Setup (`app/_layout.tsx` — initialize before all other code)

> Uses `@sentry/react-native` v6 which is built on Sentry SDK v8 core. API changed: `startTransaction` is removed, use `startSpan`.

```ts
import * as Sentry from '@sentry/react-native';

const IS_PROD = process.env.EXPO_PUBLIC_ENV === 'production';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',

  // Disable entirely in development — avoid polluting Sentry with dev noise
  enabled: IS_PROD || process.env.EXPO_PUBLIC_ENV === 'staging',

  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  release: `com.execora.billing@${process.env.EXPO_PUBLIC_APP_VERSION}`,
  dist: process.env.EXPO_PUBLIC_BUILD_NUMBER,

  // Performance: sample 15% of sessions in production (enough signal, low cost)
  tracesSampleRate: IS_PROD ? 0.15 : 1.0,
  profilesSampleRate: IS_PROD ? 0.05 : 0.0,

  // Native crash reporting (iOS/Android)
  enableNative: true,
  enableNativeNagger: false,     // suppress dev warnings in Expo Go

  // Session tracking for crash-free rate metric
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30_000,

  // Attach device screenshot + view hierarchy on crash
  attachScreenshot: true,
  attachViewHierarchy: true,

  // Integrations — auto-instrument React Navigation
  integrations: [
    Sentry.reactNativeTracingIntegration(),
  ],

  beforeSend(event) {
    // Final PII guard — remove any user identity from error payloads
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
      // Keep only hashed user ID for grouping (set separately via setUser)
    }
    // Strip request bodies (may contain invoice data)
    if (event.request?.data) {
      event.request.data = '[STRIPPED]';
    }
    return event;
  },

  beforeSendTransaction(event) {
    // Remove query params from transaction URLs (may contain customer IDs)
    if (event.transaction) {
      event.transaction = event.transaction.split('?')[0];
    }
    return event;
  },
});

// Set user context AFTER login (use hashed ID, never email/phone)
// Called from AuthContext after successful login:
// Sentry.setUser({ id: hashUserId(user.id) });
```

**What Sentry captures automatically with this config:**
- All unhandled JS exceptions + native crashes (iOS + Android)
- ANR (App Not Responding) on Android
- React Navigation screen transitions as breadcrumbs
- API call durations via `startSpan` (see section 2.3)
- Device model, OS version, app version, memory pressure
- Session crash-free rate (target: > 99.5%)

### 2.3 API Performance Tracing

> `Sentry.startTransaction` was **removed** in Sentry SDK v8. Use `Sentry.startSpan` instead.

```ts
// src/lib/api.ts — performance span on every request
import * as Sentry from '@sentry/react-native';
import { logger } from './logger';
import { ApiError, NetworkError } from './errors';

async function request<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, string> } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const start  = Date.now();

  return Sentry.startSpan(
    { name: `${method} ${endpoint}`, op: 'http.client' },
    async (span) => {
      try {
        const url = buildUrl(endpoint, options.params);
        const response = await fetch(url, {
          ...options,
          headers: await buildHeaders(options.headers),
        });

        const ms = Date.now() - start;
        span.setAttribute('http.status_code', response.status);
        span.setAttribute('http.response_time_ms', ms);

        logger.debug(`${method} ${endpoint}`, {
          action: 'apiRequest',
          requestId: response.headers.get('x-request-id') ?? undefined,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { message?: string };
          span.setStatus({ code: 2, message: 'error' });   // SENTRY_STATUS_ERROR
          throw new ApiError(response.status, body.message ?? 'Request failed', endpoint);
        }

        return response.json() as Promise<T>;

      } catch (err) {
        if (err instanceof ApiError) throw err;             // already typed
        throw new NetworkError();                           // fetch itself failed = no internet
      }
    },
  );
}
```

### 2.4 Analytics Events

Standardized event names for Amplitude/Mixpanel (add later, after launch):

```ts
// src/lib/analytics.ts
export const Analytics = {
  // Billing
  billStarted:    () => track('bill_started'),
  billSaved:      (amount: number, method: string) => track('bill_saved', { amount, method }),
  billCancelled:  () => track('bill_cancelled'),

  // Payments
  paymentRecorded: (method: string, amount: number) => track('payment_recorded', { method, amount }),

  // Navigation
  screenView: (name: string) => track('screen_view', { screen: name }),

  // Errors
  errorShown: (screen: string, code: string) => track('error_shown', { screen, code }),
};
```

---

## 3. ERROR HANDLING STANDARDS

### 3.1 Typed API Errors

```ts
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized() { return this.status === 401; }
  get isForbidden()    { return this.status === 403; }
  get isNotFound()     { return this.status === 404; }
  get isServerError()  { return this.status >= 500; }
}

export class NetworkError extends Error {
  constructor(message = 'No internet connection') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 3.2 React Query Error Handling

```ts
// src/contexts/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error instanceof ApiError && error.isUnauthorized) return false;
        if (error instanceof ApiError && error.isForbidden) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,     // 30 seconds
      gcTime: 5 * 60_000,   // 5 minutes in cache
    },
    mutations: {
      onError: (error) => {
        logger.error('Mutation failed', error);
        // Global mutation error toast
        if (error instanceof NetworkError) {
          Toast.show({ type: 'error', text1: 'No internet connection' });
        } else if (error instanceof ApiError && error.isServerError) {
          Toast.show({ type: 'error', text1: 'Server error. Please try again.' });
        }
      },
    },
  },
});
```

### 3.3 Screen-Level Error Handling Pattern

Every screen that fetches data follows this exact pattern:

```tsx
export function InvoiceListScreen() {
  const { data, isLoading, isError, error, refetch } = useQuery({ ... });

  if (isLoading) return <SkeletonList count={5} />;

  if (isError) {
    logger.error('Invoice list failed to load', error, { screen: 'InvoiceList' });
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Couldn't load bills"
        description={error instanceof NetworkError ? 'Check your connection' : 'Something went wrong'}
        action={{ label: 'Retry', onPress: refetch }}
      />
    );
  }

  if (!data?.invoices?.length) return <EmptyState ... />;

  return <FlatList data={data.invoices} ... />;
}
```

---

## 4. DEPENDENCY MANAGEMENT

### 4.1 Version Pinning Strategy

```json
// package.json — pin EXACT versions in production
{
  "dependencies": {
    "expo": "52.0.0",                          // EXACT — Expo SDK breaks on minor
    "react": "18.3.1",                         // EXACT — peer deps chain
    "react-native": "0.76.5",                  // EXACT — native bridge must match (New Architecture enabled)
    "@tanstack/react-query": "^5.28.0",        // RANGE OK — non-native, stable API
    "nativewind": "^4.0.36",                   // RANGE OK
    "zustand": "^4.5.2"                        // RANGE OK
  }
}
```

**Rule:** Any package that touches native modules (Expo SDK, React Native, expo-camera, react-native-reanimated, react-native-gesture-handler) must be pinned to **exact versions**. Breaking changes in these packages require `npx expo-doctor` + full native rebuild.

### 4.2 Safe Upgrade Process

```bash
# Step 1: Check what's outdated
npx expo-doctor              # Expo compatibility check
npm outdated                 # All packages

# Step 2: Upgrade Expo SDK (major)
npx expo install expo@next   # Expo's safe installer resolves peer deps
npx expo-doctor              # Verify no conflicts

# Step 3: Upgrade non-native packages
npm update @tanstack/react-query zustand

# Step 4: Test
npx expo start --clear       # Clear Metro cache
# Run on iOS simulator + Android emulator
# Run Detox E2E on billing flow

# Step 5: If native upgrade (new expo SDK) — full rebuild required
eas build --platform all --profile preview
```

### 4.3 Security Audit (Monthly)

```bash
# Run monthly, or after any npm install
npm audit --audit-level=high

# Fix automatically safe
npm audit fix

# Review manually if: high/critical severity, no auto-fix
# Document in SECURITY_NOTES.md why deferred if deferring
```

### 4.4 Peer Dependency Rules

| Package | Must match | Why |
|---------|-----------|-----|
| `react-native-reanimated` | Expo SDK's bundled version | Hermes engine ABI |
| `react-native-gesture-handler` | Expo SDK's bundled version | UIKit + View flattening |
| `@sentry/react-native` | React Native version | Native crash handler |
| `expo-camera` | Expo SDK version | Camera2 + AVFoundation API |

Always use `npx expo install <package>` instead of `npm install <package>` — Expo's installer resolves the correct version automatically.

---

## 5. TESTING STRATEGY

### 5.1 Three-Layer Testing Pyramid

```
         /\
        /  \
       / E2E \ ← Detox: 5 critical flows, runs nightly
      /--------\
     / Integration \ ← React Native Testing Library: 20 screens
    /--------------\
   /   Unit Tests   \ ← Jest: 100+ pure functions (format, api, hooks)
  /------------------\
```

### 5.2 Unit Tests (Jest)

Test pure functions in `src/lib/`:

```ts
// src/lib/__tests__/format.test.ts
import { fmtRupee, amountInWords, fmtRelative } from '../format';

describe('fmtRupee', () => {
  it('formats crore correctly', () => {
    expect(fmtRupee(10000000)).toBe('₹1,00,00,000');
  });
  it('formats lakh correctly', () => {
    expect(fmtRupee(150000)).toBe('₹1,50,000');
  });
  it('handles zero', () => {
    expect(fmtRupee(0)).toBe('₹0');
  });
  it('handles undefined', () => {
    expect(fmtRupee(undefined)).toBe('₹0');
  });
});

describe('amountInWords', () => {
  it('converts to Indian words', () => {
    expect(amountInWords(1250)).toBe('One Thousand Two Hundred Fifty Rupees Only');
  });
});
```

### 5.3 Component Tests (React Native Testing Library)

```ts
// src/components/ui/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders label', () => {
    const { getByText } = render(<Button>Save Bill</Button>);
    expect(getByText('Save Bill')).toBeTruthy();
  });

  it('shows spinner when loading', () => {
    const { getByTestId } = render(<Button loading>Save</Button>);
    expect(getByTestId('button-spinner')).toBeTruthy();
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button loading onPress={onPress}>Save</Button>);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

### 5.4 E2E Tests — Detox (Critical Flows Only)

5 flows tested in E2E:

```ts
// e2e/billing.test.ts
describe('Billing Flow', () => {
  it('creates a walk-in cash bill end to end', async () => {
    await element(by.id('tab-billing')).tap();
    await element(by.id('walkin-button')).tap();
    await element(by.id('item-search-input')).typeText('Surf Excel');
    await element(by.id('product-Surf Excel')).tap();
    await element(by.id('qty-increment')).tap();
    await element(by.id('next-button')).tap();
    await element(by.id('method-cash')).tap();
    await element(by.id('save-bill-button')).tap();
    await expect(element(by.id('success-screen'))).toBeVisible();
  });
});
```

5 E2E flows:
1. Login → Home → Logout
2. Walk-in bill creation (cash)
3. Record payment for customer
4. Add product with barcode scan (mocked)
5. Invoice detail → share PDF

### 5.5 Test Scripts

```json
// package.json
{
  "scripts": {
    "test":         "jest --watchAll=false",
    "test:unit":    "jest src/lib",
    "test:components": "jest src/components",
    "test:e2e:ios": "detox test -c ios.sim.debug",
    "test:e2e:android": "detox test -c android.emu.debug",
    "test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"lines\":70}}'"
  }
}
```

Coverage thresholds:
- `src/lib/` — 90% minimum
- `src/components/ui/` — 80% minimum
- `app/` screens — 50% minimum (harder to test)

---

## 6. CI/CD PIPELINE

### 6.1 GitHub Actions — Pull Request Checks

```yaml
# .github/workflows/native-pr.yml
name: Native App — PR Checks

on:
  pull_request:
    paths:
      - 'apps/native/**'

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd apps/native && npm ci
      - run: cd apps/native && npx tsc --noEmit

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/native && npm ci
      - run: cd apps/native && npx eslint src/ app/ --max-warnings 0

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/native && npm ci
      - run: cd apps/native && npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: apps/native/coverage/

  expo-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/native && npm ci
      - run: cd apps/native && npx expo-doctor
```

### 6.2 EAS Build Profiles

> Full `eas.json` is defined in **Sprint 20 — Day 3**. Key points summarised here.

| Profile | Distribution | Android output | iOS output | Purpose |
|---------|-------------|---------------|-----------|---------|
| `development` | Internal | `.apk` | Simulator | Local dev with dev client |
| `preview` | Internal (Ad Hoc) | `.apk` | Device | QA + stakeholder review |
| `production` | Store | **`.aab`** (required) | `.ipa` | App Store + Play Store |

**Critical:** production Android must be `buildType: "app-bundle"` — Play Store rejects `.apk` uploads.
`autoIncrement: "buildNumber"` lets EAS manage `versionCode`/`buildNumber` — never edit these manually.

Credentials are stored in EAS (not local files):
```bash
eas credentials            # interactive setup — iOS certs + Android keystore
eas credentials --platform ios --profile production    # view/rotate iOS cert
eas credentials --platform android                     # view/rotate Android keystore
```

### 6.3 Release Workflow (Automated)

```yaml
# .github/workflows/native-release.yml
name: Native App — Release

on:
  push:
    tags: [ 'native/v*' ]   # trigger: git tag native/v1.2.3 && git push --tags

jobs:
  validate:
    name: Typecheck + Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/native/package-lock.json
      - run: cd apps/native && npm ci
      - run: cd apps/native && npx tsc --noEmit
      - run: cd apps/native && npx eslint src/ app/ --max-warnings 0
      - run: cd apps/native && npm test -- --forceExit

  build-and-submit:
    name: EAS Build + Submit
    needs: validate          # only runs if validate passes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/native/package-lock.json

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}   # EAS token from expo.dev account

      - run: cd apps/native && npm ci

      - name: EAS Build — iOS + Android (parallel)
        run: cd apps/native && eas build --platform all --profile production --non-interactive

      - name: Submit to App Store + Play Store
        run: cd apps/native && eas submit --platform all --latest --non-interactive

      - name: Notify Sentry of new release
        run: |
          VERSION=$(node -p "require('./apps/native/package.json').version")
          curl -sS https://sentry.io/api/0/organizations/${{ secrets.SENTRY_ORG }}/releases/ \
            -H "Authorization: Bearer ${{ secrets.SENTRY_AUTH_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d "{\"version\": \"${VERSION}\", \"projects\": [\"execora-native\"]}"
        env:
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

**Required GitHub Secrets:**

| Secret | Where to get it |
|--------|----------------|
| `EXPO_TOKEN` | expo.dev → Account Settings → Access Tokens |
| `SENTRY_ORG` | sentry.io → Settings → Organization slug |
| `SENTRY_AUTH_TOKEN` | sentry.io → Settings → Auth Tokens (project:releases scope) |

### 6.4 OTA Updates (expo-updates)

**Only use OTA for JS-only changes.** Native code changes require full build + store review.

```ts
// src/lib/updates.ts — check for OTA updates on app foreground
import * as Updates from 'expo-updates';
import { logger } from './logger';

export async function checkForUpdate() {
  if (__DEV__) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      logger.info('OTA update available, downloading...');
      await Updates.fetchUpdateAsync();
      // Reload on next app background → foreground (not immediately — avoid jarring UX)
      await Updates.reloadAsync();
    }
  } catch (err) {
    logger.warn('OTA update check failed', { err: String(err) });
    // Non-fatal — app continues on current version
  }
}
```

OTA update policy:
- **Patch (1.0.x):** OTA immediately — bug fixes, copy changes, minor UI tweaks
- **Minor (1.x.0):** OTA with in-app banner "Update available" — user taps to apply
- **Major (x.0.0):** Full store release — breaking API changes, new native permissions

---

## 7. RELEASE PROCESS & VERSIONING

### 7.1 Semantic Versioning

```
Format: MAJOR.MINOR.PATCH (e.g., 1.4.2)

MAJOR — Breaking change: requires store re-review, new permissions, major redesign
MINOR — New feature: new screen, new API integration
PATCH — Bug fix, OTA-eligible
```

```json
// app.json
{
  "expo": {
    "version": "1.4.2",          // Human-readable (semver)
    "ios": {
      "buildNumber": "142"       // Auto-incremented by EAS. Never edit manually.
    },
    "android": {
      "versionCode": 142         // Auto-incremented by EAS. Never edit manually.
    }
  }
}
```

### 7.2 Release Checklist

Before every production release:

```markdown
## Pre-Release Checklist

### Code Quality
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx eslint . --max-warnings 0` passes
- [ ] All unit tests pass (`npm test`)
- [ ] Detox E2E passes on iOS + Android
- [ ] No Sentry errors in staging for 24h

### Functionality
- [ ] Login flow on real device (iOS + Android)
- [ ] Bill creation → walk-in cash bill
- [ ] Bill creation → customer credit bill
- [ ] Record payment
- [ ] Invoice PDF generation + share
- [ ] Offline bill creation + sync when back online
- [ ] Push notification delivered (test via Expo notification tool)

### Store Requirements
- [ ] Version number bumped correctly
- [ ] App Store screenshots updated if UI changed
- [ ] Privacy policy URL still live
- [ ] No hardcoded test API keys in production build
- [ ] `EXPO_PUBLIC_ENV=production` set in EAS production profile

### Post-Release
- [ ] Monitor Sentry for new errors (watch for 2h post-release)
- [ ] Check crash-free rate in Sentry (target: >99.5%)
- [ ] Check App Store reviews for new issues
```

### 7.3 Hotfix Process

```bash
# 1. Branch from the current production tag
git checkout -b hotfix/1.4.3 native/v1.4.2

# 2. Apply fix with minimal scope
# 3. Test on device
# 4. Tag
git tag native/v1.4.3
git push origin native/v1.4.3

# 5. GitHub Action auto-builds + submits
# 6. If OTA-eligible (JS-only): push OTA channel update
eas update --channel production --message "Fix: invoice PDF crash on iOS 17"
```

---

## 8. DEVELOPER ONBOARDING

### 8.1 Prerequisites

```
Node.js 20+  (use nvm: nvm use 20)
pnpm 9+      (npm install -g pnpm)
Expo CLI     (npm install -g expo-cli eas-cli)
iOS:         Xcode 15+ (Mac only), iOS Simulator
Android:     Android Studio, Android Emulator API 33+
```

### 8.2 First-Time Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/execora.git
cd execora

# 2. Install workspace deps
pnpm install

# 3. Setup native app
cd apps/native
cp .env.example .env.local
# Edit .env.local:
#   EXPO_PUBLIC_API_BASE_URL=http://localhost:3006
#   EXPO_PUBLIC_SENTRY_DSN=           # leave blank for local dev
#   EXPO_PUBLIC_ENV=development

# 4. Start backend (in separate terminal)
cd ../../
pnpm dev        # starts API on port 3006

# 5. Start native app
cd apps/native
npx expo start

# 6. Open on device
# iOS: press 'i' for simulator, or scan QR with Expo Go
# Android: press 'a' for emulator, or scan QR with Expo Go
```

### 8.3 Environment Variables

| Variable | Required | Dev value | Purpose |
|----------|----------|-----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ | `http://localhost:3006` | API server URL |
| `EXPO_PUBLIC_ENV` | ✅ | `development` | Controls logging + Sentry sampling |
| `EXPO_PUBLIC_SENTRY_DSN` | Production only | — | Sentry crash reporting |
| `EXPO_PUBLIC_AMPLITUDE_KEY` | Production only | — | Analytics (post-launch) |

**Rules:**
- All env vars must start with `EXPO_PUBLIC_` to be included in the JS bundle
- Never put secrets in `EXPO_PUBLIC_*` — they are visible in the bundle
- API keys for 3rd party services → stored in EAS Secrets, injected at build time only

### 8.4 Dev Scripts Quick Reference

```bash
# Start
npx expo start                    # Start dev server (Metro)
npx expo start --clear            # Clear Metro cache (use when weird errors)

# Run on device
npx expo run:ios                  # Build + run on iOS Simulator
npx expo run:android              # Build + run on Android Emulator

# Type checking
npx tsc --noEmit                  # Full type check
npx tsc --noEmit --watch          # Watch mode

# Tests
npm test                          # Run all Jest tests
npm run test:coverage             # With coverage report
npm run test:e2e:ios              # Detox E2E on iOS sim

# Build
eas build -p ios --profile preview         # Staging build (internal distribution)
eas build -p android --profile preview     # Staging APK

# Update
eas update --channel preview --message "Fix: ..."   # OTA to staging testers
```

### 8.5 Branching Strategy

```
main        ← production code, protected. Only merges via PR.
develop     ← integration branch. PRs merge here first.
feature/S5-billing-wizard     ← sprint branches (S5 = Sprint 5)
fix/invoice-total-rounding    ← bug fixes
hotfix/1.4.3-pdf-crash        ← production hotfixes
```

**PR Rules:**
- All PRs target `develop`
- PR title format: `[S5] Add billing wizard step 2 — item selection`
- Must pass: typecheck + lint + unit tests (CI enforced)
- Requires 1 reviewer approval
- No direct pushes to `main`

---

## 9. CODE MAINTAINABILITY RULES

### 9.1 No Magic Strings

```ts
// src/lib/constants.ts — single source of truth
export const STORAGE_KEYS = {
  AUTH_TOKEN:     'execora_token',
  REFRESH_TOKEN:  'execora_refresh',
  USER:           'execora_user',
  API_BASE_URL:   'execora_api_base',
  PRINTER_DEVICE: 'execora_printer',
  OFFLINE_QUEUE:  'execora_offline_queue',
} as const;

export const QUERY_KEYS = {
  invoices:   ['invoices'] as const,
  invoice:    (id: string) => ['invoices', id] as const,
  products:   ['products'] as const,
  product:    (id: string) => ['products', id] as const,
  customers:  ['customers'] as const,
  summary:    (date: string) => ['reports', 'summary', date] as const,
} as const;

export const INVOICE_STATUS = {
  DRAFT:     'draft',
  PENDING:   'pending',
  PARTIAL:   'partial',
  PAID:      'paid',
  CANCELLED: 'cancelled',
} as const;
```

### 9.2 API Client Versioning

When backend adds a breaking API change:

```ts
// src/lib/api.ts — version gate
const API_VERSION = 'v1';  // bump to v2 when breaking changes arrive

// Never spread API calls across files — all in one place
export const invoiceApi = {
  list:   (params?: InvoiceListParams) => request<InvoiceListResponse>(`/api/${API_VERSION}/invoices`, { params }),
  get:    (id: string)                  => request<Invoice>(`/api/${API_VERSION}/invoices/${id}`),
  create: (body: CreateInvoiceRequest)  => request<Invoice>(`/api/${API_VERSION}/invoices`, { method: 'POST', body }),
  cancel: (id: string, reason: string)  => request<void>(`/api/${API_VERSION}/invoices/${id}/cancel`, { method: 'POST', body: { reason } }),
};
```

### 9.3 Comment Policy

```ts
// ✅ Comment the WHY, never the WHAT
// Indian GST requires IGST for inter-state transactions (different state GSTIN)
// and CGST+SGST for intra-state. Check buyer.state vs seller.state.
const taxType = buyer.state !== seller.state ? 'IGST' : 'CGST_SGST';

// ❌ Never comment the WHAT (code already says this)
// Add 18% GST to the amount
const withGst = amount * 1.18;
```

**JSDoc only on public utility functions:**
```ts
/**
 * Formats a number as Indian Rupees with lakh/crore grouping.
 * @example fmtRupee(1234567) → "₹12,34,567"
 */
export function fmtRupee(amount?: number): string { ... }
```

### 9.4 Deprecation Process

When retiring a component or utility:

```ts
/**
 * @deprecated Use `CustomerSearch` from `@/components/common` instead.
 * Will be removed in v2.0.
 */
export function OldCustomerPicker() { ... }
```

1. Add `@deprecated` JSDoc (TypeScript shows warning at call sites)
2. Leave for 1 major version
3. Remove in next major version

---

## 10. SPRINT 24 — Production Hardening (2 days)

> Add this sprint between Sprint 20 (App Store Submission) and final polish.

**Goal:** Sentry, logging, error boundaries, and OTA updates all production-ready before launch.

| Task | File | Detail |
|------|------|--------|
| Sentry init | `app/_layout.tsx` | DSN from env, strip PII, enable native crash reporting |
| Logger module | `src/lib/logger.ts` | Full logger with Sentry breadcrumbs, color-coded dev output |
| Error boundaries | All screen files | Wrap every route screen in `<ErrorBoundary>` |
| API error types | `src/lib/errors.ts` | `ApiError`, `NetworkError`, `ValidationError` |
| QueryClient tuning | `src/contexts/QueryProvider.tsx` | Retry logic, staleTime, global mutation error handler |
| Constants file | `src/lib/constants.ts` | All STORAGE_KEYS, QUERY_KEYS, INVOICE_STATUS |
| OTA update check | `src/lib/updates.ts` | Check on app foreground, apply on next bg→fg cycle |
| EAS build config | `eas.json` | dev / preview / production profiles with envs |
| GitHub Actions | `.github/workflows/native-pr.yml` | typecheck + lint + test on every PR |
| Release GitHub Action | `.github/workflows/native-release.yml` | Build + submit on git tag push |
| `.env.example` | `.env.example` | Document all env variables |

**Deliverable:** Zero unhandled crashes, all errors logged to Sentry, OTA working.

---

## 11. SPRINT 25 — Documentation Freeze (1 day)

**Goal:** Every developer can onboard, contribute, and release without asking questions.

| Document | Location | Content |
|----------|----------|---------|
| README | `apps/native/README.md` | Quick start (5 commands to running app) |
| Architecture | `apps/native/docs/ARCHITECTURE.md` | Folder structure, naming rules, data flow diagrams |
| API Reference | `apps/native/docs/API_REFERENCE.md` | All API endpoints used, request/response shapes |
| Components | `apps/native/docs/COMPONENTS.md` | All UI components with props tables + screenshots |
| Environments | `apps/native/docs/ENVIRONMENTS.md` | Dev / Staging / Production — URLs, build commands, secrets |
| Release Process | `apps/native/docs/RELEASE.md` | Step-by-step: bump version → build → test → submit |
| Troubleshooting | `apps/native/docs/TROUBLESHOOTING.md` | Metro cache, native build issues, simulator problems, common errors |

**README must answer in 5 minutes:**
1. How do I run this locally?
2. How do I add a new screen?
3. How do I add a new API call?
4. How do I build for staging?
5. How do I release to the stores?

---

## FINAL MILESTONE SUMMARY (WITH PRODUCTION)

> Single authoritative reference. The "UPDATED MILESTONE SUMMARY" above matches this table.

| Milestone | Sprints | Days | What ships |
|-----------|---------|------|-----------|
| M1 — Foundation | 0–2B | 4d | Expo app + login + all UI components + WS real-time layer |
| M2 — Core Billing | 3–5 | 5d | Home + invoices + 3-step billing |
| M3 — Products + Parties | 6–7 | 4d | Inventory + customers + ledger |
| M4 — Financial | 8–10 | 4d | Payment + expenses + day book + cash book |
| M5 — Reports + More | 11–13 | 6d | Charts + GSTR-1 + overdue + settings |
| M6 — Monitoring | 14 | 2d | Store monitor + employee risk |
| M7 — Native Integrations | 15–17 | 4d | Push + deep links + BT printing |
| M8 — Offline + Polish | 18–19 | 5d | Offline queue + animations + QA |
| M9 — Extended Pages | 20–23 | 6d | Voice + e-invoice + GSTR-3B + balance sheet + PO + feedback + coming-soon |
| M10 — Production Hardening | 24 | 2d | Sentry + logging + error boundaries + CI/CD + OTA |
| M11 — Docs Freeze | 25 | 1d | All developer docs complete |
| M12 — Store Compliance + Launch | 26 | 3d | Privacy Manifest + Data Safety + screenshots + EAS build + TestFlight + Play internal |

**Total: ~46 working days (9–10 weeks) for 1 developer**

**Route coverage: 53/53 ✅**
**Feature coverage: 45/45 ✅**
**Production standards: ✅**
**Developer lifecycle: ✅**

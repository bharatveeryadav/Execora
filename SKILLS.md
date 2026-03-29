# Execora Mobile — Engineering Skills Reference

> **Purpose**: Canonical coding standards for the Execora React Native app (`apps/mobile`).  
> Every pattern here is verified against the actual codebase. Follow these rules consistently.

---

## 1. Stack at a Glance

| Concern            | Library                                         | Notes                       |
| ------------------ | ----------------------------------------------- | --------------------------- |
| Runtime            | React Native 0.76.9 + Expo SDK ~52.0.49         | Hermes engine               |
| Styling            | NativeWind v4 + Tailwind CSS                    | `className` prop everywhere |
| Navigation         | React Navigation v7                             | Stack + Tab, typed params   |
| Server state       | React Query v5 (`@tanstack/react-query`)        | `useQuery` / `useMutation`  |
| Complex form state | `useReducer` via `useBillingForm`               | NOT Zustand                 |
| Auth/Offline state | React Context (`AuthContext`, `OfflineContext`) | NOT Redux                   |
| Storage            | react-native-mmkv v3 (`lib/storage.ts`)         | NOT AsyncStorage            |
| HTTP client        | Native `fetch` via `lib/api.ts`                 | NOT Axios                   |
| Icons              | `@expo/vector-icons` (Ionicons)                 |                             |
| Build              | EAS Build + Expo                                | Bundle: `com.execora.app`   |

---

## 2. Absolute Imports — Path Alias

Always use the `@/` alias for imports within `apps/mobile/src/`:

```ts
// ✅ Correct
import { Button } from "@/components/ui/Button";
import { storage } from "@/lib/storage";
import { useBillingForm } from "@/hooks/useBillingForm";

// ❌ Wrong
import { Button } from "../../components/ui/Button";
import { Button } from "../../../components/ui/Button";
```

Monorepo shared packages use the `@execora/` scope:

```ts
import { computeTotals, amountInWords, inr } from "@execora/shared";
import type { BillingItem, Customer, PaymentMode } from "@execora/shared";
```

---

## 3. Styling — NativeWind v4 + Tailwind

### Color Palette (from `tailwind.config.js`)

```js
primary: "#e67e22"; // orange
background: "#f1f3f6";
card: "#fafbfc";
border: "#e2e8f0";
text: "#1e293b";
muted: "#64748b";
success: "#22c55e";
error: "#ef4444";
warning: "#f59e0b";
```

### Key Rules

- Use `className` everywhere — no `StyleSheet.create` for new code.
- Minimum touch target: `className="p-3"` (≥ 44px, per `SIZES.TOUCH_MIN`).
- Cards: `className="bg-card rounded-xl border border-border"`.
- Safe area: always `<SafeAreaView edges={["bottom"]}>` (not top, nav handles it).
- Keyboard avoidance: `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`.

```tsx
// ✅ Correct card pattern
<View className="bg-card rounded-xl border border-border p-4 mb-3">
  <Text className="text-base font-semibold text-text">Card Title</Text>
  <Text className="text-sm text-muted mt-1">Subtitle</Text>
</View>

// ❌ Wrong — inline styles for layout that Tailwind can handle
<View style={{ backgroundColor: '#fafbfc', borderRadius: 12, padding: 16 }}>
```

---

## 4. Navigation — React Navigation v7

### Stack Definitions (`navigation/index.tsx`)

```ts
// Five named stacks — typed params
export type BillingStackParams = {
  BillingForm: { startAsWalkIn?: boolean } | undefined;
  BillingSuccess: { invoiceId: string };
};

export type InvoicesStackParams = {
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  InvoiceEdit: { invoiceId: string };
};

export type CustomersStackParams = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerCreate: undefined;
};
```

### Navigating

```tsx
// ✅ Type-safe navigation
const navigation =
  useNavigation<NativeStackNavigationProp<BillingStackParams>>();
navigation.navigate("BillingForm", { startAsWalkIn: true });

// Cross-stack (from tab navigator parent)
(navigation as any).getParent()?.navigate("DocumentSettings");
```

### Screen Component Signature

```tsx
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<BillingStackParams, "BillingForm">;

export function BillingScreen({ navigation, route }: Props) {
  const { startAsWalkIn } = route.params ?? {};
  // ...
}
```

---

## 5. HTTP — `lib/api.ts` (native fetch, NOT Axios)

Every API call in the app goes through `lib/api.ts`. Never call `fetch` directly in a component.

```ts
// lib/api.ts exports these objects:
customerApi.search(query: string, limit?: number)
customerApi.create(data: { name: string; phone?: string })
customerApi.getById(id: string)

productApi.list(page: number, limit: number)
productApi.search(query: string)

invoiceApi.create(payload: CreateInvoicePayload)
invoiceApi.list(page: number, status?: string)
invoiceApi.getById(id: string)

authApi.me()
authApi.login(email: string, password: string)
authApi.logout()
```

```tsx
// ✅ Always wrap in React Query — never call api directly in a component body
const { data, isLoading } = useQuery({
  queryKey: ["customers-search", query],
  queryFn: () => customerApi.search(query),
  enabled: query.length >= 1,
  staleTime: 5000,
});
```

---

## 6. Server State — React Query v5

### Query Patterns

```tsx
// Basic query
const { data, isLoading, error } = useQuery({
  queryKey: ["invoices", page],
  queryFn: () => invoiceApi.list(page),
  staleTime: 60_000,
});

// Dependent query (only runs when customerId is available)
const { data: customer } = useQuery({
  queryKey: ["customer", customerId],
  queryFn: () => customerApi.getById(customerId!),
  enabled: !!customerId,
});
```

### Mutation Patterns

```tsx
const mutation = useMutation({
  mutationFn: (data: CustomerCreateData) => customerApi.create(data),
  onSuccess: () => {
    void qc.invalidateQueries({ queryKey: ["customers"] });
    navigation.goBack();
  },
  onError: (err: Error) => showAlert("Error", err.message),
});

// Call it:
mutation.mutate(formData);
```

### Query Key Conventions

```ts
["invoices"][("invoices", page)][("invoice", invoiceId)][ // list // paginated list // single item
  ("customers-search", query)
]["products-catalog"][("auth", "me")]; // search results // full catalog (staleTime: 5 min) // current user
```

---

## 7. Complex Form State — `useBillingForm` + `formReducer`

For screens with ≥ 5 interdependent form fields, use `useReducer` via the `useBillingForm` hook. **Never use 10+ `useState` calls in one component.**

### The Hook (`hooks/useBillingForm.ts`)

```ts
const {
  state, // Full FormState object
  dispatch, // Raw dispatch for non-standard ops

  // Item management
  addItem,
  updateItem,
  removeItem,
  clearItems,

  // Customer
  setCustomer,
  setCustomerQuery,
  toggleCustomerSuggest,

  // Pricing
  setWithGst,
  setDiscountPct,
  setDiscountFlat,
  setRoundOff,

  // Payment
  setPaymentMode,
  setPaymentAmount,
  toggleSplit,
  addSplit,
  updateSplit,
  removeSplit,

  // Metadata
  setNotes,
  setDueDate,

  // UI toggles
  setActiveRow,
  toggleNewCustModal,
  setNewCustName,
  setNewCustPhone,
  toggleProductPicker,
  toggleDraftBanner,
  toggleBillingSetup,
  toggleInvoiceStyle,
  toggleInvoiceBarEdit,
  togglePreview,

  // Lifecycle
  resetForm,
  loadDraft,
} = useBillingForm();
```

### Accessing State

```tsx
// Destructure from state — same variable names as before useState
const {
  items,
  selectedCustomer,
  customerQuery,
  showCustSuggest,
  withGst,
  discountPct,
  discountFlat,
  roundOffEnabled,
  paymentMode,
  paymentAmount,
  splitEnabled,
  splits,
  notes,
  dueDate,
  draftBanner,
  activeRow,
  showNewCust,
  productPickerOpen,
  newCustName,
  newCustPhone,
  billingSetupExpanded,
  invoiceStyleExpanded,
  showInvoiceBarEdit,
  showPreview,
} = state;
```

### Draft Save + Restore Pattern

```ts
// Save draft
storage.set(
  DRAFT_KEY,
  JSON.stringify({
    items: validItems,
    selectedCustomer,
    withGst,
    discountPct,
    discountFlat,
    paymentMode,
    paymentAmount,
    splitEnabled,
    notes,
    dueDate,
    savedAt: Date.now(),
  }),
);

// Restore draft (via loadDraft — single dispatch)
loadDraft({
  items: restoredItems,
  selectedCustomer: restoredCustomer,
  withGst: Boolean(d.withGst),
  discountPct: String(d.discountPct ?? ""),
  draftBanner: true,
});

// Discard draft
resetForm();
storage.delete(DRAFT_KEY);
```

### Setter Rename Map (Old useState → Hook)

| Old                          | New (hook helper)          |
| ---------------------------- | -------------------------- |
| `setSelectedCustomer(c)`     | `setCustomer(c)`           |
| `setShowCustSuggest(v)`      | `toggleCustomerSuggest(v)` |
| `setSplitEnabled(v)`         | `toggleSplit(v)`           |
| `setRoundOffEnabled(v)`      | `setRoundOff(v)`           |
| `setDraftBanner(v)`          | `toggleDraftBanner(v)`     |
| `setShowNewCust(v)`          | `toggleNewCustModal(v)`    |
| `setProductPickerOpen(v)`    | `toggleProductPicker(v)`   |
| `setShowPreview(v)`          | `togglePreview(v)`         |
| `setBillingSetupExpanded(v)` | `toggleBillingSetup(v)`    |
| `setInvoiceStyleExpanded(v)` | `toggleInvoiceStyle(v)`    |
| `setShowInvoiceBarEdit(v)`   | `toggleInvoiceBarEdit(v)`  |

---

## 8. Storage — MMKV (`lib/storage.ts`)

Never use `AsyncStorage`. Use MMKV for all local persistence.

```ts
import { storage, tokenStorage, DRAFT_KEY, STORAGE_KEYS } from "@/lib/storage";

// Read (synchronous)
const raw = storage.getString(DRAFT_KEY);
const parsed = raw ? JSON.parse(raw) : null;

// Write
storage.set(DRAFT_KEY, JSON.stringify(data));

// Delete
storage.delete(DRAFT_KEY);

// Auth tokens (separate MMKV instance, encrypted)
const token = tokenStorage.getToken();
tokenStorage.setToken(accessToken, refreshToken);
tokenStorage.clearTokens();
```

### Storage Key Constants

```ts
DRAFT_KEY; // Billing draft
INVOICE_BAR_KEY; // Invoice bar settings (prefix, date, title)
BIZ_STORAGE_KEY; // Business profile cache
PRICE_TIER_KEY; // Active price tier index
INV_TEMPLATE_KEY; // Invoice template id
DOC_SETTINGS_KEY; // Document settings
```

---

## 9. Offline Support (`contexts/OfflineContext.tsx`)

```tsx
const { isOffline } = useOffline();

// In any mutation:
if (isOffline) {
  const id = enqueueInvoice(payload, total, notes);
  return { invoice: { id, invoiceNo: `OFFLINE-${Date.now().toString(36)}` } };
}
// else: normal API call
```

Offline queue syncs automatically when connectivity returns via `lib/offlineQueue.ts`.

---

## 10. Authentication — `contexts/AuthContext.tsx`

```tsx
const { user, token, isLoading, signIn, signOut } = useAuth();

// User type
type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "manager" | "staff" | "viewer";
  tenantId: string;
};
```

Token is stored via `tokenStorage` (MMKV encrypted). On app start, token is read synchronously — no async flash.

---

## 11. Haptics (`lib/haptics.ts`)

Always add haptic feedback to user-initiated actions:

```ts
import { hapticSuccess, hapticError, hapticLight } from "@/lib/haptics";

hapticLight(); // tap / add item
hapticSuccess(); // invoice saved, form submitted
hapticError(); // validation error, API failure
```

---

## 12. UI Components

### Button (`components/ui/Button.tsx`)

```tsx
// Variants: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
<Button variant="primary" onPress={handleSubmit} loading={isSubmitting}>
  Save Invoice
</Button>

<Button variant="outline" onPress={onCancel}>Cancel</Button>
<Button variant="danger" onPress={onDelete}>Delete</Button>
```

### Input (`components/ui/Input.tsx`)

```tsx
<Input
  label="Customer Name"
  value={name}
  onChangeText={setName}
  placeholder="Search or enter name"
  error={errors.name}
  hint="This will appear on the invoice"
/>
```

### Badge (`components/ui/Badge.tsx`)

```tsx
import { STATUS_STYLES } from "@/lib/constants";

// Use STATUS_STYLES for invoice status colours (Tailwind class strings)
<View className={STATUS_STYLES[invoice.status]?.container}>
  <Text className={STATUS_STYLES[invoice.status]?.text}>{invoice.status}</Text>
</View>;
```

---

## 13. FlatList Best Practices

```tsx
// ✅ Always memoize renderItem and keyExtractor
const renderItem = useCallback(
  ({ item }: { item: Invoice }) => (
    <InvoiceRow invoice={item} onPress={() => navToDetail(item.id)} />
  ),
  [navToDetail],
);

const keyExtractor = useCallback((item: Invoice) => item.id, []);

<FlatList
  data={invoices}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{ paddingBottom: 120 }}
  // For searchable lists:
  initialNumToRender={15}
  maxToRenderPerBatch={10}
  windowSize={5}
/>;
```

---

## 14. Constants (`lib/constants.ts`)

```ts
import {
  SIZES,
  COLORS,
  STATUS_COLORS,
  ANIMATIONS,
  INTERVALS,
  STORAGE_KEYS,
} from "@/lib/constants";

SIZES.TOUCH_MIN; // 44   Apple HIG minimum touch target
SIZES.LIST_ROW; // 56   Standard list row height
SIZES.FONT; // { xs:11, sm:13, md:15, lg:17, xl:20, xxl:24 }
SIZES.SPACING; // { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32 }
SIZES.RADIUS; // { sm:6, md:10, lg:14, xl:20, full:9999 }

ANIMATIONS.fast; // 150ms
ANIMATIONS.normal; // 300ms
ANIMATIONS.slow; // 500ms

INTERVALS.SEARCH_DEBOUNCE; // 500ms
INTERVALS.DRAFT_AUTO_SAVE; // 2000ms
```

---

## 15. Formatting Utilities (`lib/utils.ts`)

```ts
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils";

formatCurrency(1234.5); // '₹1,234.50'
formatDate("2025-01-15"); // '15 Jan 2025'
formatPhone("9876543210"); // '+91 98765 43210'
```

For invoice amounts, always use `inr()` from `@execora/shared`:

```ts
import { inr, amountInWords } from "@execora/shared";
inr(1234.5); // '₹1,234.50'
amountInWords(1234.5); // 'Twelve Hundred Thirty Four Rupees and Fifty Paise Only'
```

---

## 16. Error Handling

```tsx
import { showAlert } from '@/lib/alerts';

// In mutation onError:
onError: (err: Error) => {
  hapticError();
  showAlert('Error', err.message);
},

// Validation before submit:
if (!selectedCustomer && !isOffline) {
  showAlert('Required', 'Please select a customer');
  return;
}
```

---

## 17. Anti-Patterns — NEVER DO THESE

```tsx
// ❌ Never use AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

// ❌ Never use Axios
import axios from 'axios';

// ❌ Never call fetch directly in a component
const res = await fetch(`${BASE_URL}/api/v1/invoices`);

// ❌ Never use 10+ useState in one component
const [a, setA] = useState('');
const [b, setB] = useState('');
// ... (10 more)

// ❌ Never hardcode colors — use Tailwind classes
style={{ color: '#e67e22' }}   // wrong
className="text-primary"        // correct

// ❌ Never skip haptics on user-initiated actions
onPress={() => saveInvoice()}              // wrong — no haptic
onPress={() => { hapticSuccess(); save(); }} // correct

// ❌ Never import sub-paths from @execora/infrastructure
import { logger } from '@execora/infrastructure/logger';  // BROKEN
import { logger } from '@execora/infrastructure';          // correct

// ❌ Never use usesCleartextTraffic: true in production
// app.json android.usesCleartextTraffic must be false

// ❌ Never skip safe area
<View style={{ flex: 1 }}>   // missing safe area handling
<SafeAreaView edges={['bottom']}> // correct for screens with nav header
```

---

## 18. Naming Conventions

| Entity            | Convention                  | Example                               |
| ----------------- | --------------------------- | ------------------------------------- |
| Screen files      | PascalCase + Screen suffix  | `InvoiceDetailScreen.tsx`             |
| Hook files        | camelCase + use prefix      | `useBillingForm.ts`                   |
| Component files   | PascalCase                  | `InvoiceRow.tsx`                      |
| Context files     | PascalCase + Context suffix | `AuthContext.tsx`                     |
| Lib files         | camelCase                   | `offlineQueue.ts`, `api.ts`           |
| Screen exports    | Named export, same as file  | `export function InvoiceDetailScreen` |
| Component exports | Named export                | `export function Button`              |
| Hooks             | Named export                | `export function useBillingForm`      |

---

## 19. TypeScript Strictness

The app runs full strict TypeScript. Key rules:

```ts
// ✅ Always type API response shapes explicitly
const res = await invoiceApi.create(payload);
const invoice = (res as { invoice: Invoice }).invoice;

// ✅ Use type imports for types-only
import type { BillingItem, Customer } from '@execora/shared';

// ✅ Prefer interfaces for props, types for unions
interface CustomerRowProps {
  customer: Customer;
  onPress: (id: string) => void;
  isSelected?: boolean;
}

// ✅ Always type FlatList renderItem correctly
renderItem={({ item }: ListRenderItemInfo<Invoice>) => <InvoiceRow invoice={item} />}

// ❌ Never use any unless casting unavoidable API shapes
const user = data as any;  // wrong
const user = (data as { user: User }).user;  // correct
```

---

## 20. Adding a New Screen — Checklist

1. Create `src/screens/FooScreen.tsx` with named export
2. Add to correct stack in `src/navigation/index.tsx` (add to `FooStackParams` type + `Stack.Screen`)
3. Add tab or deep link if needed
4. Add route to `apps/api/src/api/routes/` if new API endpoint required
5. If complex form: create `src/hooks/useFooForm.ts` + `src/lib/fooReducer.ts`
6. Add to `docs/mobile/MASTER.md` sprint tracker

---

## 21. Adding a New API Endpoint — Checklist

Backend (`apps/api/src/api/routes/`):

1. Create `foo.routes.ts` with typed Fastify route
2. Define JSON schema for request/response
3. Add `preHandler: [requireAuth]` (or `requireAdminKey` for admin routes)
4. Register in `apps/api/src/index.ts`

Mobile (`apps/mobile/src/lib/api.ts`):

1. Add method to the appropriate API object
2. Use `getApiBaseUrl()` + `tokenStorage.getToken()` for auth header
3. Wrap in React Query in the screen

---

## 22. Performance Checklist

Before shipping any list screen:

- [ ] `renderItem` wrapped in `useCallback`
- [ ] `keyExtractor` wrapped in `useCallback`
- [ ] Row component wrapped in `React.memo`
- [ ] `initialNumToRender={15}`, `maxToRenderPerBatch={10}` on large lists
- [ ] `staleTime` set on queries (don't leave at 0 for catalog data)
- [ ] Draft auto-save debounced at 2000ms minimum
- [ ] No inline object/array creation in JSX (breaks memo)

```tsx
// ❌ Break memo:
<FlatList data={invoices.filter((i) => i.status === "pending")} />;

// ✅ Stable reference:
const pendingInvoices = useMemo(
  () => invoices.filter((i) => i.status === "pending"),
  [invoices],
);
<FlatList data={pendingInvoices} />;
```

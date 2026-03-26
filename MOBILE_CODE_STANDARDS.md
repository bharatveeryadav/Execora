# Mobile App Code Standards & Best Practices

**Last Updated:** March 2026  
**Applicable to:** React Native 0.73+ with Expo, TypeScript 5.0+  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [File Organization](#file-organization)
2. [Naming Conventions](#naming-conventions)
3. [TypeScript Best Practices](#typescript-best-practices)
4. [Component Patterns](#component-patterns)
5. [State Management](#state-management)
6. [Performance](#performance)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Accessibility](#accessibility)
10. [Common Pitfalls](#common-pitfalls)

---

## File Organization

### Directory Structure
```
src/
├── screens/              # Full-screen components (Feature)
├── components/
│   ├── ui/              # Atomic design system components
│   ├── common/          # Reusable feature components
│   └── composites/      # Complex composite components (NEW)
├── contexts/            # Global state (Auth, Offline, etc)
├── hooks/               # Custom React hooks
├── lib/                 # Business logic, utilities, API
├── navigation/          # Route definitions & setup
├── providers/           # Context providers
└── types/              # Shared TypeScript types (optional)
```

### File Naming
```typescript
// ✅ Correct patterns
- ScreenName.tsx          (screens always suffix with "Screen")
- ComponentName.tsx       (components PascalCase)
- useSomething.ts        (hooks use "use" prefix)
- something.utils.ts     (utilities with .utils suffix)
- types.ts               (type definitions)
- constants.ts           (constants and enums)

// ❌ Avoid
- index.tsx             (unclear purpose)
- component.tsx         (redundant)
- my-component.tsx      (use PascalCase)
```

### File Size Guidelines
```
✅ Ideal sizes:
- UI components: 50-150 lines
- Composite components: 150-300 lines
- Screens: 300-500 lines (use sub-components if larger)
- Utils/hooks: 50-200 lines

⚠️ Red flags:
- Screen > 600 lines = needs refactoring
- Component > 400 lines = likely needs splitting
- File > 1000 lines = definitely refactor to sub-components
```

---

## Naming Conventions

### Variables & Functions
```typescript
// ✅ Best practices
const userName = "John";              // camelCase for variables
const getUserName = () => {};         // camelCase for functions
const isLoading = false;              // boolean with is/has/should prefix
const onPress = () => {};             // event handlers with onX prefix
const handleSubmit = async () => {};  // handler functions with handle prefix

// Constants
const MAX_RETRY_COUNT = 3;            // UPPER_SNAKE_CASE
const STATUS_COLORS = {};             // UPPER_SNAKE_CASE
const defaultValue = 42;              // const with meaningful name

// ❌ Avoid
const load_data = () => {};           // snake_case in JS
const x = 0;                          // single letter (except i, j in loops)
const userNameString = "John";        // redundant type in name
const onUserNameChanged = () => {};   // past tense (use onChange not onChanged)
```

### TypeScript Types
```typescript
// ✅ Correct
type UserProfile = { name: string; email: string };          // Type
interface UserRepository { getUser(): Promise<User> }       // Interface
enum InvoiceStatus { DRAFT, PENDING, PAID }                 // Enum
type Maybe<T> = T | null;                                    // Generic alias

// ❌ Avoid
type user = {};                       // lowercase
interface IUser {}                    // I prefix (outdated)
enum Colors { red = "red" }          // PascalCase values (usually)
type user_data = {};                  // snake_case
```

### Prop Interface Naming
```typescript
// ✅ Correct
interface ButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  onPress: () => void;
}

interface ButtonProps extends Omit<TouchableOpacityProps, "onPress"> {
  variant?: "primary" | "secondary";
  // Extends native props and removes conflicting ones
}

// ❌ Avoid
interface Button {}                   // Use ButtonProps suffix
interface ButtonComponentProps {}     // Redundant "Component"
type IButtonProps = {}                // Don't use I prefix with Props
```

---

## TypeScript Best Practices

### Use Strict Mode (✅ Already enabled)
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Typing Patterns
```typescript
// ✅ Explicit return types
const getUserName = (user: User): string => user.name;

// ✅ Function declarations with types
function fetchUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}

// ✅ Union types for variants
type Status = "idle" | "loading" | "success" | "error";

// ✅ Generic constraints
type ApiResponse<T extends Record<string, unknown>> = {
  data: T;
  error: string | null;
};

// ✅ Discriminated unions for type safety
type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: string };

// ❌ Avoid
const getName: any = (user: any) => user.name;
function fetchData(id): Promise<any> {}          // no param type
const handler = (e) => {};                        // No event type
let data: Record<string, any> = {};              // Too loose
```

### Using `satisfies` for Type Safety
```typescript
// ✅ Modern TypeScript pattern (5.4+)
const STATUS_COLORS = {
  paid: { bg: "#dcfce7", text: "#16a34a" },
  pending: { bg: "#fef3c7", text: "#d97706" },
  draft: { bg: "#f3f4f6", text: "#6b7280" },
} satisfies Record<InvoiceStatus, { bg: string; text: string }>;

// OR older pattern with explicit type
const STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string }> = {
  paid: { bg: "#dcfce7", text: "#16a34a" },
  pending: { bg: "#fef3c7", text: "#d97706" },
  draft: { bg: "#f3f4f6", text: "#6b7280" },
};

// This ensures:
// 1. All InvoiceStatus values are present
// 2. Properties match expected shape
// 3. IDE autocomplete works perfectly
```

---

## Component Patterns

### Functional Components (✅ Always use)
```typescript
// ✅ Correct pattern
export const MyComponent = React.memo(function MyComponent({ 
  title, 
  onPress 
}: MyComponentProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

// ✅ With destructuring & defaults
interface MyComponentProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}

export const MyComponent = React.memo(
  function MyComponent({ 
    title, 
    subtitle, 
    onPress, 
    disabled = false 
  }: MyComponentProps) {
    return (/*...*/);
  }
);

// ❌ Avoid class components (legacy)
// ❌ Avoid default export (use named exports for better refactoring)
// ❌ Avoid spreading props: <View {...props} /> (loses type safety)
```

### Component Composition
```typescript
// ✅ Compose smaller, focused components
const InvoiceList = ({ invoices }: InvoiceListProps) => (
  <FlatList
    data={invoices}
    renderItem={({ item }) => <InvoiceRow invoice={item} />}
  />
);

const InvoiceRow = ({ invoice }: InvoiceRowProps) => (
  <Card>
    <InvoiceNumber number={invoice.number} />
    <InvoiceAmount amount={invoice.total} />
    <InvoiceStatus status={invoice.status} />
  </Card>
);

// ❌ Don't inline too much
const InvoiceList = ({ invoices }: InvoiceListProps) => (
  <FlatList
    data={invoices}
    renderItem={({ item }) => (
      <Card>
        {/* 50 lines of inline JSX ❌ */}
      </Card>
    )}
  />
);
```

### Using React.memo Correctly
```typescript
// ✅ Memoize when props are stable
export const MemoizedComponent = React.memo(
  function MemoizedComponent({ id, onPress }: Props) {
    return <TouchableOpacity onPress={onPress} />;
  },
  // ✅ Custom comparison function when needed
  (prev, next) => {
    return prev.id === next.id && prev.onPress === next.onPress;
  }
);

// ⚠️ Common mistake: memoizing with unstable props
// This defeats the purpose:
const Parent = () => {
  return (
    <MemoizedChild
      // ❌ New function every render
      onPress={() => console.log("clicked")}
      // ❌ New object every render
      data={{ id: 1, name: "test" }}
    />
  );
};

// ✅ Correct: stabilize props before passing
const Parent = () => {
  const handlePress = useCallback(() => console.log("clicked"), []);
  const data = useMemo(() => ({ id: 1, name: "test" }), []);
  return <MemoizedChild onPress={handlePress} data={data} />;
};
```

---

## State Management

### useState with Objects (Avoid Sprawl)
```typescript
// ❌ Bad: 80+ useState calls (BillingScreen problem)
const [itemName, setItemName] = useState("");
const [itemQty, setItemQty] = useState("");
const [itemRate, setItemRate] = useState("");
const [itemDiscount, setItemDiscount] = useState("");
// ... 76 more individual useState calls ❌

// ✅ Good: Combined state object
type FormState = {
  items: BillingItem[];
  customer: Customer | null;
  pricing: { withGst: boolean; discount: number };
  payment: { mode: PaymentMode; amount: string };
};

const [form, setForm] = useState<FormState>(initialState);

// ✅ Best: Use useReducer for complex forms (see formReducer.ts)
const [form, dispatch] = useReducer(formReducer, initialState);

// Usage:
dispatch({ type: "UPDATE_ITEM", id: 1, patch: { qty: "5" } });
dispatch({ type: "SET_PAYMENT_MODE", mode: "upi" });
```

### Context for Global State
```typescript
// ✅ Correct pattern
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      setUser(response.user);
    } catch (error) {
      showError("Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    storage.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Custom hook for clean usage
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Usage:
const { user, login, logout } = useAuth();
```

---

## Performance

### Preventing Unnecessary Re-renders
```typescript
// ✅ Use useCallback for stable callback references
const handlePress = useCallback(() => {
  // Do something
}, [dependency1, dependency2]);

// ✅ Use useMemo for expensive computations
const filteredItems = useMemo(
  () => items.filter(item => matches(item, searchQuery)),
  [items, searchQuery]
);

// ✅ Use React.memo for expensive components
export const HeavyList = React.memo(function HeavyList({
  items,
  onPress,
}: Props) {
  // Component only re-renders if items/onPress actually change
  return (/*...*/);
}, (prev, next) => {
  // Custom comparison if needed
  return prev.items === next.items && prev.onPress === next.onPress;
});

// ⚠️ Common mistake: Inline functions in render
<FlatList
  renderItem={({ item }) => (
    // ❌ NEW COMPONENT INSTANCE EVERY RENDER
    <Card onPress={() => navigate("Detail", { id: item.id })} />
  )}
/>

// ✅ Extract and pass data
<FlatList
  renderItem={({ item }) => (
    <Card onPress={handleCardPress} item={item} />
  )}
/>

const handleCardPress = useCallback((itemId: string) => {
  navigate("Detail", { id: itemId });
}, []);
```

### FlatList Best Practices
```typescript
// ✅ Complete pattern for performant lists
const MyList = ({ items }: Props) => {
  const keyExtractor = useCallback((item: Item) => item.id.toString(), []);
  
  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ListItem item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      maxToRenderPerBatch={10}            // Optimize rendering batch
      updateCellsBatchingPeriod={50}      // ms between batches
      windowSize={10}                     // Number of cells to maintain
      removeClippedSubviews={true}        // Remove off-screen items
      getItemLayout={(data, index) => ({  // If fixed height items
        length: 56,
        offset: 56 * index,
        index,
      })}
      scrollEventThrottle={16}            // For scroll event optimization
      viewabilityConfig={{                // For tracking visible items
        itemVisiblePercentThreshold: 50,
      }}
    />
  );
};
```

### Lazy Loading & Code Splitting
```typescript
// ✅ Use React.lazy for screen splitting (if needed)
const SettingsScreen = React.lazy(() => import("./screens/SettingsScreen"));

// ✅ Pre-fetch data while user interacts
const handleScreenFocus = useCallback(() => {
  queryClient.prefetchQuery({
    queryKey: ["invoices"],
    queryFn: () => api.getInvoices(),
  });
}, [queryClient]);

useFocusEffect(handleScreenFocus);

// ✅ Use React Query with appropriate cache times
useQuery({
  queryKey: ["invoices", filters],
  queryFn: () => api.getInvoices(filters),
  staleTime: 10 * 60 * 1000,  // Fresh for 10 minutes
  gcTime: 30 * 60 * 1000,     // Keep in memory for 30 minutes
});
```

---

## Error Handling

### API Error Handling
```typescript
// ✅ Comprehensive error handler
type ApiError = {
  status: number;
  message: string;
  code: string;
};

const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.message ?? error.message;
    const code = error.response?.data?.code ?? "UNKNOWN";
    return { status, message, code };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message, code: "ERROR" };
  }

  return { status: 500, message: "An unknown error occurred", code: "UNKNOWN" };
};

// Usage:
useMutation({
  mutationFn: api.createInvoice,
  onError: (error) => {
    const { message, code } = handleApiError(error);
    if (code === "VALIDATION_ERROR") {
      showValidationError(message);
    } else if (code === "UNAUTHORIZED") {
      logout();
    } else {
      showErrorToast(message);
    }
  },
});
```

### Try-Catch Best Practices
```typescript
// ✅ Type your errors
async function fetchData() {
  try {
    const response = await api.getData();
    return response;
  } catch (error) {
    if (error instanceof NetworkError) {
      handleOffline();
    } else if (error instanceof ValidationError) {
      showValidationUI();
    } else {
      logError("Unexpected error in fetchData", error);
      throw error; // Re-throw if can't handle
    }
  }
}

// ✅ Use error boundaries for UI
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    logError("Uncaught error in component tree", error);
    // Show error UI
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }
    return this.props.children;
  }
}
```

---

## Testing

### Unit Test Examples
```typescript
// ✅ Test utility functions
describe("computeTotals", () => {
  it("calculates subtotal correctly", () => {
    const items = [
      { name: "Item 1", qty: 2, rate: 100, discount: 0, amount: 200 },
      { name: "Item 2", qty: 1, rate: 50, discount: 10, amount: 45 },
    ];
    const result = computeTotals(items, "", "", false, false);
    expect(result.subtotal).toBe(245);
  });

  it("applies percentage discount", () => {
    const items = [{ amount: 100 }];
    const result = computeTotals(items, "10", "", false, false);
    expect(result.discountAmt).toBe(10);
  });

  it("calculates GST correctly", () => {
    const items = [{ amount: 100 }];
    const result = computeTotals(items, "", "", true, false);
    expect(result.taxableAmt).toBe(100);
    expect(result.cgst + result.sgst).toBe(18);
  });
});

// ✅ Test hooks
describe("useOffline", () => {
  it("detects network status changes", async () => {
    const { result } = renderHook(() => useOffline());
    
    expect(result.current.isOffline).toBe(false);

    // Simulate network change
    act(() => {
      NetInfo.addEventListener.mock.calls[0][0](false);
    });

    expect(result.current.isOffline).toBe(true);
  });

  it("auto-syncs when coming online", async () => {
    const { result } = renderHook(() => useOffline());
    
    // Go offline, queue something
    // Come back online
    // Expect sync to be called
  });
});

// ✅ Test components
describe("InvoiceCard", () => {
  it("renders invoice details", () => {
    const invoice = { id: "1", number: "INV-001", total: 1000 };
    const { getByText } = render(<InvoiceCard invoice={invoice} />);
    
    expect(getByText("INV-001")).toBeTruthy();
    expect(getByText("₹1,000")).toBeTruthy();
  });

  it("calls onPress when clicked", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <InvoiceCard invoice={mockInvoice} onPress={onPress} />
    );

    fireEvent.press(getByTestId("invoice-card"));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Testing Checklist
- [ ] Unit tests for all utility functions
- [ ] Hook tests for custom hooks (useOffline, useResponsive, etc)
- [ ] Component tests for UI components
- [ ] Integration tests for critical flows (billing, payments)
- [ ] E2E tests for user journeys (at least happy path)
- [ ] Navigation tests for route management
- [ ] Performance tests (FlatList rendering, memoization)

---

## Accessibility

### Basic Requirements (WCAG 2.1 AA)
```typescript
// ✅ Use accessibilityLabel for semantic meaning
<TouchableOpacity accessibilityLabel="Create new invoice">
  <Ionicons name="add" size={24} />
</TouchableOpacity>

// ✅ Use accessibilityRole
<View
  role="button"
  onPress={handlePress}
  keyboardType="none"
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled }}
>
  {/*...*/}
</View>

// ✅ Hit target size (44×44 minimum)
<TouchableOpacity style={{ width: 44, height: 44 }}>
  <Ionicons name="add" size={24} />
</TouchableOpacity>

// ✅ Color contrast (4.5:1 minimum for text)
// Use provided color constants with verified contrast

// ✅ Test with screen readers
const isScreenReaderEnabled = useAccessibilityInfo().screenReaderEnabled;

// ✅ Keyboard navigation
<TextInput
  accessible={true}
  accessibilityLabel="Invoice amount"
  accessibilityHint="Enter the total invoice amount"
/>
```

---

## Common Pitfalls

### 1. **Infinite Loops in useEffect**
```typescript
// ❌ Bad: infinite loop
useEffect(() => {
  fetchData(); // Dependency missing
}, []); // Empty deps = runs once normally, but...

// If data is used in another effect:
useEffect(() => {
  setProcessed(true); // Runs every render
}, [data]); // data changed = fetchData runs again = loop

// ✅ Good: Specify deps correctly
useEffect(() => {
  fetchData();
}, [userId]); // Only when userId changes

useEffect(() => {
  if (data) processData(data);
}, [data]);
```

### 2. **Memory Leaks in Subscriptions**
```typescript
// ❌ Bad: Memory leak
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(handleNetChange);
  // Forgot to unsubscribe!
}, []);

// ✅ Good: Clean up subscriptions
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(handleNetChange);
  return () => unsubscribe(); // Cleanup function
}, []);
```

### 3. **Mutable State Updates**
```typescript
// ❌ Bad: Mutating state directly
const [items, setItems] = useState([]);
items.push(newItem); // ❌ Direct mutation

// ✅ Good: Create new array
setItems([...items, newItem]);
setItems((prev) => [...prev, newItem]);

// ❌ Bad: Mutating objects in state
form.customer.name = "John"; // ❌ Mutating
setForm(form); // React won't detect change

// ✅ Good: New object via spread
setForm({
  ...form,
  customer: {
    ...form.customer,
    name: "John",
  },
});
```

### 4. **Closure Issues in Callbacks**
```typescript
// ❌ Bad: Stale closure
function handleSearch(query: string) {
  setTimeout(() => {
    // searchQuery might be outdated by now
    filterItems(searchQuery);
  }, 500);
}

// ✅ Good: useCallback with dependencies
const handleSearch = useCallback(
  (query: string) => {
    setTimeout(() => {
      filterItems(query); // Correct reference
    }, 500);
  },
  [],
);
```

### 5. **Passing Inline Objects as Props**
```typescript
// ❌ Bad: New object every render
<Card
  style={{ padding: 16, borderRadius: 8 }}
  onPress={handlePress}
/>

// ✅ Good: Extract or use constants
const cardStyle = { padding: 16, borderRadius: 8 };
<Card style={cardStyle} onPress={handlePress} />

// ✅ Or with Tailwind (✅ Preferred)
<Card className="p-4 rounded-2xl" onPress={handlePress} />
```

### 6. **Not Handling Loading States**
```typescript
// ❌ Bad: Doesn't show loading
const MyScreen = () => {
  const { data } = useQuery({ queryKey: ["data"] });
  return <FlatList data={data} renderItem={renderItem} />;
};

// ✅ Good: Handle all states
const MyScreen = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["data"],
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorCard error={error} />;
  if (!data?.items?.length) return <EmptyState />;

  return <FlatList data={data.items} renderItem={renderItem} />;
};
```

---

## Summary Checklist

Before committing code, ensure:

- [ ] **Structure**: Correct folder, file naming, size
- [ ] **Types**: Strong TypeScript types with explicit returns
- [ ] **Components**: Memoized if needed, props properly typed
- [ ] **State**: useReducer for complex, Context for global
- [ ] **Performance**: useMemo/useCallback for expensive operations
- [ ] **Error Handling**: Try-catch with user feedback
- [ ] **Testing**: Unit tests for critical logic
- [ ] **Accessibility**: Labels, roles, hit targets, contrast
- [ ] **Code Style**: Consistent with Tailwind (NativeWind)
- [ ] **Docs**: JSDoc for complex functions, inline comments for why

---

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Best Practices](https://reactnative.dev/docs/performance)
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Query Documentation](https://tanstack.com/query/latest)

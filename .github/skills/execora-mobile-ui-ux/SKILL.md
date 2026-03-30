---
name: execora-mobile-ui-ux
description: "Design and implement production-ready UI/UX for the Execora React Native app. Use for new screens, redesigns, component extraction, responsive improvements, accessibility, loading/empty/error states, and performance tuning in apps/mobile."
argument-hint: 'Task + screen names, e.g. "Improve Billing + Reports mobile UX"'
user-invocable: true
---

# Execora Mobile UI/UX Skill

## What This Skill Does

This skill converts high-level UI/UX goals into implementation-ready React Native work for the Execora mobile app.

It is optimized for:

- React Native + Expo in apps/mobile
- NativeWind-based styling
- Existing design tokens and primitives
- Business workflows: billing, customers, invoices, inventory, reports

## Use When

Use this skill when the ask includes any of these:

- "improve UI"
- "better UX"
- "redesign screen"
- "make it mobile friendly"
- "add loading/empty/error states"
- "make list smooth"
- "component extraction"
- "design system alignment"
- "dark mode"
- "fix clutter"
- "responsive layout"
- "platform specific"

## Source Of Truth (Execora)

1. Theme and scale: ./references/execora-ui-ux-playbook.md
2. Constants and tokens: apps/mobile/src/lib/constants.ts
3. Typography: apps/mobile/src/lib/typography.ts
4. UI primitives: apps/mobile/src/components/ui/
5. Navigation map: apps/mobile/src/navigation/index.tsx
6. Responsive layout primitive: apps/mobile/src/components/ui/ScreenLayout.tsx

---

## Mandatory Rules

1. Preserve app visual identity: primary color #e67e22 and existing semantic palette.
2. Prefer existing UI primitives before adding new ones.
3. Keep touch targets at or above 44×44 dp (not just width — both dimensions).
4. Add loading, empty, and error states for every data surface.
5. Keep lists performant: memoized renderItem/keyExtractor + FlatList perf props.
6. Keep accessibility labels/roles/hints for ALL interactive controls.
7. Do not introduce cross-screen style drift; use shared tokens/typography.
8. Use `Pressable` (not `TouchableOpacity`) for all new pressable elements.
9. Use `useWindowDimensions()` hook for screen size — never `Dimensions.get('window')` (hook responds to rotation/resize).
10. Shadow tokens: use `Platform.select({ ios: { shadowColor, shadowOffset, shadowOpacity, shadowRadius }, android: { elevation } })` — never apply iOS shadow props on Android or vice-versa.

---

## Design Token Hierarchy (Single Source of Truth)

Use the three-tier model. Never use raw hex values in components.

```
GLOBAL TOKENS (raw, in constants.ts)
	COLORS.primary → #e67e22
	SIZES.SPACING.md → 16
	SIZES.RADIUS.lg → 12

SEMANTIC TOKENS (purpose aliases)
	color.action → COLORS.primary
	color.danger → COLORS.error
	color.muted → COLORS.textMuted
	spacing.card → SIZES.SPACING.lg

COMPONENT TOKENS (scoped defaults)
	button.primary.bg → color.action
	card.radius → SIZES.RADIUS.lg
	list.row.minHeight → SIZES.TOUCH_MIN (44)
```

Color semantic map to always honour:
- `primary` → Main CTA, FAB, active tabs (#e67e22)
- `success` → Paid, confirmed, positive states (green)
- `warning` → Partial paid, low stock (amber)
- `destructive/danger` → Delete, cancelled, error (red)
- `muted` → Disabled, placeholder, secondary text
- `background` → Screen/page fill
- `card` → Elevated surfaces, modals
- `border` → Dividers, input outlines

---

## Atomic Component Classification

Follow atomic design. Know which layer you are editing:

```
ATOMS         → Button, Input, Badge, Icon, Skeleton, Text, Avatar
MOLECULES     → SearchBar, FormField, ListRow, StatusChip, Card
ORGANISMS     → InvoiceCard, CustomerSummary, FilterBar, EmptyState
TEMPLATES     → ScreenInner, ScreenLayout (centered max-width wrapper)
SCREENS       → Full screens in src/screens/ — wire organisms together
```

Rules:
- Atoms never contain business logic.
- Molecules have single responsibility.
- Organisms may fetch data / manage local state.
- Screens keep business logic in hooks; render organisms.

---

## Platform-Specific Patterns

### iOS vs Android differences to encode in code:

```typescript
import { Platform, StyleSheet } from 'react-native';

// Shadow — MUST use Platform.select, not blind ios-only props
const shadow = Platform.select({
	ios: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
	},
	android: {
		elevation: 3,
	},
});

// Keyboard avoid — behavior differs per platform
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

// Hairline separator
borderBottomWidth: StyleSheet.hairlineWidth
```

### File-based platform branching (for large divergence only):
- `Component.ios.tsx` → iOS-specific variant
- `Component.android.tsx` → Android-specific variant
- `Component.tsx` → shared fallback

---

## Typography Rules (Official RN Pattern)

```typescript
import { PixelRatio, useWindowDimensions } from 'react-native';

// Normalize size to screen density (375 = iPhone 8 base width)
const normalize = (size: number) => {
	const { width } = useWindowDimensions();
	const scale = width / 375;
	return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};
```

Always set `maxFontSizeMultiplier` on `<Text>` nodes to cap system accessibility scaling:
```tsx
<Text maxFontSizeMultiplier={1.5}>...</Text>
```
Use the `MAX_FONT_SIZE_MULTIPLIER` constant from `apps/mobile/src/lib/typography.ts`.

---

## Responsive Layout Rules

- `ScreenInner` wraps all screen content. Provides `maxWidth` auto-centered layout.
- `useResponsive()` gives `{ width, contentWidth, contentPad, isSmall, isTablet }`.
- FAB canonical formula:
	```ts
	const { bottom } = useSafeAreaInsets();
	const fabBottom = Math.max(bottom + 16, 20);
	const fabRight = Math.max(contentPad, (width - contentWidth) / 2 + contentPad);
	```
- Safe area: always `useSafeAreaInsets()` for bottom/top offsets — never hardcode `paddingBottom: 24`.

---

## List Performance (FlatList + FlashList)

For lists under ~100 items: FlatList with performance props.
For lists >100 items or complex rows: prefer `@shopify/flash-list` (significantly faster recycling).

```tsx
// FlatList — required perf props
<FlatList
	data={items}
	renderItem={renderItem}           // useCallback-memoized
	keyExtractor={keyExtractor}       // useCallback-memoized
	initialNumToRender={12}
	maxToRenderPerBatch={10}
	windowSize={7}
	removeClippedSubviews={true}
	getItemLayout={fixedHeight        // add when row height is fixed
		? (_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })
		: undefined}
/>
```

`getItemLayout` eliminates layout measurement cost for fixed-height rows — always add it when row height is constant.

Defer heavy work after navigation transitions:
```ts
import { InteractionManager } from 'react-native';
InteractionManager.runAfterInteractions(() => {
	// expensive data load or computation
});
```

---

## Animation Guidelines (Official RN)

Prefer `react-native-reanimated` (Reanimated 2+) for animations — runs on the UI thread at 60/120 fps, not the JS thread.

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const offset = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({ translateY: offset.value }));
// Drive: offset.value = withSpring(newValue);
```

For list insertions/removals: `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before state update.

Always respect reduced-motion preference:
```typescript
import { useReducedMotion } from 'react-native-reanimated';
const reduceMotion = useReducedMotion();
const duration = reduceMotion ? 0 : 300;
```

---

## Form & Keyboard Handling

```typescript
// Always wrap form screens
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
	<ScrollView keyboardShouldPersistTaps="handled">
		...
	</ScrollView>
</KeyboardAvoidingView>

// Match keyboard type to input purpose
<TextInput keyboardType="decimal-pad"    />   // price, quantity
<TextInput keyboardType="phone-pad"      />   // phone numbers
<TextInput keyboardType="email-address"  />   // email
<TextInput keyboardType="number-pad"     />   // PIN, OTP
<TextInput returnKeyType="next"          />   // when more fields follow
<TextInput returnKeyType="done"          />   // last field in form
```

Validation timing: validate on blur (`onEndEditing`), not on every keystroke. Show inline error below the field.

---

## Dark Mode & Theming

```typescript
import { useColorScheme } from 'react-native';

const scheme = useColorScheme(); // 'light' | 'dark' | null
const isDark = scheme === 'dark';

// Use semantic palette from tokens — never raw hex
const bg = isDark ? COLORS.backgroundDark : COLORS.background;
const text = isDark ? COLORS.foregroundDark : COLORS.foreground;
```

All new token additions must include both light and dark variants in `constants.ts`.
NativeWind dark mode: use `dark:` prefix classes (`dark:bg-slate-900`).

---

## Accessibility (Full Checklist)

```typescript
// Icon-only button — required
<Pressable accessibilityRole="button" accessibilityLabel="Create invoice">

// Heading semantic role
<Text accessibilityRole="header">Dashboard</Text>

// State communication
<Pressable accessibilityState={{ disabled: isDisabled, selected: isActive }}>

// Announce dynamic changes to screen reader
import { AccessibilityInfo } from 'react-native';
AccessibilityInfo.announceForAccessibility('Invoice saved successfully');

// Check if screen reader is active (adapt UX)
const [isReader, setIsReader] = useState(false);
useEffect(() => {
	AccessibilityInfo.isScreenReaderEnabled().then(setIsReader);
}, []);
```

Full checklist:
- [ ] All `Pressable` / `TouchableOpacity` have `accessibilityLabel`
- [ ] All `Pressable` have `accessibilityRole`
- [ ] Headings use `accessibilityRole="header"`
- [ ] Form inputs have linked labels or `accessibilityLabel`
- [ ] Disabled states declared in `accessibilityState`
- [ ] Lists use `accessibilityRole="list"` on container, `"listitem"` on rows (where meaningful)
- [ ] `maxFontSizeMultiplier` set on all `<Text>` nodes
- [ ] Touch targets ≥ 44×44 dp (add `hitSlop` if visual size is smaller)
- [ ] Color is not the ONLY indicator (add icon or text alongside color)

---

## Image Handling

Use `expo-image` (`<Image>`) instead of RN's built-in `<Image>` — it has blurhash placeholders, lazy loading, and better caching.

```typescript
import { Image } from 'expo-image';

<Image
	source={{ uri }}
	style={{ width: 80, height: 80 }}
	contentFit="cover"
	placeholder={BLURHASH}      // show while loading
	transition={200}             // fade in
/>
```

Always enforce explicit `width` and `height` on images — never let them be unconstrained.

---

## Implementation Workflow

1. **Understand screen intent**
	 - Identify primary user action, secondary actions, and success criteria.
	 - Map data density and hierarchy for small screens first.
	 - Apply 60-30-10 color rule: 60% neutral, 30% supporting, 10% primary/accent.

2. **Audit existing implementation**
	 - Reuse existing primitives in `apps/mobile/src/components/ui/`.
	 - Reuse constants from `apps/mobile/src/lib/constants.ts`.
	 - Reuse typography from `apps/mobile/src/lib/typography.ts`.
	 - Wrap content in `ScreenInner` for auto-centering on tablets.

3. **Build screen structure**
	 - Header → search/filter controls → primary content list → sticky CTA.
	 - Keep vertical rhythm with SPACING scale (4/8/12/16/24/32).
	 - One dominant CTA per screen.

4. **Handle asynchronous states**
	 - Loading: Skeleton or lightweight placeholder (no full-screen spinner for small fetches).
	 - Empty: `EmptyState` with clear next-action CTA.
	 - Error: `ErrorCard` with safe retry action.
	 - Catastrophic failures: `ErrorBoundary` at navigator level.

5. **Platform branching**
	 - Apply `Platform.select` for shadows, keyboard behavior, header padding.
	 - Test on both iOS and Android (check safe area, ripple vs opacity feedback).

6. **Optimize interaction and performance**
	 - `useCallback` for event handlers, `renderItem`, `keyExtractor`.
	 - `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `getItemLayout` for lists.
	 - `InteractionManager.runAfterInteractions` for data loads after navigation.
	 - Avoid inline objects/functions in JSX hot paths.

7. **Validate accessibility and readability**
	 - Run through the accessibility checklist above.
	 - `maxFontSizeMultiplier` on all `<Text>`.
	 - Confirm 44×44 touch targets (add `hitSlop` where needed).

8. **Final verification**
	 - `npx tsc --noEmit` clean on the mobile project.
	 - Screen-level manual check: small phone (375px) + tablet (768px+) widths.
	 - Confirm no regression in navigation params/route behavior.

---

## Output Format For UI/UX Tasks

When applying this skill to a task, return:

1. UI/UX diagnosis (issues and impact)
2. Proposed design adjustments
3. Exact code changes by file
4. Validation performed
5. Follow-up improvements (optional)

---

## Non-Goals

- Do not alter backend contracts unless explicitly requested.
- Do not replace the app design system with a new one.
- Do not add new dependencies if existing primitives can solve the problem.

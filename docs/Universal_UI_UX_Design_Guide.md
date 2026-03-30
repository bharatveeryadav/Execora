# 🎨 Universal UI/UX Design & Engineering Guide
## The Complete Reference for Building Production-Grade Applications

> **Platform Coverage:** Web (React/Next.js), Mobile Web (PWA), React Native (iOS & Android), Tablet/iPad
> **Scope:** From design thinking to pixel-perfect implementation
> **Level:** Intermediate → Expert

---

## Table of Contents

1. [Design Thinking & Process](#1-design-thinking--process)
2. [Design Systems Architecture](#2-design-systems-architecture)
3. [Color Theory & Theming](#3-color-theory--theming)
4. [Typography System](#4-typography-system)
5. [Spacing & Layout Systems](#5-spacing--layout-systems)
6. [Component Architecture](#6-component-architecture)
7. [Navigation Patterns](#7-navigation-patterns)
8. [Form Design & Input Patterns](#8-form-design--input-patterns)
9. [Data Display & Visualization](#9-data-display--visualization)
10. [Animation & Motion Design](#10-animation--motion-design)
11. [Responsive & Adaptive Design](#11-responsive--adaptive-design)
12. [Platform-Specific Patterns](#12-platform-specific-patterns)
13. [Accessibility (a11y)](#13-accessibility-a11y)
14. [Performance & Optimization](#14-performance--optimization)
15. [State Management for UI](#15-state-management-for-ui)
16. [Dark Mode & Theming](#16-dark-mode--theming)
17. [Iconography & Visual Assets](#17-iconography--visual-assets)
18. [Micro-Interactions & Feedback](#18-micro-interactions--feedback)
19. [Error Handling & Empty States](#19-error-handling--empty-states)
20. [Onboarding & First-Time UX](#20-onboarding--first-time-ux)
21. [Testing UI/UX](#21-testing-uiux)
22. [Design-to-Code Workflow](#22-design-to-code-workflow)
23. [Appendix: Cheat Sheets & Quick Reference](#23-appendix-cheat-sheets--quick-reference)

---

## 1. Design Thinking & Process

### 1.1 The Double Diamond Framework

```
DISCOVER → DEFINE → DEVELOP → DELIVER
  ↓           ↓         ↓          ↓
Research    Ideate    Prototype   Ship
Empathize   Focus     Build      Iterate
Observe     Scope     Test       Measure
```

### 1.2 Before Writing Any Code

Ask these questions for EVERY project:

| Question | Why It Matters |
|----------|---------------|
| Who is the primary user? | Dictates complexity, language, interaction patterns |
| What device do they primarily use? | Mobile-first vs desktop-first approach |
| What is the core action? | Everything else is secondary to this |
| What's the emotional tone? | Drives color, typography, spacing decisions |
| What are the constraints? | Offline? Low bandwidth? Accessibility needs? |

### 1.3 User Personas Quick Framework

```
PERSONA CARD:
┌─────────────────────────────────────┐
│ Name: [Archetype Name]             │
│ Age: [Range]  Device: [Primary]    │
│ Tech Comfort: [Low/Med/High]       │
│ Core Goal: [One sentence]          │
│ Frustration: [Primary pain point]  │
│ Context: [Where/when they use app] │
└─────────────────────────────────────┘
```

### 1.4 Information Architecture

```
CONTENT AUDIT → CARD SORTING → SITEMAP → WIREFRAMES → PROTOTYPE
```

**Card Sorting Methods:**
- **Open Sort:** Users create their own categories (discovery phase)
- **Closed Sort:** Users place items into predefined categories (validation phase)
- **Hybrid:** Mix of both

### 1.5 Design Audit Checklist

Before building, audit these across every screen:
- [ ] Visual hierarchy is clear (what do users see first, second, third?)
- [ ] Primary action is obvious and reachable
- [ ] Content density matches the context
- [ ] Navigation is consistent and predictable
- [ ] Feedback exists for every user action
- [ ] Error states are designed (not afterthoughts)
- [ ] Loading states are designed
- [ ] Empty states guide users to action

---

## 2. Design Systems Architecture

### 2.1 What Is a Design System?

A design system is NOT a component library. It's a living ecosystem:

```
DESIGN SYSTEM
├── Design Tokens (colors, spacing, typography, shadows, radii)
├── Foundation (reset, base styles, global patterns)
├── Components (atoms → molecules → organisms → templates)
├── Patterns (recurring solutions: auth flows, search, onboarding)
├── Guidelines (voice, tone, writing, imagery)
└── Documentation (usage, dos/don'ts, code examples)
```

### 2.2 Design Tokens — The Single Source of Truth

Design tokens are platform-agnostic values that represent design decisions.

**Token Hierarchy:**

```
GLOBAL TOKENS (raw values)
  → color.orange.500: #F97316
  → spacing.4: 16px
  → font.size.lg: 18px

SEMANTIC TOKENS (purpose-driven aliases)
  → color.primary: color.orange.500
  → spacing.card-padding: spacing.4
  → font.heading: font.size.lg

COMPONENT TOKENS (scoped overrides)
  → button.primary.bg: color.primary
  → button.primary.padding: spacing.3
  → card.padding: spacing.card-padding
```

### 2.3 Implementing Tokens Across Platforms

**Web (CSS Variables + Tailwind):**
```css
:root {
  /* Global Tokens */
  --color-orange-500: 24 90% 50%;
  --spacing-unit: 4px;

  /* Semantic Tokens */
  --primary: var(--color-orange-500);
  --background: 0 0% 100%;
  --foreground: 220 25% 10%;
  --card: 0 0% 100%;
  --card-foreground: 220 25% 10%;
  --muted: 220 15% 93%;
  --muted-foreground: 220 10% 45%;
  --border: 220 13% 91%;
  --ring: var(--primary);
  --radius: 0.75rem;

  /* Elevation */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

.dark {
  --primary: 24 90% 50%;
  --background: 220 20% 8%;
  --foreground: 30 15% 95%;
  /* ... all tokens get dark variants */
}
```

**React Native (StyleSheet + Theme Context):**
```typescript
// tokens.ts
export const tokens = {
  colors: {
    primary: { light: '#F97316', dark: '#F97316' },
    background: { light: '#FFFFFF', dark: '#141B2D' },
    foreground: { light: '#1A1F2E', dark: '#F0EDE8' },
    card: { light: '#FFFFFF', dark: '#1E2738' },
    muted: { light: '#EDECEB', dark: '#2A3040' },
    border: { light: '#E5E3E0', dark: '#2E3548' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    md: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
    lg: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
  },
};

// ThemeContext.tsx
const ThemeContext = createContext(tokens.colors);
export const useTheme = () => useContext(ThemeContext);
```

### 2.4 Atomic Design Methodology

```
ATOMS         → Smallest UI elements (Button, Input, Badge, Icon)
MOLECULES     → Groups of atoms (SearchBar, FormField, Card)
ORGANISMS     → Complex, distinct sections (Header, ProductList, CheckoutForm)
TEMPLATES     → Page-level layouts (DashboardLayout, AuthLayout)
PAGES         → Templates with real data (HomePage, SettingsPage)
```

**Rules:**
1. Atoms should NEVER contain business logic
2. Molecules combine atoms with a single responsibility
3. Organisms can fetch data and manage local state
4. Templates define layout — content is injected
5. Pages wire everything together

### 2.5 Component API Design Principles

```typescript
// ❌ BAD: Too many unrelated props
<Card
  title="Hello"
  showBorder={true}
  onClick={handleClick}
  backgroundColor="red"
  padding="large"
  isLoading={false}
  error={null}
/>

// ✅ GOOD: Composable, uses variants + children
<Card variant="elevated" size="lg" onClick={handleClick}>
  <CardHeader>
    <CardTitle>Hello</CardTitle>
  </CardHeader>
  <CardContent>
    {isLoading ? <Skeleton /> : <Content />}
  </CardContent>
</Card>
```

**Component API Checklist:**
- [ ] Uses composition (children) over configuration (props)
- [ ] Variant-based styling (not inline styles or color props)
- [ ] Forwards refs for parent control
- [ ] Spreads remaining props (`...rest`)
- [ ] Has sensible defaults
- [ ] Types are strict but flexible

---

## 3. Color Theory & Theming

### 3.1 Color Fundamentals

**HSL vs HEX vs RGB:**
- **HSL** (Hue, Saturation, Lightness) — Best for design systems. Easy to create variants by adjusting lightness.
- **HEX** — Compact but hard to manipulate programmatically
- **RGB** — Direct but unintuitive for humans

```
HSL ADVANTAGE:
Base:    hsl(24, 90%, 50%)  → Primary Orange
Light:   hsl(24, 85%, 95%)  → Tinted Background
Dark:    hsl(24, 90%, 30%)  → Pressed State
Muted:   hsl(24, 30%, 70%)  → Disabled State
```

### 3.2 Building a Color Palette

**The 60-30-10 Rule:**
```
60% → Background/Neutral (--background, --card)
30% → Secondary/Supporting (--muted, --secondary)
10% → Accent/Primary (--primary, --accent)
```

**Generating a Complete Palette from One Color:**

```
Given: Primary = hsl(24, 90%, 50%) (Orange)

Step 1: Generate Scale (adjust lightness)
  50:  hsl(24, 95%, 97%)  → Lightest tint
  100: hsl(24, 90%, 93%)
  200: hsl(24, 85%, 85%)
  300: hsl(24, 80%, 72%)
  400: hsl(24, 85%, 60%)
  500: hsl(24, 90%, 50%)  → Base
  600: hsl(24, 90%, 42%)
  700: hsl(24, 85%, 35%)
  800: hsl(24, 80%, 28%)
  900: hsl(24, 75%, 20%)
  950: hsl(24, 70%, 12%)  → Darkest shade

Step 2: Complementary Colors
  Success:  hsl(142, 70%, 40%)  → Green
  Warning:  hsl(45, 95%, 50%)   → Amber
  Error:    hsl(0, 75%, 55%)    → Red
  Info:     hsl(210, 80%, 55%)  → Blue

Step 3: Neutral Scale (desaturated version of primary hue)
  Gray-50:  hsl(24, 10%, 98%)
  Gray-100: hsl(24, 8%, 93%)
  Gray-200: hsl(24, 6%, 85%)
  ...through to...
  Gray-900: hsl(24, 5%, 10%)
```

### 3.3 Contrast & Accessibility

| WCAG Level | Normal Text | Large Text (18px+) |
|------------|-------------|---------------------|
| AA         | 4.5:1       | 3:1                 |
| AAA        | 7:1         | 4.5:1               |

**Quick Contrast Check Formula:**
```
If background lightness > 55% → Use dark text (lightness < 25%)
If background lightness < 45% → Use light text (lightness > 90%)
Between 45-55% → Avoid (poor contrast zone)
```

### 3.4 Color Semantics

NEVER use raw colors in components. Always map to semantic purpose:

```css
/* ❌ BAD */
.button { background: #F97316; }
.error { color: red; }

/* ✅ GOOD */
.button { background: hsl(var(--primary)); }
.error { color: hsl(var(--destructive)); }
```

**Semantic Color Map:**

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--primary` | Brand action, CTAs | Buttons, links, FAB |
| `--secondary` | Supporting actions | Secondary buttons, tags |
| `--accent` | Highlights, badges | Active states, chips |
| `--muted` | Subtle backgrounds | Disabled, placeholder areas |
| `--destructive` | Errors, danger | Delete buttons, error text |
| `--success` | Positive feedback | Success toasts, checkmarks |
| `--warning` | Caution | Warnings, low-stock indicators |
| `--info` | Informational | Tips, help text |
| `--background` | Page background | Body, main container |
| `--foreground` | Primary text | Headings, body copy |
| `--card` | Elevated surfaces | Cards, modals, sheets |
| `--border` | Dividers, outlines | Inputs, separators, cards |

---

## 4. Typography System

### 4.1 Type Scale

Use a **modular scale** for consistent sizing. Common ratios:

| Ratio | Name | Factor | Best For |
|-------|------|--------|----------|
| 1.125 | Major Second | × 1.125 | Dense UIs, mobile |
| 1.200 | Minor Third | × 1.2 | General purpose |
| 1.250 | Major Third | × 1.25 | Content-heavy, editorial |
| 1.333 | Perfect Fourth | × 1.333 | Bold, dramatic layouts |

**Example Scale (1.25 ratio, base 16px):**
```
xs:    10px  (0.625rem)  → Captions, helper text
sm:    13px  (0.8125rem) → Labels, metadata
base:  16px  (1rem)      → Body text
lg:    20px  (1.25rem)   → Subheadings
xl:    25px  (1.5625rem) → Section headings
2xl:   31px  (1.9375rem) → Page headings
3xl:   39px  (2.4375rem) → Hero text
4xl:   49px  (3.0625rem) → Display
```

### 4.2 Font Pairing Strategy

```
PATTERN: Display + Body

EXAMPLES:
  Editorial:     Playfair Display + Source Serif Pro
  Modern SaaS:   Cal Sans + Inter
  Finance:       IBM Plex Sans + IBM Plex Mono
  Playful:       Fredoka + Nunito
  Indian/Desi:   Mukta + Hind
  Neutral Pro:   Geist + Geist Mono
  System Stack:  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

RULES:
  1. Max 2 font families per project
  2. Display font = headings only (sparingly)
  3. Body font = everything else
  4. Monospace = code, data, numbers
```

### 4.3 Line Height & Spacing

```
BODY TEXT:     line-height: 1.5–1.75  (comfortable reading)
HEADINGS:      line-height: 1.1–1.3   (tight, impactful)
CAPTIONS:      line-height: 1.4       (compact)
BUTTONS:       line-height: 1         (vertically centered)

LETTER SPACING:
  Headings:    -0.01em to -0.03em (tighter)
  Body:        0 (normal)
  ALL CAPS:    +0.05em to +0.1em (wider for readability)
  Small text:  +0.01em (slightly wider)
```

### 4.4 Responsive Typography

**Web (Fluid Typography with clamp):**
```css
h1 { font-size: clamp(1.75rem, 4vw + 1rem, 3rem); }
h2 { font-size: clamp(1.375rem, 3vw + 0.75rem, 2.25rem); }
body { font-size: clamp(0.9375rem, 1vw + 0.75rem, 1.125rem); }
```

**React Native (Platform-Aware):**
```typescript
import { Platform, PixelRatio } from 'react-native';

const fontScale = PixelRatio.getFontScale();
const normalize = (size: number) => {
  const scale = width / 375; // iPhone 8 base width
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

const typography = {
  h1: { fontSize: normalize(28), lineHeight: normalize(34), fontWeight: '700' as const },
  h2: { fontSize: normalize(22), lineHeight: normalize(28), fontWeight: '600' as const },
  body: { fontSize: normalize(16), lineHeight: normalize(24), fontWeight: '400' as const },
  caption: { fontSize: normalize(12), lineHeight: normalize(16), fontWeight: '400' as const },
};
```

### 4.5 Text Truncation Patterns

```css
/* Single line ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line clamp (web) */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

```typescript
// React Native
<Text numberOfLines={2} ellipsizeMode="tail">
  Long text here...
</Text>
```

---

## 5. Spacing & Layout Systems

### 5.1 The 4px/8px Grid

ALL spacing should be multiples of 4px (minimum) or 8px (preferred):

```
4px   → Tight: icon-to-label, inline gaps
8px   → Compact: list item padding, small gaps
12px  → Default small: form field gap
16px  → Standard: card padding, section gaps
24px  → Comfortable: between content blocks
32px  → Roomy: section separators
48px  → Spacious: major section breaks
64px  → Generous: page-level separations
```

### 5.2 Spacing Token Map

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### 5.3 Layout Patterns

**Container Strategy:**
```css
/* Mobile-First Container */
.container {
  width: 100%;
  max-width: 480px;     /* Phone */
  margin: 0 auto;
  padding: 0 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 768px; padding: 0 24px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 1200px; padding: 0 32px; }
}
```

**Common Layout Patterns:**
```
STACK (vertical)        INLINE (horizontal)      GRID
┌──────────┐           ┌───┬───┬───┐            ┌───┬───┬───┐
│ Item 1   │           │ A │ B │ C │            │ 1 │ 2 │ 3 │
├──────────┤           └───┴───┴───┘            ├───┼───┼───┤
│ Item 2   │                                     │ 4 │ 5 │ 6 │
├──────────┤           SPLIT                     └───┴───┴───┘
│ Item 3   │           ┌──────┬────┐
└──────────┘           │ Left │Right│            SIDEBAR
                       │      │    │            ┌────┬──────────┐
CLUSTER                └──────┴────┘            │Nav │ Content  │
┌───┬───┬───┐                                   │    │          │
│ A │ B │ C │          CENTER                   │    │          │
├───┼───┘   │          ┌──────────┐             └────┴──────────┘
│ D │       │          │  ┌────┐  │
└───┘       │          │  │    │  │
            │          │  └────┘  │
            └──────────┘         └──────────┘
```

### 5.4 Flexbox vs Grid Decision Matrix

| Use Case | Use Flexbox | Use Grid |
|----------|-------------|----------|
| Single axis layout | ✅ | ❌ |
| Two-axis layout | ❌ | ✅ |
| Unknown item count | ✅ | ⚠️ |
| Fixed column layout | ❌ | ✅ |
| Equal height columns | ⚠️ | ✅ |
| Centering | ✅ | ✅ |
| Source order independence | ❌ | ✅ |
| Wrapping items | ✅ | ✅ |

### 5.5 Safe Areas (Mobile)

```css
/* Web - iOS notch handling */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Bottom nav specific */
.bottom-nav {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}
```

```typescript
// React Native
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Component = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* content */}
    </View>
  );
};
```

---

## 6. Component Architecture

### 6.1 Component Classification

```
PRESENTATIONAL (Dumb)          CONTAINER (Smart)
├── Pure rendering             ├── Fetches data
├── Props-driven               ├── Manages state
├── No side effects            ├── Contains business logic
├── Highly reusable            ├── App-specific
└── Design-system ready        └── Composes presentational components
```

### 6.2 Component Variant System (CVA Pattern)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // BASE STYLES (always applied)
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    compoundVariants: [
      // Special case: destructive + outline
      { variant: 'outline', size: 'lg', className: 'border-2' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}
```

### 6.3 Composition Patterns

**Compound Component Pattern:**
```typescript
// Usage: Fully composable, order-independent
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Subtitle</Card.Description>
  </Card.Header>
  <Card.Content>Body</Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>

// Implementation
const CardContext = createContext({});

const Card = ({ children, ...props }) => (
  <CardContext.Provider value={{}}>
    <div className="rounded-lg border bg-card" {...props}>{children}</div>
  </CardContext.Provider>
);
Card.Header = ({ children }) => <div className="p-6 pb-0">{children}</div>;
Card.Title = ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>;
Card.Content = ({ children }) => <div className="p-6">{children}</div>;
Card.Footer = ({ children }) => <div className="p-6 pt-0 flex gap-2">{children}</div>;
```

**Render Props Pattern (for complex UI logic):**
```typescript
<DataTable
  data={users}
  renderRow={(user) => (
    <TableRow key={user.id}>
      <TableCell>{user.name}</TableCell>
      <TableCell><Badge variant={user.status}>{user.status}</Badge></TableCell>
    </TableRow>
  )}
  renderEmpty={() => <EmptyState icon={Users} message="No users found" />}
  renderLoading={() => <TableSkeleton rows={5} />}
/>
```

### 6.4 Essential Component Library

Every production app needs these components:

```
FOUNDATION
├── Button (variants: default, secondary, destructive, outline, ghost, link)
├── Input (text, email, phone, number, search, password)
├── Textarea
├── Select / Dropdown
├── Checkbox
├── Radio Group
├── Switch / Toggle
├── Slider
├── Label

FEEDBACK
├── Toast / Notification
├── Alert / Banner
├── Badge / Chip
├── Progress (bar + circular)
├── Skeleton / Shimmer
├── Spinner / Loading

LAYOUT
├── Card
├── Separator / Divider
├── Accordion / Collapsible
├── Tabs
├── Sheet / Bottom Sheet (mobile)
├── Dialog / Modal
├── Drawer (side panel)
├── ScrollArea

NAVIGATION
├── Bottom Navigation (mobile)
├── Sidebar (desktop)
├── Breadcrumb
├── Pagination
├── Top Bar / App Bar

DATA
├── Table
├── List / FlatList
├── Avatar
├── Calendar
├── Chart (Line, Bar, Pie)
├── Empty State
├── Error Boundary
```

### 6.5 React Native Component Equivalents

| Web (React) | React Native | Notes |
|-------------|-------------|-------|
| `<div>` | `<View>` | Flexbox by default (column) |
| `<span>`, `<p>` | `<Text>` | Must wrap ALL text |
| `<img>` | `<Image>` | Requires dimensions |
| `<input>` | `<TextInput>` | No type variants |
| `<button>` | `<Pressable>` | Preferred over TouchableOpacity |
| `<ScrollView>` | `<ScrollView>` | Same concept |
| `<FlatList>` | `<FlatList>` | Virtualized list |
| CSS classes | `StyleSheet` | No cascading |
| `onClick` | `onPress` | Touch event |
| `hover:` | N/A | No hover on mobile |
| `position: fixed` | N/A | Use absolute within container |

---

## 7. Navigation Patterns

### 7.1 Mobile Navigation Decision Tree

```
How many top-level destinations?

2-5 destinations → BOTTOM TAB BAR
  ├── Always visible
  ├── Icon + optional label
  ├── Active state indicator
  └── Middle FAB for primary action

6+ destinations → HAMBURGER / DRAWER
  ├── Side drawer (swipe or tap)
  ├── Grouped sections
  └── Secondary items here

DEEP HIERARCHY → STACK NAVIGATION
  ├── Push/pop screens
  ├── Back button
  └── Header with title

RELATED CONTENT → TOP TABS
  ├── Swipeable
  ├── 2-5 tabs max
  └── Within a screen
```

### 7.2 Bottom Navigation Implementation

```typescript
// Web (React)
const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'add', label: 'New', icon: Plus, isFab: true },
  { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

const BottomNav = () => {
  const [active, setActive] = useState('home');
  
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card border-t safe-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          if (tab.isFab) {
            return (
              <button key={tab.id} onClick={() => setActive(tab.id)}
                className="w-14 h-14 -mt-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Icon className="w-7 h-7 text-primary-foreground" />
              </button>
            );
          }
          return (
            <button key={tab.id} onClick={() => setActive(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3
                ${active === tab.id ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
```

```typescript
// React Native (with React Navigation)
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

const Navigation = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        const icons = { Home: 'home', Search: 'search', Profile: 'user' };
        return <Icon name={icons[route.name]} size={size} color={color} />;
      },
      tabBarActiveTintColor: tokens.colors.primary.light,
      tabBarInactiveTintColor: tokens.colors.muted.light,
      tabBarStyle: {
        height: 60 + (Platform.OS === 'ios' ? 20 : 0),
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);
```

### 7.3 Navigation Transitions

```
PUSH (forward): Slide in from right → Content pushes left
POP (back): Slide in from left → Content pushes right
MODAL (overlay): Slide up from bottom → Dimmed background
FADE (replace): Cross-fade between screens
NONE (instant): Tab switches, state changes
```

### 7.4 Gesture Navigation

| Gesture | Action | Platform |
|---------|--------|----------|
| Swipe right from edge | Go back | iOS, Android (with nav) |
| Swipe down | Dismiss modal/sheet | Universal |
| Swipe between tabs | Switch tab content | Universal |
| Long press | Context menu | Universal |
| Pull down | Refresh content | Universal |
| Pinch | Zoom image/map | Universal |

---

## 8. Form Design & Input Patterns

### 8.1 Form UX Principles

1. **One column** — Multi-column forms reduce completion by 47%
2. **Top-aligned labels** — Fastest completion time (research-proven)
3. **Inline validation** — Validate on blur, not on every keystroke
4. **Smart defaults** — Pre-fill what you can
5. **Progress indication** — For multi-step forms
6. **Appropriate keyboard** — Number pad for phone, email keyboard for email

### 8.2 Input States

Every input must handle ALL states:

```
DEFAULT     → Neutral, ready for input
FOCUSED     → Active ring/border color
FILLED      → Content present, not focused
ERROR       → Red border, error message below
DISABLED    → Reduced opacity, no interaction
READONLY    → Filled but not editable
LOADING     → Spinner inside input
```

```css
/* Web Implementation */
.input {
  /* Default */
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
  outline: none;
}
.input[aria-invalid="true"] {
  border-color: hsl(var(--destructive));
}
.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 8.3 Mobile-Optimized Inputs

```typescript
// Keyboard types for different inputs
<input type="tel"       inputMode="tel"       /> // Phone: 0-9, +, -, ()
<input type="email"     inputMode="email"     /> // Email: @, .com shortcut
<input type="number"    inputMode="decimal"   /> // Price: 0-9, decimal point
<input type="text"      inputMode="numeric"   /> // PIN/OTP: numeric only
<input type="url"       inputMode="url"       /> // URL: /, .com, .org
<input type="search"    inputMode="search"    /> // Search: search button on keyboard

// React Native keyboard types
<TextInput keyboardType="phone-pad" />
<TextInput keyboardType="email-address" />
<TextInput keyboardType="decimal-pad" />
<TextInput keyboardType="number-pad" />
<TextInput keyboardType="url" />
```

### 8.4 OTP / PIN Input Pattern

```typescript
// Web: Using individual inputs with auto-focus
const OtpInput = ({ length = 6, onComplete }) => {
  const [values, setValues] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);
    
    if (value && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
    
    const code = newValues.join('');
    if (code.length === length) onComplete(code);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {values.map((val, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          value={val}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          className="w-12 h-14 text-center text-xl font-bold border rounded-lg
            focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      ))}
    </div>
  );
};
```

### 8.5 Search Pattern

```typescript
const SearchBar = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products, customers..."
        className="w-full pl-10 pr-10 h-10 bg-muted rounded-lg border-0 
          focus:ring-2 focus:ring-primary/20"
      />
      {query && (
        <button onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
};
```

### 8.6 Form Validation Strategy

```
CLIENT-SIDE VALIDATION TIMING:
┌────────────────────────────────────────────┐
│ On Focus   → Show hint/requirements       │
│ On Input   → Format as they type (phone)   │
│ On Blur    → Validate field               │
│ On Submit  → Validate all, scroll to error │
└────────────────────────────────────────────┘

VALIDATION MESSAGE PATTERNS:
❌ "Invalid input"              → Too vague
❌ "Error in field"             → Not helpful
✅ "Phone number must be 10 digits" → Specific
✅ "Enter a valid email (e.g., name@company.com)" → Example included
```

---

## 9. Data Display & Visualization

### 9.1 List Design Patterns

```
SIMPLE LIST          DETAIL LIST           ACTION LIST
┌──────────┐        ┌──────────────┐      ┌──────────────────┐
│ Item 1   │        │ 🖼 Title     │      │ Item 1     [>]   │
│ Item 2   │        │    Subtitle  │      │ Item 2     [>]   │
│ Item 3   │        │    Meta      │      │ Item 3     [>]   │
└──────────┘        └──────────────┘      └──────────────────┘

GROUPED LIST         CARD LIST             SWIPEABLE
┌──SECTION A──┐     ┌─────────────┐       ← Swipe for actions →
│ Item 1      │     │ ┌─────────┐ │       ┌──────────────────┐
│ Item 2      │     │ │  Card   │ │       │▓▓ Item    Edit Del│
├──SECTION B──┤     │ │ Content │ │       └──────────────────┘
│ Item 3      │     │ └─────────┘ │
└─────────────┘     └─────────────┘
```

### 9.2 Table Design for Mobile

Tables rarely work on mobile. Alternatives:

```
DESKTOP TABLE → MOBILE CARD
┌────┬──────┬───────┬──────┐     ┌─────────────────┐
│ ID │ Name │ Amount│Status│     │ John Doe         │
├────┼──────┼───────┼──────┤     │ ₹5,000  • Paid  │
│ 1  │ John │ ₹5000 │ Paid │  →  │ Invoice #1       │
│ 2  │ Jane │ ₹3000 │ Due  │     ├─────────────────┤
└────┴──────┴───────┴──────┘     │ Jane Smith       │
                                  │ ₹3,000  • Due   │
                                  │ Invoice #2       │
                                  └─────────────────┘
```

### 9.3 Number & Currency Formatting

```typescript
// Indian Number System
const formatIndianCurrency = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};
// ₹1,23,456.78

// Western Number System
const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
// $123,456.78

// Compact formatting for dashboards
const formatCompact = (num: number): string => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
};
```

### 9.4 Chart Selection Guide

| Data Story | Chart Type | Best For |
|-----------|------------|----------|
| Trend over time | Line Chart | Revenue, growth, analytics |
| Part of whole | Pie / Donut | Category breakdown |
| Comparison | Bar Chart | Products, periods |
| Distribution | Histogram | Price ranges, scores |
| Relationship | Scatter | Correlation analysis |
| Progress | Gauge / Ring | KPIs, goals |
| Hierarchy | Treemap | Budget allocation |
| Flow | Sankey | User journey, funnel |

### 9.5 Dashboard KPI Cards

```typescript
const KPICard = ({ title, value, change, trend, icon: Icon }) => (
  <div className="bg-card rounded-xl p-4 border">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <div className={`flex items-center gap-1 mt-1 text-sm
          ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      </div>
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
  </div>
);
```

---

## 10. Animation & Motion Design

### 10.1 Animation Principles for UI

```
DURATION GUIDELINES:
  Micro-interactions:  100-200ms  (button press, toggle)
  Transitions:         200-300ms  (page slide, modal open)
  Complex animations:  300-500ms  (staggered lists, hero)
  Loading/ambient:     1000ms+    (skeleton pulse, breathing)

EASING:
  ease-out       → Entering elements (feels responsive)
  ease-in        → Exiting elements (quick exit)
  ease-in-out    → Moving elements (smooth repositioning)
  spring         → Playful, bouncy interactions
  linear         → NEVER for UI (feels robotic)
```

### 10.2 Framer Motion Patterns (Web)

```typescript
// Staggered list entry
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      <ItemCard {...item} />
    </motion.div>
  ))}
</motion.div>

// Page transitions
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

<AnimatePresence mode="wait">
  <motion.div key={currentPage} {...pageVariants} transition={{ duration: 0.2 }}>
    {children}
  </motion.div>
</AnimatePresence>

// Press feedback
<motion.button whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
  Submit
</motion.button>

// Layout animation (shared element)
<motion.div layoutId={`card-${id}`} className="bg-card rounded-xl p-4">
  {expanded ? <ExpandedContent /> : <CollapsedContent />}
</motion.div>
```

### 10.3 React Native Animations

```typescript
// React Native Reanimated
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';

// Spring animation
const Component = () => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => { scale.value = withSpring(0.95); };
  const onPressOut = () => { scale.value = withSpring(1); };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={animatedStyle}>
        <Text>Press Me</Text>
      </Animated.View>
    </Pressable>
  );
};

// Entering/Exiting animations
<Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
  <Content />
</Animated.View>

// Staggered list
{items.map((item, index) => (
  <Animated.View
    key={item.id}
    entering={SlideInRight.delay(index * 50).springify()}
    layout={Layout.springify()}
  >
    <ListItem {...item} />
  </Animated.View>
))}
```

### 10.4 CSS-Only Animations (Performance First)

```css
/* Skeleton loading shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Pulse glow (FAB button) */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
  50% { box-shadow: 0 0 0 12px hsl(var(--primary) / 0); }
}

/* Slide up entry */
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.sheet-enter { animation: slide-up 0.3s ease-out; }
```

---

## 11. Responsive & Adaptive Design

### 11.1 Breakpoint System

```
MOBILE FIRST BREAKPOINTS:
  320px   → Small phones (iPhone SE)
  375px   → Standard phones (iPhone 12/13/14)
  390px   → Larger phones (iPhone 14 Pro)
  414px   → Large phones (iPhone Plus models)
  428px   → Max phones (iPhone Pro Max)
  768px   → Tablets portrait (iPad)
  1024px  → Tablets landscape / Small laptops
  1280px  → Laptops
  1440px  → Desktops
  1920px  → Large displays

TAILWIND DEFAULTS:
  sm: 640px    md: 768px    lg: 1024px    xl: 1280px    2xl: 1536px
```

### 11.2 Responsive Strategy Matrix

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Bottom tabs | Side rail | Full sidebar |
| Layout | Single column | 2 columns | 3+ columns |
| Cards | Full width stack | 2-col grid | 3-4 col grid |
| Tables | Card layout | Scrollable table | Full table |
| Modals | Full screen sheet | Center dialog | Center dialog |
| Typography | Base scale | +1 step | +2 steps |
| Touch targets | 44px min | 44px min | 32px min |
| Spacing | 16px gutters | 24px gutters | 32px gutters |

### 11.3 Container Queries (Modern CSS)

```css
/* Size container based on parent, not viewport */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container card (max-width: 399px) {
  .card-content {
    display: flex;
    flex-direction: column;
  }
}
```

### 11.4 Responsive Images

```html
<!-- Art direction: different crops per breakpoint -->
<picture>
  <source media="(min-width: 1024px)" srcset="/hero-wide.webp" />
  <source media="(min-width: 768px)" srcset="/hero-medium.webp" />
  <img src="/hero-mobile.webp" alt="Hero" loading="lazy" />
</picture>

<!-- Resolution switching: same image, different sizes -->
<img
  srcset="/photo-400.webp 400w, /photo-800.webp 800w, /photo-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  src="/photo-800.webp"
  alt="Product"
  loading="lazy"
/>
```

---

## 12. Platform-Specific Patterns

### 12.1 iOS Design Conventions

```
NAVIGATION:        Large title → shrinks on scroll
BACK BUTTON:       "< Back" text (not just arrow)
MODALS:            Present as sheet (drag to dismiss)
ACTION SHEETS:     Bottom-anchored option lists
HAPTIC FEEDBACK:   Light/Medium/Heavy taps
SAFE AREA:         Notch + home indicator
STATUS BAR:        Light/dark content, transparent BG
TAB BAR:           Labels + filled/outline icons
CORNER RADIUS:     Continuous (squircle), not circular
COLORS:            System blue (#007AFF) as default tint
GESTURES:          Swipe-back from left edge
```

### 12.2 Android / Material Design Conventions

```
NAVIGATION:        Top app bar + optional bottom nav
BACK BUTTON:       System back (hardware/gesture)
MODALS:            Center dialogs or bottom sheets
FAB:               Floating Action Button (bottom-right)
RIPPLE EFFECT:     Touch feedback on all pressable elements
STATUS BAR:        Colored or transparent
CORNER RADIUS:     Rounded rectangles (not squircles)
COLORS:            Material You (dynamic color)
ELEVATION:         Shadows indicate hierarchy
GESTURES:          System gesture nav (pill/3-button)
```

### 12.3 React Native Platform Branching

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    ...Platform.select({
      ios: { borderBottomWidth: StyleSheet.hairlineWidth },
      android: { elevation: 4 },
    }),
  },
});

// File-based platform branching
// Component.ios.tsx  → iOS specific
// Component.android.tsx → Android specific
// Component.tsx → Fallback
```

### 12.4 Web PWA Patterns

```json
// manifest.json
{
  "name": "App Name",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#F97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```html
<!-- PWA meta tags -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#F97316" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-180.png" />
```

---

## 13. Accessibility (a11y)

### 13.1 The POUR Principles

```
PERCEIVABLE    → Can users perceive the content?
OPERABLE       → Can users operate the interface?
UNDERSTANDABLE → Can users understand the content?
ROBUST         → Does it work across technologies?
```

### 13.2 Essential a11y Checklist

```
KEYBOARD NAVIGATION
 [ ] All interactive elements are focusable (tabIndex)
 [ ] Focus order follows visual order
 [ ] Focus indicator is visible (never outline: none without alternative)
 [ ] Skip-to-content link exists
 [ ] Escape closes modals/dropdowns
 [ ] Arrow keys navigate within components (tabs, menus)

SCREEN READERS
 [ ] All images have alt text (or alt="" for decorative)
 [ ] Form inputs have associated labels
 [ ] Buttons have descriptive text (not just icons)
 [ ] ARIA roles on custom components
 [ ] Live regions for dynamic content (aria-live)
 [ ] Heading hierarchy is correct (h1 → h2 → h3)

VISUAL
 [ ] Color is never the ONLY indicator (add icon/text)
 [ ] Text contrast ≥ 4.5:1 (AA)
 [ ] UI component contrast ≥ 3:1
 [ ] Text resizable to 200% without breaking
 [ ] No content is conveyed only through color

MOTION
 [ ] Respect prefers-reduced-motion
 [ ] No auto-playing animations that can't be paused
 [ ] No flashing content (3 flashes/second max)
```

### 13.3 ARIA Patterns

```html
<!-- Button with icon only -->
<button aria-label="Close dialog">
  <svg><!-- X icon --></svg>
</button>

<!-- Loading state -->
<button aria-busy="true" aria-disabled="true">
  <Spinner /> Saving...
</button>

<!-- Tab panel -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1">Content 1</div>

<!-- Live region for dynamic updates -->
<div aria-live="polite" aria-atomic="true">
  {notification && <span>{notification}</span>}
</div>

<!-- Form error -->
<input aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" role="alert">Please enter a valid email</p>
```

### 13.4 React Native Accessibility

```typescript
<Pressable
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Add to cart"
  accessibilityHint="Adds this product to your shopping cart"
  accessibilityState={{ disabled: false }}
>
  <Text>Add to Cart</Text>
</Pressable>

// Screen reader announcements
import { AccessibilityInfo } from 'react-native';
AccessibilityInfo.announceForAccessibility('Item added to cart');

// Reduced motion
const prefersReducedMotion = useReducedMotion(); // from reanimated
const duration = prefersReducedMotion ? 0 : 300;
```

### 13.5 Reduced Motion

```css
/* Web */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```typescript
// Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

---

## 14. Performance & Optimization

### 14.1 Performance Budget

```
MOBILE TARGETS:
  First Contentful Paint (FCP):     < 1.8s
  Largest Contentful Paint (LCP):   < 2.5s
  First Input Delay (FID):         < 100ms
  Cumulative Layout Shift (CLS):   < 0.1
  Time to Interactive (TTI):       < 3.8s
  Total Bundle Size:               < 200KB (gzipped)
```

### 14.2 React Performance Patterns

```typescript
// 1. Memoize expensive components
const ExpensiveList = React.memo(({ items }) => (
  items.map(item => <ListItem key={item.id} {...item} />)
));

// 2. useCallback for event handlers passed to children
const handleClick = useCallback((id: string) => {
  setSelected(id);
}, []);

// 3. useMemo for expensive computations
const sortedItems = useMemo(() => 
  items.sort((a, b) => b.amount - a.amount),
  [items]
);

// 4. Lazy load routes
const Settings = lazy(() => import('./pages/Settings'));
<Suspense fallback={<LoadingScreen />}>
  <Settings />
</Suspense>

// 5. Virtualized lists for large datasets
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={1000} itemSize={60}>
  {({ index, style }) => <Row style={style} data={items[index]} />}
</FixedSizeList>
```

### 14.3 Image Optimization

```
FORMAT SELECTION:
  Photos     → WebP (90% quality) or AVIF
  Icons      → SVG (scalable, tiny)
  Logos      → SVG or PNG (transparency)
  Thumbnails → WebP (60% quality, blur placeholder)

SIZING RULES:
  Mobile:    max 400px wide (1x) / 800px (2x retina)
  Tablet:    max 800px wide (1x) / 1600px (2x)
  Desktop:   max 1200px wide
  
ALWAYS:
  ✅ Use loading="lazy" for below-fold images
  ✅ Set explicit width/height (prevents CLS)
  ✅ Use srcset for responsive images
  ✅ Compress before deployment
```

### 14.4 React Native Performance

```typescript
// 1. Use FlatList, never ScrollView + map for lists
<FlatList
  data={items}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <ItemCard {...item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={5}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>

// 2. Avoid inline styles (creates new objects each render)
// ❌ <View style={{ flex: 1, padding: 16 }}>
// ✅ <View style={styles.container}>

// 3. Use Hermes engine (enabled by default in modern RN)

// 4. Optimize images with react-native-fast-image
import FastImage from 'react-native-fast-image';
<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.cover}
  style={{ width: 200, height: 200 }}
/>
```

---

## 15. State Management for UI

### 15.1 State Categories

```
LOCAL STATE (useState)
  → Form inputs, toggles, dropdowns
  → Component-specific visibility
  → Temporary selections

SHARED UI STATE (Zustand / Context)
  → Active tab/screen
  → Theme (dark/light)
  → Sidebar open/closed
  → User preferences

SERVER STATE (React Query / SWR)
  → API data (products, users, orders)
  → Caching, revalidation
  → Optimistic updates
  → Pagination cursors

URL STATE (React Router)
  → Current page/route
  → Search filters
  → Sort order
  → Selected item ID
```

### 15.2 Zustand Pattern (Web + React Native)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // UI State
  activeTab: string;
  theme: 'light' | 'dark' | 'system';
  
  // Business State
  cart: CartItem[];
  
  // Actions
  setActiveTab: (tab: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      theme: 'system',
      cart: [],
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTheme: (theme) => set({ theme }),
      
      addToCart: (item) => set(state => {
        const existing = state.cart.find(i => i.id === item.id);
        if (existing) {
          return {
            cart: state.cart.map(i =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          };
        }
        return { cart: [...state.cart, { ...item, quantity: 1 }] };
      }),
      
      removeFromCart: (id) => set(state => ({
        cart: state.cart.filter(i => i.id !== id),
      })),
      
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ theme: state.theme }), // Only persist theme
    }
  )
);

// Usage with selectors (prevents unnecessary re-renders)
const activeTab = useAppStore(state => state.activeTab);
const cartCount = useAppStore(state => state.cart.length);
```

### 15.3 React Query Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch with caching
const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: () => fetch('/api/products').then(r => r.json()),
  staleTime: 5 * 60 * 1000, // 5 min cache
});

// Optimistic update
const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (product) => fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previous = queryClient.getQueryData(['products']);
      queryClient.setQueryData(['products'], (old) =>
        old.map(p => p.id === newProduct.id ? newProduct : p)
      );
      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['products'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

---

## 16. Dark Mode & Theming

### 16.1 Implementation Strategy

```css
/* CSS Variable approach — ALWAYS use this */
:root {
  --background: 0 0% 100%;       /* White */
  --foreground: 220 25% 10%;     /* Near black */
  --card: 0 0% 100%;
  --muted: 220 15% 93%;
  --border: 220 13% 91%;
}

.dark {
  --background: 220 20% 8%;      /* Dark navy */
  --foreground: 30 15% 95%;      /* Off white */
  --card: 220 20% 12%;
  --muted: 220 15% 18%;
  --border: 220 15% 20%;
}

/* Components NEVER reference light/dark directly */
.card { background: hsl(var(--card)); color: hsl(var(--card-foreground)); }
```

### 16.2 Dark Mode Color Rules

```
DO:
 ✅ Reduce saturation by 10-20% in dark mode
 ✅ Use dark gray (#1a1a2e) instead of pure black (#000)
 ✅ Use off-white (#f0ede8) instead of pure white (#fff)
 ✅ Reduce shadow opacity (they're barely visible on dark)
 ✅ Use surface elevation (lighter grays = higher elevation)
 ✅ Keep primary brand color recognizable

DON'T:
 ❌ Simply invert all colors
 ❌ Use pure black backgrounds (too harsh)
 ❌ Use pure white text (too bright, eye strain)
 ❌ Keep the same shadow values
 ❌ Forget to adjust image brightness/contrast
```

### 16.3 Theme Toggle Implementation

```typescript
// Web (with next-themes or custom)
const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="flex gap-2">
      {['light', 'dark', 'system'].map(t => (
        <button key={t} onClick={() => setTheme(t)}
          className={`px-3 py-1.5 rounded-lg text-sm
            ${theme === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🖥️'} {t}
        </button>
      ))}
    </div>
  );
};
```

```typescript
// React Native
import { useColorScheme } from 'react-native';

const useTheme = () => {
  const systemScheme = useColorScheme();
  const [userPreference, setUserPreference] = useState('system');
  
  const isDark = userPreference === 'system'
    ? systemScheme === 'dark'
    : userPreference === 'dark';

  const colors = isDark ? tokens.colors.dark : tokens.colors.light;
  
  return { isDark, colors, setTheme: setUserPreference };
};
```

---

## 17. Iconography & Visual Assets

### 17.1 Icon System Strategy

```
ICON LIBRARIES BY USE CASE:
  General UI:     Lucide React (recommended, tree-shakeable)
  Material:       @mui/icons-material
  iOS-style:      SF Symbols (native) / Phosphor Icons (web)
  Custom brand:   SVG sprite sheet or icon font

SIZING SCALE:
  12px (xs)  → Inline indicators, badges
  16px (sm)  → List items, compact UI
  20px (md)  → Standard buttons, nav items
  24px (lg)  → Primary actions, headers
  32px (xl)  → Feature cards, empty states
  48px (2xl) → Onboarding illustrations
```

### 17.2 Icon Usage Rules

```
✅ DO:
  - Use consistent stroke width (1.5px or 2px)
  - Match icon style (outline OR filled, not mixed)
  - Add aria-label on icon-only buttons
  - Use filled icons for active state, outline for inactive
  - Align icons to the 4px grid

❌ DON'T:
  - Mix icon libraries in the same project
  - Use icons without labels for primary actions
  - Use more than 2 icon sizes per component
  - Stretch or distort icons
  - Use colored icons in monochrome contexts
```

### 17.3 Illustration Strategy

```
WHEN TO USE ILLUSTRATIONS:
  - Empty states (no data, first time)
  - Onboarding screens
  - Error pages (404, 500)
  - Success/completion confirmations
  - Feature explanation

STYLE MATCHING:
  Minimal app    → Line illustrations
  Playful app    → Colorful, rounded illustrations
  Professional   → Subtle, geometric illustrations
  Brand-heavy    → Custom brand illustrations
```

---

## 18. Micro-Interactions & Feedback

### 18.1 Feedback Types

| User Action | Expected Feedback | Implementation |
|-------------|-------------------|---------------|
| Tap/click button | Visual press state | Scale 0.95 + color change |
| Submit form | Loading → Success/Error | Spinner → Check/X animation |
| Toggle switch | Smooth slide + color | Spring animation |
| Pull to refresh | Spinner appears at top | Custom pull indicator |
| Swipe to delete | Red reveal + confirm | Slide + action buttons |
| Add to cart | Badge count animate | Scale bounce on badge |
| Long press | Context menu | Haptic + overlay |
| Scroll past header | Header shrinks/hides | Transform on scroll |
| Error occurs | Toast/banner appears | Slide-in from top |

### 18.2 Toast / Notification Pattern

```typescript
// Usage
toast.success('Payment received! ₹5,000');
toast.error('Network error. Please retry.');
toast.warning('Low stock: Only 3 items left');
toast.info('New update available');

// Implementation approach
const Toast = ({ type, message, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className={cn(
      'flex items-center gap-3 p-4 rounded-xl shadow-lg',
      type === 'success' && 'bg-success text-success-foreground',
      type === 'error' && 'bg-destructive text-destructive-foreground',
      type === 'warning' && 'bg-warning text-warning-foreground',
      type === 'info' && 'bg-info text-info-foreground',
    )}
  >
    <Icon type={type} />
    <span className="text-sm font-medium">{message}</span>
    <button onClick={onDismiss} className="ml-auto">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);
```

### 18.3 Haptic Feedback (React Native)

```typescript
import * as Haptics from 'expo-haptics';

// Light tap: toggle, selection
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap: button press
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy tap: destructive action
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success: completed action
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error: failed action
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Selection: picker/list change
Haptics.selectionAsync();
```

---

## 19. Error Handling & Empty States

### 19.1 Error State Hierarchy

```
FIELD ERROR      → Inline below the input
FORM ERROR       → Banner at top of form
SECTION ERROR    → Replace section with error + retry
PAGE ERROR       → Full error page with actions
NETWORK ERROR    → Global banner (offline indicator)
FATAL ERROR      → Error boundary fallback
```

### 19.2 Error Boundary Pattern

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 19.3 Empty State Design

```
EVERY EMPTY STATE NEEDS:
1. Visual (illustration or icon)
2. Title (what's empty)
3. Description (why it's empty)
4. Action (what to do about it)
```

```typescript
const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 max-w-xs">{description}</p>
    {actionLabel && (
      <Button onClick={onAction}>
        <Plus className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
);

// Usage examples
<EmptyState
  icon={Package}
  title="No products yet"
  description="Add your first product to start selling"
  actionLabel="Add Product"
  onAction={() => openAddProduct()}
/>

<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your search or filters"
  actionLabel="Clear Filters"
  onAction={() => clearFilters()}
/>
```

### 19.4 Loading States

```
SKELETON SCREENS (preferred for known layouts)
┌─────────────────────┐
│ ████████  ██████    │  ← Animated shimmer
│ ████████████████    │
│ ██████████          │
├─────────────────────┤
│ ████████  ██████    │
│ ████████████████    │
└─────────────────────┘

SPINNER (for unknown content or actions)
  - Use for: button submissions, data saves
  - Don't use for: page loads, list renders

PROGRESS BAR (for known duration)
  - Use for: uploads, multi-step processes
  - Show percentage when possible

OPTIMISTIC UI (best UX)
  - Show result immediately
  - Revert on error
  - Use for: likes, toggles, cart adds
```

---

## 20. Onboarding & First-Time UX

### 20.1 Onboarding Patterns

```
PROGRESSIVE DISCLOSURE
  Show features as they become relevant
  Best for: Complex apps, SaaS tools

WALKTHROUGH / CAROUSEL
  3-5 screens highlighting key features
  Best for: Consumer apps, games

INTERACTIVE TUTORIAL
  Guide users through first real action
  Best for: Productivity apps, tools

EMPTY STATE ONBOARDING
  Guide within empty sections
  Best for: Content creation apps

CONTEXTUAL TOOLTIPS
  In-context tips on first visit
  Best for: Feature-rich dashboards
```

### 20.2 Onboarding Screen Structure

```
SCREEN STRUCTURE:
┌────────────────────────┐
│                        │
│     [Illustration]     │  ← 40% of screen
│                        │
│   Headline (Bold)      │  ← One clear benefit
│   Supporting text      │  ← 1-2 lines max
│   (subtle color)       │
│                        │
│   ● ○ ○ ○              │  ← Progress dots
│                        │
│   [Primary CTA]        │  ← Full width button
│   Skip                 │  ← Always provide escape
│                        │
└────────────────────────┘

RULES:
  - Max 4-5 screens
  - Always allow skipping
  - Show value, not features
  - End with clear action (Sign Up, Get Started)
  - Remember state (don't show again)
```

### 20.3 Permission Requests

```
PATTERN: Context → Explain → Request → Fallback

❌ BAD: Request permission immediately on app open
✅ GOOD: Wait until feature needs permission, explain why

EXAMPLE FLOW:
1. User taps "Share via WhatsApp"
2. Show: "BharatBill needs access to contacts to share invoices"
3. User approves → Show contact picker
4. User denies → Show manual phone input
```

---

## 21. Testing UI/UX

### 21.1 Visual Testing Checklist

```
PER COMPONENT:
  [ ] Renders in all variants
  [ ] Handles long text gracefully
  [ ] Works at minimum and maximum widths
  [ ] Dark mode appearance
  [ ] Loading/error/empty states
  [ ] Keyboard navigation works
  [ ] Screen reader announces correctly

PER PAGE:
  [ ] Mobile (375px) layout
  [ ] Tablet (768px) layout
  [ ] Desktop (1280px) layout
  [ ] Scroll behavior (fixed elements, sticky)
  [ ] All interactive elements reachable
  [ ] Navigation flow is logical
  [ ] Back/forward works correctly
```

### 21.2 Device Testing Matrix

```
MINIMUM TESTING:
  iOS:      iPhone SE (small), iPhone 15 (standard), iPad
  Android:  Small (360x640), Standard (412x915), Tablet
  Web:      Chrome (Win), Safari (Mac), Firefox

BREAKPOINT TESTING:
  320px  → Content doesn't overflow
  375px  → Primary mobile layout
  768px  → Tablet layout triggers
  1024px → Desktop layout triggers
  1440px → Max content width respected
```

### 21.3 Automated UI Testing

```typescript
// Component testing with Testing Library
import { render, screen, fireEvent } from '@testing-library/react';

test('button shows loading state', () => {
  render(<Button isLoading>Submit</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

// Visual regression with Playwright
test('home screen matches snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', {
    maxDiffPixels: 100,
  });
});

// Accessibility testing
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('form has no a11y violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 22. Design-to-Code Workflow

### 22.1 From Wireframe to Production

```
PHASE 1: STRUCTURE (HTML/JSX)
  → Build semantic structure without any styling
  → Get content hierarchy right
  → Ensure accessibility from the start

PHASE 2: LAYOUT (Flexbox/Grid)
  → Add container, spacing, alignment
  → Mobile layout first
  → No colors, no borders yet

PHASE 3: TYPOGRAPHY
  → Apply type scale
  → Set font weights and sizes
  → Adjust line heights

PHASE 4: COLOR & THEME
  → Apply design tokens
  → Background, text, borders
  → Interactive state colors

PHASE 5: REFINEMENT
  → Shadows, borders, radius
  → Animations, transitions
  → Micro-interactions

PHASE 6: RESPONSIVE
  → Test/adjust tablet layout
  → Test/adjust desktop layout
  → Verify all breakpoints

PHASE 7: POLISH
  → Loading/error/empty states
  → Edge cases (long text, no data)
  → Accessibility audit
  → Performance check
```

### 22.2 Design Specification Checklist

Before coding any component, define:

```
VISUAL SPEC:
  □ Dimensions (width, height, min/max)
  □ Spacing (padding, margin, gap)
  □ Colors (background, text, border, states)
  □ Typography (size, weight, family, line-height)
  □ Border (width, style, color, radius)
  □ Shadow (offset, blur, spread, color)

INTERACTION SPEC:
  □ Hover state
  □ Active/pressed state
  □ Focus state (keyboard)
  □ Disabled state
  □ Loading state
  □ Error state
  □ Animation (enter, exit, transition)

CONTENT SPEC:
  □ Minimum content
  □ Maximum content (overflow handling)
  □ Empty content
  □ Dynamic content (real-time updates)
```

### 22.3 Code Organization

```
src/
├── assets/              # Images, fonts, static files
├── components/
│   ├── ui/              # Design system primitives (Button, Input, Card)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   ├── layout/          # Layout components (Header, Footer, Sidebar)
│   ├── features/        # Feature-specific components
│   │   ├── auth/
│   │   ├── billing/
│   │   └── inventory/
│   └── shared/          # Shared compound components
├── hooks/               # Custom hooks
│   ├── use-mobile.ts
│   ├── use-debounce.ts
│   └── use-theme.ts
├── lib/
│   ├── utils.ts         # Utility functions (cn, formatCurrency)
│   ├── store.ts         # State management
│   ├── constants.ts     # App constants
│   └── validators.ts    # Form validation schemas
├── pages/               # Page/screen components
├── styles/
│   └── index.css        # Design tokens & global styles
└── types/               # TypeScript type definitions
```

---

## 23. Appendix: Cheat Sheets & Quick Reference

### 23.1 Touch Target Sizes

```
MINIMUM SIZES:
  Apple HIG:     44 × 44 pt
  Material:      48 × 48 dp
  WCAG AAA:      44 × 44 CSS px
  Recommended:   48 × 48 px (with 8px spacing between targets)
```

### 23.2 Z-Index Scale

```css
:root {
  --z-dropdown:    1000;
  --z-sticky:      1020;
  --z-fixed:       1030;
  --z-backdrop:    1040;
  --z-modal:       1050;
  --z-popover:     1060;
  --z-tooltip:     1070;
  --z-toast:       1080;
}
```

### 23.3 Common Tailwind Patterns

```html
<!-- Center anything -->
<div class="flex items-center justify-center">

<!-- Sticky header -->
<header class="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">

<!-- Truncate text -->
<p class="truncate">                    <!-- Single line -->
<p class="line-clamp-2">               <!-- Multi line -->

<!-- Aspect ratio container -->
<div class="aspect-square">            <!-- 1:1 -->
<div class="aspect-video">             <!-- 16:9 -->

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- Full-screen overlay -->
<div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">

<!-- Bottom safe area -->
<nav class="fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)]">

<!-- Gradient text -->
<span class="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">

<!-- Glass morphism -->
<div class="bg-background/60 backdrop-blur-xl border border-border/50 shadow-xl">
```

### 23.4 Keyboard Shortcuts Reference

```
IMPLEMENT IN DESKTOP APPS:
  Ctrl/Cmd + K     → Command palette / Search
  Ctrl/Cmd + N     → New item
  Ctrl/Cmd + S     → Save
  Ctrl/Cmd + Z     → Undo
  Ctrl/Cmd + /     → Toggle help
  Escape           → Close modal/cancel
  Tab              → Next field
  Shift + Tab      → Previous field
  Enter            → Submit/confirm
  Arrow keys       → Navigate lists
```

### 23.5 CSS Unit Reference

```
WHEN TO USE EACH UNIT:
  rem   → Font sizes, spacing, max-widths (scales with root)
  px    → Borders, shadows, fine details (fixed)
  em    → Component-relative sizing (relative to parent font)
  %     → Fluid widths, responsive layouts
  vw/vh → Full-screen elements, hero sections
  dvh   → Dynamic viewport height (mobile address bar aware)
  ch    → Input widths based on character count
  fr    → Grid track sizing

CONVERSIONS (base 16px):
  1rem = 16px    0.75rem = 12px    0.5rem = 8px
  1.5rem = 24px  2rem = 32px       3rem = 48px
```

### 23.6 Color Format Quick Reference

```
HEX:    #F97316           → Compact, web standard
RGB:    rgb(249, 115, 22) → Direct color values
HSL:    hsl(24, 90%, 50%) → Design-friendly, easy variants
OKLCH:  oklch(0.7 0.2 50) → Perceptually uniform (modern CSS)

CSS VARIABLE PATTERN (for Tailwind):
  Define:  --primary: 24 90% 50%;           (HSL values without hsl())
  Use:     background: hsl(var(--primary));
  Alpha:   background: hsl(var(--primary) / 0.5);
```

### 23.7 Performance Quick Wins

```
TOP 10 PERFORMANCE WINS:
1. Lazy load below-fold images (loading="lazy")
2. Use WebP/AVIF for images (30-50% smaller)
3. Code-split routes (React.lazy)
4. Memoize expensive renders (React.memo)
5. Debounce search/filter inputs (300ms)
6. Virtualize long lists (react-window/FlatList)
7. Use CSS transforms for animations (GPU accelerated)
8. Preload critical fonts
9. Minimize bundle size (tree-shake, analyze)
10. Use skeleton screens (perceived performance)
```

### 23.8 Design System Audit Questions

Run this audit on any app before shipping:

```
CONSISTENCY:
  □ Are all buttons the same height per size variant?
  □ Do all cards have the same border radius?
  □ Is spacing consistent (4/8px grid)?
  □ Are all icons from the same family and size?

HIERARCHY:
  □ Is there exactly one primary CTA per screen?
  □ Is the heading hierarchy correct (H1 → H2 → H3)?
  □ Do the most important elements have the most contrast?

USABILITY:
  □ Can you complete the primary flow in ≤3 taps?
  □ Are touch targets ≥44px?
  □ Does the app work with just a thumb (one-handed)?

ACCESSIBILITY:
  □ Can you navigate the entire app with keyboard?
  □ Do all colors pass WCAG AA contrast?
  □ Are all images described for screen readers?

RESILIENCE:
  □ How does every screen look with no data?
  □ What happens when the network drops?
  □ How does it handle 1,000+ items in a list?
```

---

## Final Notes

This guide is a **living document**. UI/UX is never "done" — it evolves with:
- User feedback and analytics
- Platform updates (iOS/Android releases)
- New CSS/JS capabilities
- Changing accessibility standards
- Emerging interaction patterns

**The best UI is invisible.** Users should accomplish their goals without thinking about the interface. Every design decision should reduce cognitive load, minimize taps, and create moments of delight.

---

*Generated as a universal reference. Applicable to any React, React Native, or web application project.*

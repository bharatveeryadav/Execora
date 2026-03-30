# Execora Mobile UI/UX Playbook

## 1) Design Foundation For This App

- Platform: React Native + Expo
- Styling: NativeWind className-first
- Visual identity: warm commerce tone with primary #e67e22
- Context: fast billing, inventory and collection workflows for shop operators

## 2) Tokens You Must Reuse

From apps/mobile/src/lib/constants.ts:

- COLORS.primary: #e67e22
- SIZES.TOUCH_MIN: 44
- SIZES.SPACING: xs 4, sm 8, md 12, lg 16, xl 24, xxl 32
- SIZES.RADIUS: sm 6, md 8, lg 12, xl 16

From apps/mobile/src/lib/typography.ts:

- title 18
- heading 16
- body 14
- label 12
- caption 11
- MAX_FONT_SIZE_MULTIPLIER 1.5

## 3) Screen Composition Pattern

Use this order for most data screens:

1. Top summary or title row
2. Search/filter controls
3. Primary list or content block
4. Contextual CTA (bottom anchored if critical)

Guidelines:

- Keep the first visible action reachable with one thumb.
- Prefer one dominant CTA per screen.
- Show filters as compact chips or segmented controls.

## 4) List And Data Density Rules

For FlatList-heavy screens:

- Memoize renderItem and keyExtractor with useCallback.
- Add pragmatic perf props:
  - initialNumToRender 10-15
  - maxToRenderPerBatch 8-12
  - windowSize 5-9
  - removeClippedSubviews true when safe
- Keep row height predictable to reduce layout thrash.

## 5) States (Required)

Every network-backed surface must define:

- Loading: Skeleton or light placeholders
- Empty: clear statement + next action CTA
- Error: concise message + retry

Preferred components:

- apps/mobile/src/components/ui/Skeleton.tsx
- apps/mobile/src/components/ui/EmptyState.tsx
- apps/mobile/src/components/ui/ErrorCard.tsx

## 6) Interaction Patterns

- Haptics for meaningful actions only (not every tap).
- Destructive actions require confirmation.
- Keep critical actions visually distinct from secondary actions.

Button hierarchy:

- Primary: main conversion action
- Outline/Ghost: secondary actions
- Danger: destructive actions only

## 7) Accessibility Baseline

- Tap target >= 44x44
- Label icon-only buttons with accessibilityLabel
- Ensure readable contrast for text and status chips
- Respect system font scaling limits via MAX_FONT_SIZE_MULTIPLIER

## 8) Navigation And Resilience

- Keep typed route params in apps/mobile/src/navigation/index.tsx aligned.
- Avoid route-name drift between navigate calls and stack definitions.
- Preserve ErrorBoundary wrappers at navigator/screen boundaries.

## 9) Implementation Checklist

- Reused tokens from constants and typography
- Reused existing ui primitives
- Added loading/empty/error states
- Added list memoization/perf where relevant
- Preserved navigation typing and behavior
- Confirmed visual consistency with existing screens

## 10) Anti-Patterns To Avoid

- Inline hardcoded colors across many screens
- Multiple competing primary CTAs on one view
- Dense walls of text without grouping
- Full-screen spinners for small fetches
- New custom components when existing primitives already fit

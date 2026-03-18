# Mobile App — Responsive Layout & Text Overflow

Per [React Native docs](https://reactnative.dev/docs/height-and-width) and [Text](https://reactnative.dev/docs/text#numberoflines).

## Text Overflow Fix

**Problem:** Long text overflows on small screens.

**Solution:**

1. **Parent container** — Add `minWidth: 0` (or `min-w-0` in NativeWind) to flex containers. Without it, flex children cannot shrink below content size.

2. **Text** — Use `numberOfLines` + `ellipsizeMode="tail"` + `flexShrink: 1`:

```tsx
<View style={{ flex: 1, minWidth: 0 }}>
  <Text numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }}>
    {longName}
  </Text>
</View>
```

NativeWind:
```tsx
<View className="flex-1 min-w-0">
  <Text className="flex-1 min-w-0 shrink" numberOfLines={1}>{longName}</Text>
</View>
```

3. **Row layouts** — For `flexDirection: "row"`, the text container must have `flex: 1` and `minWidth: 0` so it can shrink.

## Reusable Component

Use `TruncatableText` for consistent truncation:

```tsx
import { TruncatableText } from "../components/common/TruncatableText";

<View className="flex-1 min-w-0">
  <TruncatableText numberOfLines={1}>{item.name}</TruncatableText>
</View>
```

## Responsive Hooks

```tsx
import { useResponsive } from "../hooks/useResponsive";

const { width, contentPadding, cardPadding } = useResponsive();
```

## Checklist for New Screens

- [ ] Flex row with text: parent has `min-w-0`
- [ ] Long text: `numberOfLines` + `ellipsizeMode` or `TruncatableText`
- [ ] List/card rows: `minWidth: 0` on the flex container that holds text

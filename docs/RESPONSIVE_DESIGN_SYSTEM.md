/\*\*

- Central Responsive Design System — Implementation Guide
- =========================================================
-
- Problem:
- - Mobile screens use React Native breakpoints (360, 430, 768)
- - Web screens use Tailwind breakpoints (640, 768, 1024, 1280, 1536)
- - No consistent terminology across app
- - Hard to maintain responsive behavior as new sizes emerge
-
- Solution:
- - Single source of truth: @execora/shared/responsive-system.ts
- - Platform-specific adapters that consume it
- - Declarative page strategies (mobileOnly, mobileThenTablet, universalResponsive)
-
- ─────────────────────────────────────────────────────────────────────────────
-
- ## For Mobile (React Native / Expo)
-
- **Updated: apps/mobile/src/shared/hooks/useResponsive.ts**
-
- ```tsx

  ```
- import { BREAKPOINTS, getDeviceClass, LAYOUT, getResponsivePadding } from "@execora/shared/responsive-system";
- import { useWindowDimensions } from "react-native";
-
- export function useResponsive() {
- const { width, height } = useWindowDimensions();
- const deviceClass = getDeviceClass(width);
- const padding = getResponsivePadding(deviceClass);
-
- return {
-     width, height,
-     deviceClass, // Now available: "xs", "sm", "md", "lg", "tab", "desk", etc.
-     padding, // Automatically adapt based on device
-     isSmall: width < BREAKPOINTS.sm,
-     isTablet: width >= BREAKPOINTS.tab,
-     // ... existing properties
- };
- }
- ```

  ```
-
- **Usage in a Mobile Screen:**
-
- ```tsx

  ```
- import { useResponsive } from "@/shared/hooks/useResponsive";
- import { RESPONSIVE_STRATEGIES } from "@execora/shared/responsive-system";
-
- export function MyBillingScreen() {
- const { deviceClass, padding, gridColumns } = useResponsive();
-
- // Declare what this screen supports
- const strategy = RESPONSIVE_STRATEGIES.universalResponsive;
-
- return (
-     <View style={{ paddingHorizontal: padding }}>
-       {/* Grid that respects device class */}
-       <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
-         {invoices.map(inv => (
-           <View key={inv.id} style={{ width: `${100 / gridColumns}%` }}>
-             { {/* Card content */} }
-           </View>
-         ))}
-       </View>
-     </View>
- );
- }
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
-
- ## For Web (React / Tailwind / Vite)
-
- **Updated: apps/web/src/lib/responsive-system-web.ts**
-
- ```tsx

  ```
- import { BREAKPOINTS, getDeviceClass, GRID } from "@execora/shared/responsive-system";
- import { useEffect, useState } from "react";
-
- export function useResponsiveWeb() {
- const [deviceClass, setDeviceClass] = useState(() => getDeviceClass(window.innerWidth));
-
- useEffect(() => {
-     const handleResize = () => setDeviceClass(getDeviceClass(window.innerWidth));
-     window.addEventListener("resize", handleResize);
-     return () => window.removeEventListener("resize", handleResize);
- }, []);
-
- return {
-     deviceClass,
-     isMobile: window.innerWidth < BREAKPOINTS.tab,
-     isTablet: window.innerWidth >= BREAKPOINTS.tab && window.innerWidth < BREAKPOINTS.desk,
-     isDesktop: window.innerWidth >= BREAKPOINTS.desk,
-     gridColumns: GRID.columns[deviceClass],
- };
- }
- ```

  ```
-
- **Tailwind Config: apps/web/tailwind.config.ts**
-
- ```js

  ```
- import { BREAKPOINTS } from "@execora/shared/responsive-system";
-
- export default {
- theme: {
-     extend: {
-       // Align Tailwind breakpoints with universal breakpoints
-       screens: {
-         "xs": `${BREAKPOINTS.xs}px`,    // 320px
-         "xsm": `${BREAKPOINTS.sm}px`,   // 360px
-         "xmd": `${BREAKPOINTS.md}px`,   // 390px
-         "xlg": `${BREAKPOINTS.lg}px`,   // 430px
-         "tab": `${BREAKPOINTS.tab}px`,  // 768px
-         "desk": `${BREAKPOINTS.desk}px`, // 1024px
-         "wide": `${BREAKPOINTS.wide}px`, // 1280px
-         "cinema": `${BREAKPOINTS.cinema}px`, // 1920px
-       },
-     },
- },
- };
- ```

  ```
-
- **Usage in a Web Page:**
-
- ```tsx

  ```
- import { useResponsiveWeb } from "@/lib/responsive-system-web";
- import { RESPONSIVE_STRATEGIES } from "@execora/shared/responsive-system";
-
- export function BillingPage() {
- const { deviceClass, gridColumns } = useResponsiveWeb();
- const strategy = RESPONSIVE_STRATEGIES.universalResponsive;
-
- return (
-     <div className={`grid grid-cols-${gridColumns} gap-4 px-4 xlg:px-6 desk:px-8`}>
-       {invoices.map(inv => (
-         <InvoiceCard key={inv.id} invoice={inv} />
-       ))}
-     </div>
- );
- }
- ```

  ```
-
- Or using Tailwind directly:
-
- ```tsx

  ```
- <div className="
- grid
- grid-cols-1 // Mobile: 1 column
- xmd:grid-cols-2 // >= 390px: 2 columns
- tab:grid-cols-2 // >= 768px: 2 columns
- desk:grid-cols-3 // >= 1024px: 3 columns
- wide:grid-cols-4 // >= 1280px: 4 columns
- gap-4
- px-3 tab:px-4 desk:px-6
- ">
- {items.map(item => <Card key={item.id} {...item} />)}
- </div>
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
-
- ## Page Responsive Strategy Declaration
-
- **Define at the top of each screen/page:**
-
- ```tsx

  ```
- // apps/mobile/src/features/billing/screens/InvoiceListScreen.tsx
- import { RESPONSIVE_STRATEGIES } from "@execora/shared/responsive-system";
-
- // Declare this page's responsive behavior
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.universalResponsive;
-
- export default function InvoiceListScreen() {
- // Implementation...
- }
- ```

  ```
-
- **Documentation Bot can use this to validate:**
- ```tsx

  ```
- // Generate docs comment:
- // @responsive universal — supports mobile, tablet, desktop
- // @columns mobile: 1 | tablet: 2 | desktop: 3
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
-
- ## Migration Checklist
-
- ### Phase 1: Core System (Done) ✅
- - [x] Create responsive-system.ts in @execora/shared
- - [x] Export from packages/shared/src/index.ts
- - [ ] Update mobile useResponsive hook to use new enums/helpers
- - [ ] Update Tailwind config to use BREAKPOINTS
- - [ ] Create web useResponsiveWeb hook using system
-
- ### Phase 2: Mobile Migration (Current)
- - [ ] Update useResponsive.ts to import from shared
- - [ ] Update all screen imports to use new DeviceClass enum
- - [ ] Add RESPONSIVE_CONFIG to critical screens
- - [ ] Run mobile typecheck + lint
-
- ### Phase 3: Web Migration
- - [ ] Create responsive-system-web.ts adapter
- - [ ] Update Tailwind config with custom screens
- - [ ] Migrate one page (Dashboard or Invoices) as pilot
- - [ ] Use new Tailwind breakpoints in pilot page
- - [ ] Run web tests + Lighthouse
- - [ ] Migrate remaining pages batch by batch
-
- ### Phase 4: Validation & Docs
- - [ ] Create responsive design audit tool (scan files for strategy)
- - [ ] Generate page-by-page responsiveness report
- - [ ] Update SKILLS.md with new responsive patterns
- - [ ] Add E2E tests for each breakpoint category
- - [ ] Add visual regression tests (Playwright screenshots)
-
- ─────────────────────────────────────────────────────────────────────────────
-
- ## Benefits After Migration
-
- ✅ **Single Source of Truth**
- - One BREAKPOINTS definition used by both mobile + web
- - Changes propagate automatically
-
- ✅ **Consistent Terminology**
- - Both platforms use same DeviceClass enum (xs, sm, md, lg, tab, desk, etc.)
- - No more confusion between "medium", "md", "regular", etc.
-
- ✅ **Declarative Strategies**
- - Each page declares its responsive support upfront
- - Makes it obvious which screens are mobile-only vs. universal
-
- ✅ **Easy Maintenance**
- - Add new breakpoint? Update one place
- - Change grid columns? One place
- - All pages auto-adapt
-
- ✅ **Better Testing**
- - E2E tests can iterate over BREAKPOINTS
- - Responsive validation automated
-
- ─────────────────────────────────────────────────────────────────────────────
  \*/

export const RESPONSIVE_SYSTEM_GUIDE = "See this file for complete implementation guide";

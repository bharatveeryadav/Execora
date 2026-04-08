/\*\*

- RESPONSIVE DESIGN SYSTEM — IMPLEMENTATION GUIDE
- ═══════════════════════════════════════════════════════════════════════════════
-
- Problem Solved:
- Before: Mobile pages use `isSmall`, others use Tailwind, no consistency
- After: All pages use centralized DeviceClass enum + strategy declarations
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 1: Reference the System
- ─────────────────────────────────────────────────────────────────────────────
-
- Shared system: @execora/shared/responsive-system
- Mobile adapter: apps/mobile/src/shared/hooks/useResponsiveMobileAdapter.ts
- Web adapter: apps/web/src/lib/responsive-system-adapter.ts
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 2: Mobile Implementation Example
- ─────────────────────────────────────────────────────────────────────────────
-
- File: apps/mobile/src/features/billing/screens/InvoiceListScreen.tsx
-
- ```tsx

  ```
- import React from "react";
- import { View, ScrollView, FlatList } from "react-native";
- import { useResponsive } from "@/shared/hooks/useResponsive";
- import { RESPONSIVE_STRATEGIES, DeviceClass } from "@execora/shared/responsive-system";
- import InvoiceCard from "../components/InvoiceCard";
-
- // Declare what this screen supports
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.universalResponsive;
-
- export default function InvoiceListScreen() {
- const { deviceClass, contentWidth, padding, gridColumns } = useResponsive();
-
- const numColumns = gridColumns; // Automatically adapts: 1 (phone) → 2 (tablet) → 3 (desktop)
-
- return (
-     <ScrollView>
-       <View style={{ width: contentWidth, marginHorizontal: "auto", paddingHorizontal: padding }}>
-         {/* Responsive grid that changes columns based on device */}
-         <View
-           style={{
-             flexDirection: "row",
-             flexWrap: "wrap",
-             justifyContent: "space-between",
-             gap: 12,
-           }}
-         >
-           {invoices.map((invoice, idx) => (
-             <View
-               key={invoice.id}
-               style={{
-                 width: `${(100 - (numColumns - 1) * 3) / numColumns}%`, // Account for gap
-               }}
-             >
-               <InvoiceCard invoice={invoice} />
-             </View>
-           ))}
-         </View>
-       </View>
-     </ScrollView>
- );
- }
- ```

  ```
-
- **Key Benefits:**
- ✅ No hardcoded pixel sizes
- ✅ Automatically adapts to new breakpoints
- ✅ Single `RESPONSIVE_CONFIG` declaration (auditable)
- ✅ Uses shared DeviceClass enum everywhere
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 3: Web Implementation Example
- ─────────────────────────────────────────────────────────────────────────────
-
- File: apps/web/src/pages/billing/InvoiceList.tsx
-
- **Option A: Using Tailwind Classes**
-
- ```tsx

  ```
- import React from "react";
- import { RESPONSIVE_STRATEGIES } from "@execora/shared/responsive-system";
- import InvoiceCard from "@/components/billing/InvoiceCard";
-
- // Declare what this page supports
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.universalResponsive;
-
- export default function InvoiceListPage() {
- return (
-     <div className="
-       grid
-       grid-cols-1        // Mobile: 1 column
-       xmd:grid-cols-2    // >= 390px: 2 columns
-       tab:grid-cols-2    // >= 768px: 2 columns
-       desk:grid-cols-3   // >= 1024px: 3 columns
-       wide:grid-cols-4   // >= 1280px: 4 columns
-       gap-4
-       px-3 xsm:px-4 xmd:px-4 xlg:px-5 tab:px-6 desk:px-8
-       mx-auto
-       max-w-screen-wide
-     ">
-       {invoices.map(invoice => (
-         <InvoiceCard key={invoice.id} invoice={invoice} />
-       ))}
-     </div>
- );
- }
- ```

  ```
-
- **Option B: Using useResponsiveWeb Hook**
-
- ```tsx

  ```
- import React from "react";
- import { useResponsiveWeb } from "@/lib/responsive-system-adapter";
-
- export default function InvoiceListPage() {
- const { deviceClass, gridColumns, isMobile, isTablet, isDesktop } = useResponsiveWeb();
-
- return (
-     <div style={{ maxWidth: `${1200}px`, marginInline: "auto", padding: `0 ${isMobile ? 12 : 24}px` }}>
-       <div
-         style={{
-           display: "grid",
-           gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
-           gap: "1rem",
-         }}
-       >
-         {invoices.map(invoice => (
-           <InvoiceCard key={invoice.id} invoice={invoice} />
-         ))}
-       </div>
-     </div>
- );
- }
- ```

  ```
-
- **Option C: Tailwind Config + Media Queries**
-
- File: apps/web/tailwind.config.ts
-
- ```ts

  ```
- import { BREAKPOINTS } from "@execora/shared/responsive-system";
-
- export default {
- theme: {
-     extend: {
-       screens: {
-         xs: `${BREAKPOINTS.xs}px`,
-         xsm: `${BREAKPOINTS.sm}px`,
-         xmd: `${BREAKPOINTS.md}px`,
-         xlg: `${BREAKPOINTS.lg}px`,
-         tab: `${BREAKPOINTS.tab}px`,
-         desk: `${BREAKPOINTS.desk}px`,
-         wide: `${BREAKPOINTS.wide}px`,
-         cinema: `${BREAKPOINTS.cinema}px`,
-       },
-     },
- },
- };
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 4: Declare Responsive Strategy on Every Page/Screen
- ─────────────────────────────────────────────────────────────────────────────
-
- At the TOP of your screen/page file:
-
- ```tsx

  ```
- import { RESPONSIVE_STRATEGIES } from "@execora/shared/responsive-system";
-
- // Choose the strategy that matches your page/screen
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.universalResponsive;
- // or
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.mobileOnly;
- // or
- export const RESPONSIVE_CONFIG = RESPONSIVE_STRATEGIES.mobileThenTablet;
- ```

  ```
-
- This makes it **auditable** — tools can scan all files to generate a report:
- ✓ Mobile-only screens: 12
- ✓ Responsive screens: 34
- ✓ Desktop-only screens: 2
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 5: Build an Audit Tool (Optional, But Recommended)
- ─────────────────────────────────────────────────────────────────────────────
-
- Script: scripts/audit-responsive-design.ts
-
- ```ts

  ```
- import { glob } from "glob";
- import { readFileSync } from "fs";
-
- const screens = await glob("apps/_/src/\*\*/_{Screen,Page}.tsx");
- const strategies = {
- universalResponsive: [],
- mobileThenTablet: [],
- mobileOnly: [],
- "No strategy": [],
- };
-
- for (const file of screens) {
- const content = readFileSync(file, "utf-8");
- if (content.includes("universalResponsive")) strategies.universalResponsive.push(file);
- else if (content.includes("mobileThenTablet")) strategies.mobileThenTablet.push(file);
- else if (content.includes("mobileOnly")) strategies.mobileOnly.push(file);
- else strategies["No strategy"].push(file);
- }
-
- console.log("📱 RESPONSIVE DESIGN AUDIT");
- console.log(JSON.stringify(strategies, null, 2));
- ```

  ```
-
- Run: `pnpm node scripts/audit-responsive-design.ts`
-
- Output:
- ```

  ```
- 📱 RESPONSIVE DESIGN AUDIT
- {
- "universalResponsive": [
-     "apps/mobile/src/features/billing/screens/InvoiceListScreen.tsx",
-     "apps/web/src/pages/billing/InvoiceList.tsx"
- ],
- "mobileThenTablet": [...],
- "mobileOnly": [...],
- "No strategy": [ // ⚠️ These need attention
-     "apps/mobile/src/features/legacy/OldScreen.tsx"
- ]
- }
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
- STEP 6: Common Patterns & Examples
- ─────────────────────────────────────────────────────────────────────────────
-
- **Responsive Grid (Mobile + Web)**
-
- Mobile:
- ```tsx

  ```
- const { gridColumns } = useResponsive();
- <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
- {items.map(item => (
-     <View key={item.id} style={{ width: `${100 / gridColumns}%` }}>
-       <Item {...item} />
-     </View>
- ))}
- </View>
- ```

  ```
-
- Web:
- ```tsx

  ```
- <div className={`grid grid-cols-1 tab:grid-cols-2 desk:grid-cols-3 gap-4`}>
- {items.map(item => <Item key={item.id} {...item} />)}
- </div>
- ```

  ```
-
- **Responsive Typography**
-
- Mobile:
- ```tsx

  ```
- import { TYPOGRAPHY } from "@execora/shared/responsive-system";
- const { typographyScale } = useResponsive();
-
- <Text style={{ fontSize: TYPOGRAPHY.fontSize.base * typographyScale }}>
- Heading
- </Text>
- ```

  ```
-
- Web:
- ```tsx

  ```
- <h1 className="text-2xl md:text-3xl lg:text-4xl">Heading</h1>
- ```

  ```
-
- **Conditional Rendering**
-
- Mobile:
- ```tsx

  ```
- const { isTablet } = useResponsive();
- {isTablet && <DetailsSidebar />}
- ```

  ```
-
- Web:
- ```tsx

  ```
- <aside className="hidden desk:block">
- <DetailsSidebar />
- </aside>
- ```

  ```
-
- ─────────────────────────────────────────────────────────────────────────────
- BENEFITS AFTER FULL IMPLEMENTATION
- ─────────────────────────────────────────────────────────────────────────────
-
- ✅ **Single Source of Truth**
- One BREAKPOINTS location; changes auto-propagate
-
- ✅ **Consistent DeviceClass Enum**
- xs, sm, md, lg, tab, desk, wide, cinema — used everywhere
-
- ✅ **Declarative Strategies**
- Each page/screen declares its support upfront
- Auditable, maintainable, easy to understand
-
- ✅ **Platform-Agnostic**
- Mobile and web share same logic, no duplication
-
- ✅ **Scalable**
- Add new breakpoint? One place. All pages adapt.
-
- ✅ **Testable**
- E2E tests iterate over BREAKPOINTS automatically
- Responsive validation can be scripted
-
- ✅ **Better Docs**
- Audit tool generates responsive design report
- Team knows what works on what device immediately
-
- ─────────────────────────────────────────────────────────────────────────────
  \*/

export const IMPLEMENTATION_GUIDE = "See this file";

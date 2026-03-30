/**
 * ItemsScreen — Mobile product catalog & inventory management.
 *
 * PRD F-03: Inventory & Stock Management
 *
 * What competitors do                  | What we do better
 * ─────────────────────────────────────|──────────────────────────────────────
 * Vyapar: catalog list, requires       | One-tap ➕/➖ stock adjustment inline
 *         drill-in to adjust stock     | No extra screens needed
 * myBillBook: basic list, no alerts    | Color-coded stock badges (live)
 * Khatabook: no inventory at all       | Low-stock alert banner at top
 * Tally: complex item master           | Simple kirana-friendly card UI
 * All: manual refresh required         | React Query auto-refresh on focus
 */
import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
type Props = NativeStackScreenProps<import("../navigation").ItemsStackParams, "ItemsList">;
export declare function ItemsScreen({ navigation }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=ItemsScreen.d.ts.map
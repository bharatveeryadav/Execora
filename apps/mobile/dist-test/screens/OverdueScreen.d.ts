/**
 * OverdueScreen — Customers with unpaid balance (udhaar list).
 *
 * Daily use-case: shopkeeper opens this at the start/end of day to see
 * who owes money and tap to WhatsApp / record payment directly.
 *
 * API: GET /api/v1/customers/overdue
 * Returns: { customers: Array<{ id, name, balance, phone?, landmark? }> }
 */
import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
type Props = NativeStackScreenProps<import("../navigation").InvoicesStackParams, "Overdue">;
export declare function OverdueScreen({ navigation }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=OverdueScreen.d.ts.map
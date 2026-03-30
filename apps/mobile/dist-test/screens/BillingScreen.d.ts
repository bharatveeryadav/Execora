/**
 * BillingScreen — React Native port of ClassicBilling.tsx
 *
 * Key differences from web:
 *  • View / Text / TextInput instead of div / span / input
 *  • Switch from react-native (not shadcn)
 *  • FlatList for product suggestions (virtualized, performant on Android)
 *  • KeyboardAvoidingView so sticky footer stays above soft keyboard
 *  • MMKV for draft storage (synchronous, fast)
 *  • Linking.openURL for WhatsApp (instead of <a href>)
 *  • All shared business logic from @execora/shared (zero duplication)
 */
import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BillingStackParams } from "../navigation";
type BillingProps = NativeStackScreenProps<BillingStackParams, "BillingForm">;
export declare function BillingScreen({ navigation, route }: BillingProps): React.JSX.Element;
export {};
//# sourceMappingURL=BillingScreen.d.ts.map
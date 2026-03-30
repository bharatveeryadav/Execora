/**
 * Public invoice portal — no auth required (Sprint 16).
 * URL: execora://pub/invoice/:id/:token
 * Fetches from GET /pub/invoice/:id/:token
 */
import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
export type PubInvoiceParams = {
    id: string;
    token: string;
};
type Props = NativeStackScreenProps<import("../navigation").RootStackParams, "PubInvoice">;
export declare function PubInvoiceScreen({ navigation, route }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PubInvoiceScreen.d.ts.map
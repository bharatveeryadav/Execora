/**
 * DocumentSettingsScreen — Invoice/document customization (per reference UI).
 * Sections: Invoice Templates, PREFERENCES, APPEARANCE, LAYOUT, HEADER & FOOTER.
 */
import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
export interface DocumentSettings {
    themeColor: string;
    language: string;
    fontSize: "small" | "normal" | "large";
    fontStyle: string;
    pdfOrientation: "portrait" | "landscape";
    priceDecimals: number;
    invoicePrefix: string;
    invoiceSuffix: string;
    showItemHsn: boolean;
    showCustomerAddress: boolean;
    showPaymentMode: boolean;
}
type Props = NativeStackScreenProps<import("../navigation").MoreStackParams, "DocumentSettings">;
export declare function DocumentSettingsScreen({ navigation }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=DocumentSettingsScreen.d.ts.map
/**
 * ProductPickerModal — Modal for browsing/searching product catalog
 * Used in BillingScreen to add items to invoice
 */
import React from "react";
import { type Product } from "@execora/shared";
export interface ProductPickerModalProps {
    visible: boolean;
    onClose: () => void;
    catalog: Product[];
    getEffectivePrice: (p: Product & {
        wholesalePrice?: number | string | null;
        priceTier2?: number | string | null;
        priceTier3?: number | string | null;
    }) => number;
    onSelect: (p: Product) => void;
}
export declare function ProductPickerModal({ visible, onClose, catalog, getEffectivePrice, onSelect, }: ProductPickerModalProps): React.JSX.Element | null;
//# sourceMappingURL=ProductPickerModal.d.ts.map
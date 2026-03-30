/**
 * MobileItemRow — Compact invoice item row with inline editing
 * Supports product search, barcode scanning, and compact/expanded states
 */
import React from "react";
import { type BillingItem, type Product } from "@execora/shared";
export interface MobileItemRowProps {
    item: BillingItem;
    catalog: Product[];
    isFirst: boolean;
    getEffectivePrice: (p: Product & {
        wholesalePrice?: number | string | null;
        priceTier2?: number | string | null;
        priceTier3?: number | string | null;
    }) => number;
    onUpdate: (patch: Partial<BillingItem>) => void;
    onRemove: () => void;
}
export declare function MobileItemRow({ item, catalog, isFirst, getEffectivePrice, onUpdate, onRemove, }: MobileItemRowProps): React.JSX.Element;
//# sourceMappingURL=MobileItemRow.d.ts.map
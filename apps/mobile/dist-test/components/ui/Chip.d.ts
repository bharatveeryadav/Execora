/**
 * Chip — selectable filter chip (Sprint 2).
 */
import React from "react";
export interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    className?: string;
}
export declare function Chip({ label, selected, onPress, className }: ChipProps): React.JSX.Element;
//# sourceMappingURL=Chip.d.ts.map
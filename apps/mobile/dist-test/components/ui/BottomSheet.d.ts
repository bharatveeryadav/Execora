/**
 * BottomSheet — slide-up modal (Sprint 2).
 */
import React from "react";
export interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}
export declare function BottomSheet({ visible, onClose, title, children }: BottomSheetProps): React.JSX.Element;
//# sourceMappingURL=BottomSheet.d.ts.map
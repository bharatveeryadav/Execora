/**
 * Card — design system component (Sprint 2).
 */
import React from "react";
import { ViewProps } from "react-native";
export declare function Card({ children, className, ...props }: ViewProps & {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function PressableCard({ children, onPress, className, ...props }: ViewProps & {
    children: React.ReactNode;
    onPress?: () => void;
}): React.JSX.Element;
//# sourceMappingURL=Card.d.ts.map
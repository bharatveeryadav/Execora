/**
 * Input — design system component (Sprint 2).
 */
import React from "react";
import { TextInputProps } from "react-native";
export interface InputProps extends Omit<TextInputProps, "style"> {
    label?: string;
    error?: string;
    hint?: string;
    className?: string;
    containerClassName?: string;
}
export declare function Input({ label, error, hint, className, containerClassName, ...props }: InputProps): React.JSX.Element;
//# sourceMappingURL=Input.d.ts.map
import { type AlertButton, type AlertOptions } from "react-native";
type MaybeError = unknown;
export declare function showSuccess(message: string, title?: string): void;
export declare function showAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void;
export declare function showInfo(message: string, title?: string): void;
export declare function showError(message: string, title?: string): void;
export declare function showErrorFromUnknown(error: MaybeError, fallback?: string, title?: string): void;
export {};
//# sourceMappingURL=alerts.d.ts.map
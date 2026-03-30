/**
 * Offline status + sync context (Sprint 18).
 */
import React from "react";
type OfflineContextValue = {
    isOffline: boolean;
    pendingCount: number;
    isSyncing: boolean;
};
export declare function OfflineProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useOffline(): OfflineContextValue;
export {};
//# sourceMappingURL=OfflineContext.d.ts.map
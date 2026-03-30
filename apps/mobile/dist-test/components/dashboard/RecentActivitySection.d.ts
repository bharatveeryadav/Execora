import React from "react";
type Props = {
    recentActivityHidden: boolean;
    compactQuickActionsHeader: boolean;
    secsAgo: number;
    todayInvoices: any[];
    onToggleHidden: () => void;
    onRefresh: () => void;
    onInvoicePress: (id: string) => void;
};
export declare function RecentActivitySection({ recentActivityHidden, compactQuickActionsHeader, secsAgo, todayInvoices, onToggleHidden, onRefresh, onInvoicePress, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=RecentActivitySection.d.ts.map
import React from "react";
export type RootStackParams = {
    Auth: undefined;
    Main: undefined;
    PubInvoice: {
        id: string;
        token: string;
    };
};
export type AuthStackParams = {
    Login: undefined;
};
export type MainTabParams = {
    Dashboard: undefined;
    ItemsTab: undefined;
    CustomersTab: undefined;
    InvoicesTab: undefined;
    MoreTab: undefined;
};
export type ItemsStackParams = {
    ItemsList: undefined;
    ProductDetail: {
        id: string;
        product?: Record<string, unknown>;
    };
    UpdateProduct: {
        id: string;
        product?: Record<string, unknown>;
    };
    ItemsMenu: undefined;
};
export type MoreStackParams = {
    More: undefined;
    Billing: undefined;
    Items: undefined;
    CompanyProfile: undefined;
    SettingsThermal: undefined;
    Reports: undefined;
    DayBook: undefined;
    CashBook: undefined;
    Expenses: undefined;
    Recurring: undefined;
    Purchases: undefined;
    Monitoring: undefined;
    Settings: undefined;
    DocumentSettings: undefined;
    DocumentTemplates: undefined;
    ComingSoon: {
        title?: string;
        emoji?: string;
    };
    Feedback: undefined;
    Expiry: undefined;
    BalanceSheet: undefined;
    BankRecon: undefined;
    Gstr: undefined;
    CreditNotes: undefined;
    PurchaseOrders: undefined;
    SalesOrders: {
        title?: string;
    };
    PurchasePaymentOut: {
        title?: string;
    };
    PurchaseReturn: {
        title?: string;
    };
    Import: {
        title?: string;
        type?: "customers" | "vendors";
    };
    EInvoicing: {
        title?: string;
    };
    IndirectIncome: undefined;
    DebitOrders: {
        title?: string;
    };
    DeliveryChallans: {
        title?: string;
    };
    PackagingLists: {
        title?: string;
    };
    Journals: {
        title?: string;
    };
    OnlineStore: {
        title?: string;
    };
    Addons: {
        title?: string;
    };
    MyDrive: {
        title?: string;
    };
    Tutorial: {
        title?: string;
    };
};
export type BillingStackParams = {
    BillingForm: {
        startAsWalkIn?: boolean;
    } | undefined;
    InvoiceDetail: {
        id: string;
    };
};
export type InvoicesStackParams = {
    InvoiceList: undefined;
    InvoiceDetail: {
        id: string;
    };
    BillsMenu: undefined;
    Expenses: undefined;
    Reports: undefined;
    Purchases: undefined;
    EInvoicing: {
        title?: string;
    };
    Payment: {
        customerId?: string;
    };
    CreditNotes: undefined;
    ComingSoon: {
        title?: string;
        emoji?: string;
    };
    Overdue: undefined;
};
export type CustomersStackParams = {
    CustomerList: undefined;
    CustomerDetail: {
        id: string;
    };
    Payment: {
        customerId?: string;
    };
    Overdue: undefined;
};
export declare function RootNavigator(): React.JSX.Element;
//# sourceMappingURL=index.d.ts.map
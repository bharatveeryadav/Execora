"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootNavigator = RootNavigator;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const native_stack_1 = require("@react-navigation/native-stack");
const AuthContext_1 = require("../contexts/AuthContext");
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const DashboardScreen_1 = require("../screens/DashboardScreen");
const BillingScreen_1 = require("../screens/BillingScreen");
const PartiesScreen_1 = require("../screens/PartiesScreen");
const InvoiceListScreen_1 = require("../screens/InvoiceListScreen");
const BillsMenuScreen_1 = require("../screens/BillsMenuScreen");
const LoginScreen_1 = require("../screens/LoginScreen");
const InvoiceDetailScreen_1 = require("../screens/InvoiceDetailScreen");
const CustomerDetailScreen_1 = require("../screens/CustomerDetailScreen");
const PaymentScreen_1 = require("../screens/PaymentScreen");
const OverdueScreen_1 = require("../screens/OverdueScreen");
const ItemsScreen_1 = require("../screens/ItemsScreen");
const ItemsMenuScreen_1 = require("../screens/ItemsMenuScreen");
const ProductDetailScreen_1 = require("../screens/ProductDetailScreen");
const UpdateProductScreen_1 = require("../screens/UpdateProductScreen");
const MoreScreen_1 = require("../screens/MoreScreen");
const ExpensesScreen_1 = require("../screens/ExpensesScreen");
const CashBookScreen_1 = require("../screens/CashBookScreen");
const DayBookScreen_1 = require("../screens/DayBookScreen");
const ReportsScreen_1 = require("../screens/ReportsScreen");
const PurchasesScreen_1 = require("../screens/PurchasesScreen");
const RecurringScreen_1 = require("../screens/RecurringScreen");
const MonitoringScreen_1 = require("../screens/MonitoringScreen");
const SettingsScreen_1 = require("../screens/SettingsScreen");
const ComingSoonScreen_1 = require("../screens/ComingSoonScreen");
const ImportScreen_1 = require("../screens/ImportScreen");
const FeedbackScreen_1 = require("../screens/FeedbackScreen");
const PubInvoiceScreen_1 = require("../screens/PubInvoiceScreen");
const SettingsThermalScreen_1 = require("../screens/SettingsThermalScreen");
const ExpiryScreen_1 = require("../screens/ExpiryScreen");
const BalanceSheetScreen_1 = require("../screens/BalanceSheetScreen");
const BankReconScreen_1 = require("../screens/BankReconScreen");
const GstrScreen_1 = require("../screens/GstrScreen");
const CreditNotesScreen_1 = require("../screens/CreditNotesScreen");
const PurchaseOrdersScreen_1 = require("../screens/PurchaseOrdersScreen");
const IndirectIncomeScreen_1 = require("../screens/IndirectIncomeScreen");
const CompanyProfileScreen_1 = require("../screens/CompanyProfileScreen");
const DocumentSettingsScreen_1 = require("../screens/DocumentSettingsScreen");
const DocumentTemplatesScreen_1 = require("../screens/DocumentTemplatesScreen");
// ── Navigators ────────────────────────────────────────────────────────────────
const Root = (0, native_stack_1.createNativeStackNavigator)();
const Auth = (0, native_stack_1.createNativeStackNavigator)();
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
const BillingStack = (0, native_stack_1.createNativeStackNavigator)();
const InvoicesStack = (0, native_stack_1.createNativeStackNavigator)();
const CustomersStack = (0, native_stack_1.createNativeStackNavigator)();
const ItemsStack = (0, native_stack_1.createNativeStackNavigator)();
const MoreStack = (0, native_stack_1.createNativeStackNavigator)();
// ── Auth stack ────────────────────────────────────────────────────────────────
function AuthNavigator({ onLogin }) {
    return (react_1.default.createElement(Auth.Navigator, { screenOptions: { headerShown: false } },
        react_1.default.createElement(Auth.Screen, { name: "Login" }, (props) => react_1.default.createElement(LoginScreen_1.LoginScreen, { ...props, onLogin: onLogin }))));
}
// ── Billing stack (Billing form → Invoice detail) ─────────────────────────────
function BillingNavigator() {
    return (react_1.default.createElement(BillingStack.Navigator, { screenOptions: {
            headerStyle: { backgroundColor: "#fff" },
            headerShadowVisible: true,
            headerTintColor: "#0f172a",
            headerTitleStyle: { fontWeight: "700" },
        } },
        react_1.default.createElement(BillingStack.Screen, { name: "BillingForm", component: BillingScreen_1.BillingScreen, options: { title: "New Invoice" } }),
        react_1.default.createElement(BillingStack.Screen, { name: "InvoiceDetail", component: InvoiceDetailScreen_1.InvoiceDetailScreen, options: { headerShown: false } })));
}
// ── Invoices stack ─────────────────────────────────────────────────────────────
function InvoicesNavigator() {
    return (react_1.default.createElement(InvoicesStack.Navigator, { screenOptions: {
            headerShown: false,
            headerStyle: { backgroundColor: "#fff" },
            headerShadowVisible: true,
            headerTintColor: "#0f172a",
            headerTitleStyle: { fontWeight: "700" },
        } },
        react_1.default.createElement(InvoicesStack.Screen, { name: "InvoiceList", component: InvoiceListScreen_1.InvoiceListScreen }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "InvoiceDetail", component: InvoiceDetailScreen_1.InvoiceDetailScreen }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "BillsMenu", component: BillsMenuScreen_1.BillsMenuScreen, options: { headerShown: true, title: "More", headerBackTitle: "Bills" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "Expenses", component: ExpensesScreen_1.ExpensesScreen, options: { headerShown: true, title: "Expenses" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "Reports", component: ReportsScreen_1.ReportsScreen, options: { headerShown: true, title: "Reports" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "Purchases", component: PurchasesScreen_1.PurchasesScreen, options: { headerShown: true, title: "Purchases" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "EInvoicing", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "E-Invoicing / IRN" }, options: { headerShown: true, title: "E-Way Bills" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "Payment", component: PaymentScreen_1.PaymentScreen, options: { headerShown: true, title: "Payments" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "CreditNotes", component: CreditNotesScreen_1.CreditNotesScreen, options: { headerShown: true, title: "Credit Notes" } }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "ComingSoon", component: ComingSoonScreen_1.ComingSoonScreen, options: ({ route }) => ({
                headerShown: true,
                title: route.params?.title ?? "Coming Soon",
            }) }),
        react_1.default.createElement(InvoicesStack.Screen, { name: "Overdue", component: OverdueScreen_1.OverdueScreen, options: { headerShown: true, title: "Overdue / Udhaar" } })));
}
// ── Customers stack ────────────────────────────────────────────────────────────
function CustomersNavigator() {
    return (react_1.default.createElement(CustomersStack.Navigator, { screenOptions: {
            headerShown: false,
        } },
        react_1.default.createElement(CustomersStack.Screen, { name: "CustomerList", component: PartiesScreen_1.PartiesScreen }),
        react_1.default.createElement(CustomersStack.Screen, { name: "CustomerDetail", component: CustomerDetailScreen_1.CustomerDetailScreen }),
        react_1.default.createElement(CustomersStack.Screen, { name: "Payment", component: PaymentScreen_1.PaymentScreen }),
        react_1.default.createElement(CustomersStack.Screen, { name: "Overdue", component: OverdueScreen_1.OverdueScreen, options: { headerShown: true, title: "Overdue / Udhaar" } })));
}
// ── Items stack (Items list + Product detail) ───────────────────────────────────
function ItemsNavigator() {
    return (react_1.default.createElement(ItemsStack.Navigator, { screenOptions: {
            headerShown: false,
        } },
        react_1.default.createElement(ItemsStack.Screen, { name: "ItemsList", component: ItemsScreen_1.ItemsScreen }),
        react_1.default.createElement(ItemsStack.Screen, { name: "ProductDetail", component: ProductDetailScreen_1.ProductDetailScreen }),
        react_1.default.createElement(ItemsStack.Screen, { name: "UpdateProduct", component: UpdateProductScreen_1.UpdateProductScreen }),
        react_1.default.createElement(ItemsStack.Screen, { name: "ItemsMenu", component: ItemsMenuScreen_1.ItemsMenuScreen, options: { headerShown: true, title: "More", headerBackTitle: "Items" } })));
}
// ── More stack ────────────────────────────────────────────────────────────────
function MoreNavigator() {
    return (react_1.default.createElement(MoreStack.Navigator, { screenOptions: {
            headerStyle: { backgroundColor: "#fff" },
            headerShadowVisible: true,
            headerTintColor: "#0f172a",
            headerTitleStyle: { fontWeight: "700" },
        } },
        react_1.default.createElement(MoreStack.Screen, { name: "More", component: MoreScreen_1.MoreScreen, options: { headerShown: false } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Billing", component: BillingNavigator, options: { headerShown: false } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Items", component: ItemsNavigator, options: { headerShown: false } }),
        react_1.default.createElement(MoreStack.Screen, { name: "CompanyProfile", component: CompanyProfileScreen_1.CompanyProfileScreen, options: { headerShown: false } }),
        react_1.default.createElement(MoreStack.Screen, { name: "SettingsThermal", component: SettingsThermalScreen_1.SettingsThermalScreen, options: { headerShown: false } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Reports", component: ReportsScreen_1.ReportsScreen, options: { title: "Reports" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "DayBook", component: DayBookScreen_1.DayBookScreen, options: { title: "Day Book" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "CashBook", component: CashBookScreen_1.CashBookScreen, options: { title: "Cash Book" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Expenses", component: ExpensesScreen_1.ExpensesScreen, options: { title: "Expenses" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Recurring", component: RecurringScreen_1.RecurringScreen, options: { title: "Recurring" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Purchases", component: PurchasesScreen_1.PurchasesScreen, options: { title: "Purchases" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Monitoring", component: MonitoringScreen_1.MonitoringScreen, options: { title: "Store Monitor" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Expiry", component: ExpiryScreen_1.ExpiryScreen, options: { title: "Product Expiry" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "BalanceSheet", component: BalanceSheetScreen_1.BalanceSheetScreen, options: { title: "Balance / P&L" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "BankRecon", component: BankReconScreen_1.BankReconScreen, options: { title: "Bank Reconciliation" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Gstr", component: GstrScreen_1.GstrScreen, options: { title: "GSTR Reports" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "CreditNotes", component: CreditNotesScreen_1.CreditNotesScreen, options: { title: "Credit Notes" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "PurchaseOrders", component: PurchaseOrdersScreen_1.PurchaseOrdersScreen, options: { title: "Purchase Orders" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "SalesOrders", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Sales Orders" }, options: { title: "Sales Orders" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "PurchasePaymentOut", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Purchase Payment Out" }, options: { title: "Purchase Payment Out" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "PurchaseReturn", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Purchase Return" }, options: { title: "Purchase Return" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Import", component: ImportScreen_1.ImportScreen, options: ({ route }) => {
                const p = route.params ?? {};
                return {
                    title: p.type === "vendors" ? "Import Vendors" : "Import Customers",
                };
            } }),
        react_1.default.createElement(MoreStack.Screen, { name: "EInvoicing", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "E-Invoicing / IRN" }, options: { title: "E-Invoicing" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "IndirectIncome", component: IndirectIncomeScreen_1.IndirectIncomeScreen, options: { title: "Indirect Income" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "DebitOrders", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Debit Orders" }, options: { title: "Debit Orders" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "DeliveryChallans", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Delivery Challans" }, options: { title: "Delivery Challans" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "PackagingLists", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Packaging Lists" }, options: { title: "Packaging Lists" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Journals", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Journals" }, options: { title: "Journals" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "OnlineStore", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Online Store" }, options: { title: "Online Store" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Addons", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Addons" }, options: { title: "Addons" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "MyDrive", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "My Drive" }, options: { title: "My Drive" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Tutorial", component: ComingSoonScreen_1.ComingSoonScreen, initialParams: { title: "Tutorial" }, options: { title: "Tutorial" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "Settings", component: SettingsScreen_1.SettingsScreen, options: { title: "Settings" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "DocumentSettings", component: DocumentSettingsScreen_1.DocumentSettingsScreen, options: { title: "Document Settings" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "DocumentTemplates", component: DocumentTemplatesScreen_1.DocumentTemplatesScreen, options: { title: "Document Templates" } }),
        react_1.default.createElement(MoreStack.Screen, { name: "ComingSoon", component: ComingSoonScreen_1.ComingSoonScreen, options: ({ route }) => ({
                title: route.params?.title ?? "Coming Soon",
            }) }),
        react_1.default.createElement(MoreStack.Screen, { name: "Feedback", component: FeedbackScreen_1.FeedbackScreen, options: { title: "Feedback" } })));
}
// ── Main bottom tabs (icons match web BottomNav) ──────────────────────────────
const TAB_ICONS_FILLED = {
    Dashboard: "home",
    ItemsTab: "cube",
    CustomersTab: "people",
    InvoicesTab: "document-text",
    MoreTab: "apps",
};
const TAB_ICONS_OUTLINE = {
    Dashboard: "home-outline",
    ItemsTab: "cube-outline",
    CustomersTab: "people-outline",
    InvoicesTab: "document-text-outline",
    MoreTab: "apps-outline",
};
const TAB_ACTIVE_COLOR = "#0f172a";
const TAB_INACTIVE_COLOR = "#475569";
const useResponsive_1 = require("../hooks/useResponsive");
function TabIcon({ name, focused }) {
    const iconName = focused
        ? (TAB_ICONS_FILLED[name] ?? "ellipse")
        : (TAB_ICONS_OUTLINE[name] ?? "ellipse-outline");
    const color = focused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;
    return react_1.default.createElement(vector_icons_1.Ionicons, { name: iconName, size: 20, color: color });
}
function ResponsiveTabBar(props) {
    const { width, isTablet } = (0, useResponsive_1.useResponsive)();
    const constrainWidth = isTablet || width > useResponsive_1.BREAKPOINTS.maxContentWidth;
    return (react_1.default.createElement(react_native_1.View, { style: { alignItems: "center", width: "100%" } },
        react_1.default.createElement(react_native_1.View, { style: {
                width: constrainWidth ? useResponsive_1.BREAKPOINTS.maxContentWidth : "100%",
                maxWidth: "100%",
            } },
            react_1.default.createElement(bottom_tabs_1.BottomTabBar, { ...props }))));
}
function MainTabs() {
    const insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    return (react_1.default.createElement(Tab.Navigator, { tabBar: (props) => react_1.default.createElement(ResponsiveTabBar, { ...props }), screenOptions: ({ route }) => ({
            headerShown: false,
            tabBarLabelPosition: "below-icon",
            tabBarActiveTintColor: "#0f172a",
            tabBarInactiveTintColor: "#475569",
            tabBarStyle: {
                borderTopColor: "#e2e8f0",
                paddingBottom: Math.max(insets.bottom, 8),
                paddingTop: 8,
                height: 60 + Math.max(insets.bottom, 8),
                minHeight: 60 + Math.max(insets.bottom, 8),
            },
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "600",
                marginTop: 2,
            },
            tabBarIcon: ({ focused }) => (react_1.default.createElement(TabIcon, { name: route.name, focused: focused })),
        }) },
        react_1.default.createElement(Tab.Screen, { name: "Dashboard", component: DashboardScreen_1.DashboardScreen, options: { tabBarLabel: "Home" } }),
        react_1.default.createElement(Tab.Screen, { name: "InvoicesTab", component: InvoicesNavigator, options: { tabBarLabel: "Bills" } }),
        react_1.default.createElement(Tab.Screen, { name: "ItemsTab", component: ItemsNavigator, options: { tabBarLabel: "Items" } }),
        react_1.default.createElement(Tab.Screen, { name: "CustomersTab", component: CustomersNavigator, options: { tabBarLabel: "Parties" } }),
        react_1.default.createElement(Tab.Screen, { name: "MoreTab", component: MoreNavigator, options: { tabBarLabel: "More" } })));
}
// ── Root navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
    const { isLoggedIn, login } = (0, AuthContext_1.useAuth)();
    return (react_1.default.createElement(Root.Navigator, { screenOptions: { headerShown: false, animation: "fade" } },
        isLoggedIn ? (react_1.default.createElement(Root.Screen, { name: "Main", component: MainTabs })) : (react_1.default.createElement(Root.Screen, { name: "Auth" }, () => react_1.default.createElement(AuthNavigator, { onLogin: login }))),
        react_1.default.createElement(Root.Screen, { name: "PubInvoice", component: PubInvoiceScreen_1.PubInvoiceScreen, options: { presentation: "modal" } })));
}
//# sourceMappingURL=index.js.map
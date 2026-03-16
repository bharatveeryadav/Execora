import React from "react";
import { View, useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { DashboardScreen } from "../screens/DashboardScreen";
import { BillingScreen } from "../screens/BillingScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { InvoiceListScreen } from "../screens/InvoiceListScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { InvoiceDetailScreen } from "../screens/InvoiceDetailScreen";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { PaymentScreen } from "../screens/PaymentScreen";
import { OverdueScreen } from "../screens/OverdueScreen";
import { ItemsScreen } from "../screens/ItemsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { CashBookScreen } from "../screens/CashBookScreen";
import { DayBookScreen } from "../screens/DayBookScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { PurchasesScreen } from "../screens/PurchasesScreen";
import { RecurringScreen } from "../screens/RecurringScreen";
import { MonitoringScreen } from "../screens/MonitoringScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ComingSoonScreen } from "../screens/ComingSoonScreen";
import { FeedbackScreen } from "../screens/FeedbackScreen";
import { PubInvoiceScreen } from "../screens/PubInvoiceScreen";
import { SettingsThermalScreen } from "../screens/SettingsThermalScreen";
import { ExpiryScreen } from "../screens/ExpiryScreen";
import { BalanceSheetScreen } from "../screens/BalanceSheetScreen";
import { BankReconScreen } from "../screens/BankReconScreen";
import { GstrScreen } from "../screens/GstrScreen";
import { CreditNotesScreen } from "../screens/CreditNotesScreen";
import { PurchaseOrdersScreen } from "../screens/PurchaseOrdersScreen";
import { IndirectIncomeScreen } from "../screens/IndirectIncomeScreen";
import { CompanyProfileScreen } from "../screens/CompanyProfileScreen";

// ── Param lists ───────────────────────────────────────────────────────────────

export type RootStackParams = {
  Auth: undefined;
  Main: undefined;
  PubInvoice: { id: string; token: string };
};

export type AuthStackParams = {
  Login: undefined;
};

export type MainTabParams = {
  Dashboard: undefined;
  Billing: undefined;
  CustomersTab: undefined;
  InvoicesTab: undefined;
  MoreTab: undefined;
};

export type MoreStackParams = {
  More: undefined;
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
  ComingSoon: { title?: string; emoji?: string };
  Feedback: undefined;
  Expiry: undefined;
  BalanceSheet: undefined;
  BankRecon: undefined;
  Gstr: undefined;
  CreditNotes: undefined;
  PurchaseOrders: undefined;
  Import: { title?: string };
  EInvoicing: { title?: string };
  IndirectIncome: undefined;
  DebitOrders: { title?: string };
  DeliveryChallans: { title?: string };
  PackagingLists: { title?: string };
  Journals: { title?: string };
  OnlineStore: { title?: string };
  Addons: { title?: string };
  MyDrive: { title?: string };
  Tutorial: { title?: string };
};

export type BillingStackParams = {
  BillingForm: { startAsWalkIn?: boolean } | undefined;
  InvoiceDetail: { id: string };
};

export type InvoicesStackParams = {
  InvoiceList: undefined;
  InvoiceDetail: { id: string };
};

export type CustomersStackParams = {
  CustomerList: undefined;
  CustomerDetail: { id: string };
  Payment: { customerId?: string };
  Overdue: undefined;
};

// ── Navigators ────────────────────────────────────────────────────────────────

const Root = createNativeStackNavigator<RootStackParams>();
const Auth = createNativeStackNavigator<AuthStackParams>();
const Tab = createBottomTabNavigator<MainTabParams>();
const BillingStack = createNativeStackNavigator<BillingStackParams>();
const InvoicesStack = createNativeStackNavigator<InvoicesStackParams>();
const CustomersStack = createNativeStackNavigator<CustomersStackParams>();
const MoreStack = createNativeStackNavigator<MoreStackParams>();

// ── Auth stack ────────────────────────────────────────────────────────────────

function AuthNavigator({ onLogin }: { onLogin: () => void }) {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </Auth.Screen>
    </Auth.Navigator>
  );
}

// ── Billing stack (Billing form → Invoice detail) ─────────────────────────────

function BillingNavigator() {
  return (
    <BillingStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: true,
        headerTintColor: "#0f172a",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <BillingStack.Screen
        name="BillingForm"
        component={BillingScreen}
        options={{ title: "New Invoice" }}
      />
      <BillingStack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ headerShown: false }}
      />
    </BillingStack.Navigator>
  );
}

// ── Invoices stack ─────────────────────────────────────────────────────────────

function InvoicesNavigator() {
  return (
    <InvoicesStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <InvoicesStack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <InvoicesStack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
      />
    </InvoicesStack.Navigator>
  );
}

// ── Customers stack ────────────────────────────────────────────────────────────

function CustomersNavigator() {
  return (
    <CustomersStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CustomersStack.Screen name="CustomerList" component={CustomersScreen} />
      <CustomersStack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
      />
      <CustomersStack.Screen name="Payment" component={PaymentScreen} />
      <CustomersStack.Screen
        name="Overdue"
        component={OverdueScreen}
        options={{ headerShown: true, title: "Overdue / Udhaar" }}
      />
    </CustomersStack.Navigator>
  );
}

// ── More stack ────────────────────────────────────────────────────────────────

function MoreNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: true,
        headerTintColor: "#0f172a",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <MoreStack.Screen name="More" component={MoreScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Items" component={ItemsScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="CompanyProfile" component={CompanyProfileScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="SettingsThermal" component={SettingsThermalScreen} options={{ headerShown: false }} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <MoreStack.Screen name="DayBook" component={DayBookScreen} options={{ title: "Day Book" }} />
      <MoreStack.Screen name="CashBook" component={CashBookScreen} options={{ title: "Cash Book" }} />
      <MoreStack.Screen name="Expenses" component={ExpensesScreen} options={{ title: "Expenses" }} />
      <MoreStack.Screen name="Recurring" component={RecurringScreen} options={{ title: "Recurring" }} />
      <MoreStack.Screen name="Purchases" component={PurchasesScreen} options={{ title: "Purchases" }} />
      <MoreStack.Screen name="Monitoring" component={MonitoringScreen} options={{ title: "Store Monitor" }} />
      <MoreStack.Screen name="Expiry" component={ExpiryScreen} options={{ title: "Product Expiry" }} />
      <MoreStack.Screen name="BalanceSheet" component={BalanceSheetScreen} options={{ title: "Balance / P&L" }} />
      <MoreStack.Screen name="BankRecon" component={BankReconScreen} options={{ title: "Bank Reconciliation" }} />
      <MoreStack.Screen name="Gstr" component={GstrScreen} options={{ title: "GSTR Reports" }} />
      <MoreStack.Screen name="CreditNotes" component={CreditNotesScreen} options={{ title: "Credit Notes" }} />
      <MoreStack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} options={{ title: "Purchase Orders" }} />
      <MoreStack.Screen
        name="Import"
        component={ComingSoonScreen}
        initialParams={{ title: "Import" }}
        options={{ title: "Import" }}
      />
      <MoreStack.Screen
        name="EInvoicing"
        component={ComingSoonScreen}
        initialParams={{ title: "E-Invoicing / IRN" }}
        options={{ title: "E-Invoicing" }}
      />
      <MoreStack.Screen name="IndirectIncome" component={IndirectIncomeScreen} options={{ title: "Indirect Income" }} />
      <MoreStack.Screen name="DebitOrders" component={ComingSoonScreen} initialParams={{ title: "Debit Orders" }} options={{ title: "Debit Orders" }} />
      <MoreStack.Screen name="DeliveryChallans" component={ComingSoonScreen} initialParams={{ title: "Delivery Challans" }} options={{ title: "Delivery Challans" }} />
      <MoreStack.Screen name="PackagingLists" component={ComingSoonScreen} initialParams={{ title: "Packaging Lists" }} options={{ title: "Packaging Lists" }} />
      <MoreStack.Screen name="Journals" component={ComingSoonScreen} initialParams={{ title: "Journals" }} options={{ title: "Journals" }} />
      <MoreStack.Screen name="OnlineStore" component={ComingSoonScreen} initialParams={{ title: "Online Store" }} options={{ title: "Online Store" }} />
      <MoreStack.Screen name="Addons" component={ComingSoonScreen} initialParams={{ title: "Addons" }} options={{ title: "Addons" }} />
      <MoreStack.Screen name="MyDrive" component={ComingSoonScreen} initialParams={{ title: "My Drive" }} options={{ title: "My Drive" }} />
      <MoreStack.Screen name="Tutorial" component={ComingSoonScreen} initialParams={{ title: "Tutorial" }} options={{ title: "Tutorial" }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <MoreStack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={({ route }) => ({ title: (route.params as { title?: string })?.title ?? "Coming Soon" })}
      />
      <MoreStack.Screen name="Feedback" component={FeedbackScreen} options={{ title: "Feedback" }} />
    </MoreStack.Navigator>
  );
}

// ── Main bottom tabs (icons match web BottomNav) ──────────────────────────────

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  Billing: "receipt",
  CustomersTab: "people",
  InvoicesTab: "document-text",
  MoreTab: "ellipsis-horizontal",
};

const TAB_ACTIVE_COLORS: Record<string, string> = {
  Dashboard: "#e67e22",
  Billing: "#e67e22",
  CustomersTab: "#3d7a9e",
  InvoicesTab: "#e67e22",
  MoreTab: "#64748b",
};

const TAB_BAR_MAX_WIDTH = 480;

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconName = TAB_ICONS[name] ?? "ellipse";
  const color = focused ? (TAB_ACTIVE_COLORS[name] ?? "#e67e22") : "#94a3b8";
  return <Ionicons name={iconName} size={20} color={color} />;
}

function ResponsiveTabBar(props: React.ComponentProps<typeof BottomTabBar>) {
  const { width } = useWindowDimensions();
  const constrainWidth = width > TAB_BAR_MAX_WIDTH;
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <View
        style={{
          width: constrainWidth ? TAB_BAR_MAX_WIDTH : "100%",
          maxWidth: "100%",
        }}
      >
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#e67e22",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          borderTopColor: "#e2e8f0",
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          height: 52 + Math.max(insets.bottom, 8),
          minHeight: 52 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingNavigator}
        options={{ tabBarLabel: "Bill" }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersNavigator}
        options={{ tabBarLabel: "Cust" }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesNavigator}
        options={{ tabBarLabel: "Invs" }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreNavigator}
        options={{ tabBarLabel: "More" }}
      />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export function RootNavigator() {
  const { isLoggedIn, login } = useAuth();
  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      {isLoggedIn ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Auth">
          {() => <AuthNavigator onLogin={login} />}
        </Root.Screen>
      )}
      <Root.Screen
        name="PubInvoice"
        component={PubInvoiceScreen}
        options={{ presentation: "modal" }}
      />
    </Root.Navigator>
  );
}

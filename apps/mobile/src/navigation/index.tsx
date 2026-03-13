import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

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

// ── Param lists ───────────────────────────────────────────────────────────────

export type RootStackParams = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParams = {
  Login: undefined;
};

export type MainTabParams = {
  Dashboard: undefined;
  Billing: undefined;
  CustomersTab: undefined;
  InvoicesTab: undefined;
  Items: undefined;
};

export type BillingStackParams = {
  BillingForm: undefined;
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

// ── Main bottom tabs ──────────────────────────────────────────────────────────

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    Dashboard: "📊",
    Billing: "🧾",
    CustomersTab: "👥",
    InvoicesTab: "📋",
    Items: "📦",
  };
  return <Text style={{ fontSize: 20, color }}>{icons[name] ?? "•"}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          borderTopColor: "#e2e8f0",
          paddingBottom: 6,
          paddingTop: 4,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Billing" component={BillingNavigator} />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersNavigator}
        options={{ tabBarLabel: "Customers" }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesNavigator}
        options={{ tabBarLabel: "Invoices" }}
      />
      <Tab.Screen
        name="Items"
        component={ItemsScreen}
        options={{ tabBarLabel: "Items" }}
      />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export function RootNavigator({
  isLoggedIn,
  onLogin,
}: {
  isLoggedIn: boolean;
  onLogin: () => void;
}) {
  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      {isLoggedIn ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Auth">
          {() => <AuthNavigator onLogin={onLogin} />}
        </Root.Screen>
      )}
    </Root.Navigator>
  );
}

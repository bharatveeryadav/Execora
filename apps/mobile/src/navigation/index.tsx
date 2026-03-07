import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import { DashboardScreen } from "../screens/DashboardScreen";
import { BillingScreen } from "../screens/BillingScreen";
import { CustomersScreen } from "../screens/CustomersScreen";
import { InvoiceListScreen } from "../screens/InvoiceListScreen";
import { LoginScreen } from "../screens/LoginScreen";

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
  Customers: undefined;
  Invoices: undefined;
};

export type BillingStackParams = {
  BillingForm: undefined;
  InvoiceDetail: { id: string };
};

const Root = createNativeStackNavigator<RootStackParams>();
const Auth = createNativeStackNavigator<AuthStackParams>();
const Tab = createBottomTabNavigator<MainTabParams>();
const BillingStack = createNativeStackNavigator<BillingStackParams>();

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
    </BillingStack.Navigator>
  );
}

// ── Main bottom tabs ──────────────────────────────────────────────────────────

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    Dashboard: "📊",
    Billing: "🧾",
    Customers: "👥",
    Invoices: "📋",
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
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Invoices" component={InvoiceListScreen} />
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

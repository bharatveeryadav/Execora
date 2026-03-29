/**
 * ErrorBoundary — catches unhandled render errors at the screen level.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeScreen />
 *   </ErrorBoundary>
 *
 * With a custom fallback:
 *   <ErrorBoundary fallback={<Text>Custom error UI</Text>}>
 *     <SomeScreen />
 *   </ErrorBoundary>
 */
import React, { Component } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI. Receives the error and a reset function. */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap for a real error reporting service in prod.
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;

    if (fallback) {
      return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
    }

    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={36} color="#dc2626" />
          </View>

          <Text className="text-xl font-bold text-slate-800 mb-2 text-center">
            Something went wrong
          </Text>
          <Text className="text-sm text-slate-500 text-center mb-6" numberOfLines={4}>
            {error.message || "An unexpected error occurred."}
          </Text>

          <TouchableOpacity
            onPress={this.reset}
            activeOpacity={0.75}
            className="bg-primary min-h-[48px] px-8 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-bold text-base">Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

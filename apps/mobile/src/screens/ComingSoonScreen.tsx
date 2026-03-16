/**
 * ComingSoonScreen — placeholder for features not yet implemented.
 * Shared by: Debit Orders, Delivery Challans, Packaging Lists, Journals, etc.
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

type RouteParams = { title?: string; emoji?: string };

export function ComingSoonScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();
  const title = (route.params as RouteParams)?.title ?? "Coming Soon";
  const emoji = (route.params as RouteParams)?.emoji ?? "🚧";

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-6xl mb-4">{emoji}</Text>
        <Text className="text-xl font-bold text-slate-800 text-center mb-2">
          {title}
        </Text>
        <Text className="text-slate-500 text-center mb-6">
          {title} is coming soon. We'll notify you when it's ready.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

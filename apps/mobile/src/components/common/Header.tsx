/**
 * Header — back button + title + right slot (Sprint 2).
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { cn } from "../../lib/utils";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  subtitle,
  showBack = true,
  rightSlot,
  className,
}: HeaderProps) {
  const navigation = useNavigation();

  return (
    <View
      className={cn(
        "flex-row items-center px-4 py-3 border-b border-slate-100 bg-white",
        className
      )}
    >
      {showBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3 p-1 -ml-1"
        >
          <Text className="text-2xl text-slate-600">←</Text>
        </TouchableOpacity>
      )}
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-800">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-slate-500">{subtitle}</Text>
        )}
      </View>
      {rightSlot}
    </View>
  );
}

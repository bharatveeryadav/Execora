import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { EmptyState } from "./EmptyState";
import { ErrorCard } from "./ErrorCard";
import { LoadingBlock } from "./LoadingBlock";

export interface QueryRefreshWrapperProps {
  isLoading?: boolean;
  isRefreshing?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRefresh?: () => void;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
  contentContainerClassName?: string;
}

export function QueryRefreshWrapper({
  isLoading,
  isRefreshing,
  isError,
  errorMessage,
  onRefresh,
  onRetry,
  empty,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  children,
}: QueryRefreshWrapperProps) {
  if (isLoading) {
    return (
      <LoadingBlock
        title="Loading data"
        description="Fetching the latest information."
      />
    );
  }

  if (isError) {
    return <ErrorCard message={errorMessage} onRetry={onRetry ?? onRefresh} />;
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View className="flex-1 px-4 pb-8 pt-3">
        {empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </View>
    </ScrollView>
  );
}

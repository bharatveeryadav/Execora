import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger" | "outline" | "ghost";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <Pressable className="absolute inset-0" onPress={onCancel} />
        <View className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5">
          <Text className="text-lg font-bold text-slate-800">{title}</Text>
          {description ? (
            <Text className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </Text>
          ) : null}
          <View className="mt-5 flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant}
              className="flex-1"
              onPress={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

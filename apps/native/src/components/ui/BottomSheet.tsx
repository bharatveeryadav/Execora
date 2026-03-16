import {
  Modal, Pressable, ScrollView, Text, View,
  type ViewProps,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapHeight?: number; // 0-1 fraction of screen height
}

export function BottomSheet({ visible, onClose, title, children, snapHeight = 0.6 }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        {/* Dismiss overlay */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View className="bg-white rounded-t-3xl overflow-hidden" style={{ maxHeight: `${snapHeight * 100}%` }}>
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-slate-200" />
          </View>

          {title && (
            <View className="px-5 pb-3 border-b border-border">
              <Text className="text-base font-bold text-primary">{title}</Text>
            </View>
          )}

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

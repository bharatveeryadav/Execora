import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  transparent?: boolean;
}

export function Header({ title, subtitle, showBack = true, rightSlot, transparent = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`px-4 pb-3 border-b border-border flex-row items-center gap-3 ${transparent ? '' : 'bg-white'}`}
      style={{ paddingTop: insets.top + 8 }}
    >
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center active:opacity-60"
        >
          <Ionicons name="arrow-back" size={18} color="#0f172a" />
        </Pressable>
      )}
      <View className="flex-1">
        <Text className="text-base font-bold text-primary" numberOfLines={1}>{title}</Text>
        {subtitle && <Text className="text-xs text-muted">{subtitle}</Text>}
      </View>
      {rightSlot && <View className="flex-row items-center gap-2">{rightSlot}</View>}
    </View>
  );
}

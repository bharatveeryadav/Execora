import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotFound() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6"
      style={{ paddingTop: insets.top }}>
      <Text style={{ fontSize: 48 }}>🔍</Text>
      <Text className="text-xl font-bold text-primary">Page not found</Text>
      <Link href="/" className="text-accent text-sm">Go to Home</Link>
    </View>
  );
}

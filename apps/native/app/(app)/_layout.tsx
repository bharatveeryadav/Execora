import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, label }: { name: IoniconsName; focused: boolean; label: string }) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Ionicons name={name} size={22} color={focused ? '#0f172a' : '#94a3b8'} />
      <Text style={{ fontSize: 10, color: focused ? '#0f172a' : '#94a3b8', fontWeight: focused ? '700' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (!isAuthenticated) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Home" />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          tabBarIcon: ({ focused }) => (
            <View className="items-center gap-0.5 pt-1">
              <View className={`h-12 w-12 rounded-2xl items-center justify-center shadow-md ${focused ? 'bg-primary' : 'bg-primary'}`}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="invoices/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} label="Bills" />,
        }}
      />
      <Tabs.Screen
        name="parties/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} label="Parties" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} label="More" />,
        }}
      />

      {/* Hidden tab screens */}
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
      <Tabs.Screen name="parties/[id]" options={{ href: null }} />
    </Tabs>
  );
}

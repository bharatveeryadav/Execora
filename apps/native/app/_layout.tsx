import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryProvider } from '@/contexts/QueryProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="(auth)"   options={{ animation: 'fade' }} />
              <Stack.Screen name="(app)"    options={{ animation: 'fade' }} />
              <Stack.Screen name="payment"  />
              <Stack.Screen name="expenses" />
              <Stack.Screen name="cashbook" />
              <Stack.Screen name="daybook"  />
              <Stack.Screen name="reports"  />
              <Stack.Screen name="overdue"  />
              <Stack.Screen name="recurring"/>
              <Stack.Screen name="purchases"/>
              <Stack.Screen name="monitoring"/>
              <Stack.Screen name="settings/index" />
              <Stack.Screen name="settings/profile" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <Toast />
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

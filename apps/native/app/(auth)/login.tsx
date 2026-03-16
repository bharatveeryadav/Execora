import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess, hapticError } from '@/lib/haptics';

export default function Login() {
  const { login }    = useAuth();
  const insets       = useSafeAreaInsets();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [tenant,   setTenant]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Enter email and password' });
      hapticError();
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password, tenant.trim() || undefined);
      await hapticSuccess();
      router.replace('/(app)');
    } catch (err) {
      hapticError();
      Toast.show({ type: 'error', text1: 'Login failed', text2: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo section */}
        <View className="items-center px-8 py-12">
          <View className="h-20 w-20 rounded-3xl bg-primary items-center justify-center mb-6 shadow-lg">
            <Text className="text-white text-3xl font-black">E</Text>
          </View>
          <Text className="text-3xl font-black text-primary">Execora</Text>
          <Text className="text-sm text-muted mt-1 text-center">Smart Billing for Kirana Stores</Text>
        </View>

        {/* Form */}
        <View className="px-6 gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="owner@myshop.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={16} color="#94a3b8" />}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPass}
            autoComplete="password"
            leftIcon={<Ionicons name="lock-closed-outline" size={16} color="#94a3b8" />}
            rightIcon={
              <Pressable onPress={() => setShowPass((v) => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color="#94a3b8" />
              </Pressable>
            }
          />
          <Input
            label="Tenant ID (optional)"
            value={tenant}
            onChangeText={setTenant}
            placeholder="system-tenant-001"
            autoCapitalize="none"
            leftIcon={<Ionicons name="business-outline" size={16} color="#94a3b8" />}
          />

          <Button
            onPress={handleLogin}
            loading={loading}
            size="lg"
            fullWidth
            className="mt-2"
          >
            Sign In
          </Button>

          <Text className="text-xs text-muted text-center mt-2">
            Forgot password? Contact your admin.
          </Text>
        </View>

        {/* Footer */}
        <View className="items-center mt-auto pt-8">
          <Text className="text-xs text-muted">Execora v1.0 · execora.app</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

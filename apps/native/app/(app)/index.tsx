import { ScrollView, Text, View, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { reportApi, monitoringApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { fmtRupee, fmtRelative, today } from '@/lib/format';
import { Card, PressableCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';

function KPICard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Card className="flex-1" padding={false}>
      <View className="p-3 gap-1">
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text className="text-xs text-muted">{label}</Text>
        <Text className="text-base font-bold text-primary">{value}</Text>
      </View>
    </Card>
  );
}

function QuickAction({ icon, label, route, color = '#0f172a' }: { icon: string; label: string; route: string; color?: string }) {
  return (
    <Pressable
      className="flex-1 items-center gap-1.5 py-3 rounded-2xl bg-slate-50 active:bg-slate-100"
      onPress={() => router.push(route as never)}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text className="text-xs font-medium text-primary text-center">{label}</Text>
    </Pressable>
  );
}

export default function Home() {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();
  const todayStr  = today();

  const { data: summary, isLoading: loadingSummary, refetch } = useQuery({
    queryKey: ['reports', 'summary', todayStr],
    queryFn:  () => reportApi.summary(`${todayStr}T00:00:00.000Z`, `${todayStr}T23:59:59.999Z`),
    refetchInterval: 30_000,
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn:  () => import('@/lib/api').then((m) => m.invoiceApi.list({ limit: 8 })),
    refetchInterval: 30_000,
  });

  const { data: alertData } = useQuery({
    queryKey: ['monitoring', 'unread'],
    queryFn:  () => monitoringApi.unreadCount(),
    refetchInterval: 20_000,
  });

  const invoices    = invoicesData?.invoices ?? [];
  const unread      = alertData?.count ?? 0;
  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName   = user?.name?.split(' ')[0] ?? 'Owner';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
    >
      {/* Header */}
      <View className="bg-white px-5 pb-4 border-b border-border" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-muted">{greeting} 👋</Text>
            <Text className="text-xl font-black text-primary">{firstName}</Text>
          </View>
          <View className="flex-row gap-2">
            {unread > 0 && (
              <Pressable
                className="h-9 w-9 rounded-full bg-red-50 items-center justify-center"
                onPress={() => router.push('/monitoring')}
              >
                <Ionicons name="notifications" size={18} color="#dc2626" />
                <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 items-center justify-center">
                  <Text className="text-white text-[9px] font-bold">{unread > 9 ? '9+' : unread}</Text>
                </View>
              </Pressable>
            )}
            <Pressable
              className="h-9 w-9 rounded-full bg-primary items-center justify-center"
              onPress={() => router.push('/settings')}
            >
              <Text className="text-white text-xs font-bold">{user?.name?.slice(0, 2).toUpperCase() ?? 'U'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="px-4 pt-4 gap-5">
        {/* KPI Row */}
        {loadingSummary ? (
          <View className="flex-row gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} height={80} width={undefined} style={{ flex: 1, borderRadius: 16 }} />)}
          </View>
        ) : (
          <View className="flex-row gap-3">
            <KPICard label="Bills Today" icon="🧾" value={String(summary?.totalBills ?? 0)} />
            <KPICard label="Revenue" icon="💰" value={fmtRupee(summary?.totalRevenue)} />
            <KPICard label="Pending" icon="⏳" value={fmtRupee(summary?.totalPending)} />
          </View>
        )}

        {/* Quick Actions */}
        <View>
          <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Quick Actions</Text>
          <View className="flex-row gap-3">
            <QuickAction icon="🧾" label="New Bill" route="/(app)/billing" />
            <QuickAction icon="💳" label="Payment" route="/payment" />
            <QuickAction icon="📦" label="Inventory" route="/(app)/inventory" />
            <QuickAction icon="📊" label="Reports" route="/reports" />
          </View>
        </View>

        {/* Profit card */}
        {summary && (
          <Card className={summary.profit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted">Today's Profit</Text>
                <Text className={`text-2xl font-black ${summary.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {summary.profit >= 0 ? '+' : ''}{fmtRupee(summary.profit)}
                </Text>
              </View>
              <View className={`p-3 rounded-2xl ${summary.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Ionicons
                  name={summary.profit >= 0 ? 'trending-up' : 'trending-down'}
                  size={24}
                  color={summary.profit >= 0 ? '#16a34a' : '#dc2626'}
                />
              </View>
            </View>
          </Card>
        )}

        {/* Recent Bills */}
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide">Recent Bills</Text>
            <Pressable onPress={() => router.push('/(app)/invoices')}>
              <Text className="text-xs text-accent font-medium">See all</Text>
            </Pressable>
          </View>

          {loadingInvoices ? (
            <View className="gap-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={60} style={{ borderRadius: 16 }} />)}
            </View>
          ) : invoices.length === 0 ? (
            <Card>
              <Text className="text-sm text-muted text-center py-4">No bills yet today</Text>
            </Card>
          ) : (
            <View className="gap-2">
              {invoices.map((inv) => (
                <PressableCard
                  key={inv.id}
                  padding={false}
                  onPress={() => router.push(`/(app)/invoices/${inv.id}` as never)}
                >
                  <View className="flex-row items-center px-4 py-3 gap-3">
                    <View className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center">
                      <Text style={{ fontSize: 16 }}>🧾</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-primary" numberOfLines={1}>
                        {inv.invoiceNo} {inv.customer ? `· ${inv.customer.name}` : '· Walk-in'}
                      </Text>
                      <Text className="text-xs text-muted">{fmtRelative(inv.createdAt)}</Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="text-sm font-bold text-primary">{fmtRupee(inv.total)}</Text>
                      <StatusBadge status={inv.status} />
                    </View>
                  </View>
                </PressableCard>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

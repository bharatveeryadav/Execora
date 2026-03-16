import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { customerApi, type Customer } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { initials } from '@/lib/format';

interface Props {
  value?: Customer | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
}

export function CustomerSearch({ value, onSelect, placeholder = 'Search customer...' }: Props) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);

  const { data } = useQuery({
    queryKey: ['customers', 'search', query],
    queryFn:  () => customerApi.list(query, 20),
    enabled:  open && query.length >= 1,
    staleTime: 10_000,
  });

  const customers = data?.customers ?? [];

  if (value) {
    return (
      <Pressable
        className="flex-row items-center gap-3 p-3 rounded-xl border border-border bg-white"
        onPress={() => { onSelect(null); setQuery(''); }}
      >
        <View className="h-9 w-9 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-xs font-bold">{initials(value.name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-primary">{value.name}</Text>
          {value.phone && <Text className="text-xs text-muted">{value.phone}</Text>}
        </View>
        <Ionicons name="close-circle" size={18} color="#94a3b8" />
      </Pressable>
    );
  }

  return (
    <View>
      <Input
        placeholder={placeholder}
        value={query}
        onChangeText={(t) => { setQuery(t); setOpen(true); }}
        onFocus={() => setOpen(true)}
        leftIcon={<Ionicons name="search" size={16} color="#94a3b8" />}
      />
      {open && customers.length > 0 && (
        <View className="mt-1 rounded-xl border border-border bg-white shadow-md overflow-hidden">
          <FlatList
            data={customers.slice(0, 8)}
            keyExtractor={(c) => c.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                className="flex-row items-center gap-3 px-3 py-2.5 active:bg-slate-50 border-b border-border/50"
                onPress={() => { onSelect(item); setOpen(false); setQuery(''); }}
              >
                <View className="h-8 w-8 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white text-xs font-bold">{initials(item.name)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-primary">{item.name}</Text>
                  {item.phone && <Text className="text-xs text-muted">{item.phone}</Text>}
                </View>
                {(item.balance ?? 0) > 0 && (
                  <Text className="text-xs text-danger font-medium">₹{item.balance?.toLocaleString('en-IN')}</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

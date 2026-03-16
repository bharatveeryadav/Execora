import { Text, View } from 'react-native';
import { statusColor } from '@/lib/format';

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const colors = statusColor(status);
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

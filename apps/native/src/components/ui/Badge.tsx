import { Text, View } from 'react-native';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const styles: Record<Variant, { bg: string; text: string }> = {
  default: { bg: '#f1f5f9', text: '#334155' },
  success: { bg: '#dcfce7', text: '#16a34a' },
  warning: { bg: '#fef9c3', text: '#ca8a04' },
  danger:  { bg: '#fee2e2', text: '#dc2626' },
  info:    { bg: '#dbeafe', text: '#1d4ed8' },
  muted:   { bg: '#f8fafc', text: '#94a3b8' },
};

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: Props) {
  const s = styles[variant];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 20, paddingHorizontal: size === 'sm' ? 8 : 10, paddingVertical: size === 'sm' ? 2 : 4 }}>
      <Text style={{ color: s.text, fontSize: size === 'sm' ? 10 : 12, fontWeight: '600' }}>
        {children}
      </Text>
    </View>
  );
}

import { Text, View } from 'react-native';
import { Button } from './Button';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', title, description, actionLabel, onAction }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16 gap-3">
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text className="text-base font-bold text-primary text-center">{title}</Text>
      {description && (
        <Text className="text-sm text-muted text-center leading-relaxed">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} variant="primary" size="md" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

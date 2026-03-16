import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, rightIcon, style, ...rest }: Props) {
  return (
    <View className="gap-1">
      {label && <Text className="text-xs font-medium text-slate-600">{label}</Text>}
      <View className={`
        flex-row items-center h-11 px-3 rounded-xl border bg-white
        ${error ? 'border-danger' : 'border-border'}
      `}>
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          {...rest}
          className="flex-1 text-sm text-primary"
          placeholderTextColor="#94a3b8"
          style={[{ fontSize: 14, color: '#0f172a' }, style as object]}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && <Text className="text-xs text-danger">{error}</Text>}
      {hint && !error && <Text className="text-xs text-muted">{hint}</Text>}
    </View>
  );
}

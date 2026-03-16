import { Pressable, View, type ViewProps, type PressableProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: boolean;
}

interface PressableCardProps extends PressableProps {
  children: React.ReactNode;
  padding?: boolean;
}

export function Card({ children, padding = true, className, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      className={`bg-white rounded-2xl border border-border shadow-sm ${padding ? 'p-4' : ''} ${className ?? ''}`}
      style={style}
    >
      {children}
    </View>
  );
}

export function PressableCard({ children, padding = true, className, style, ...rest }: PressableCardProps) {
  return (
    <Pressable
      {...rest}
      className={`bg-white rounded-2xl border border-border shadow-sm active:opacity-70 ${padding ? 'p-4' : ''} ${className ?? ''}`}
      style={style}
    >
      {children}
    </Pressable>
  );
}

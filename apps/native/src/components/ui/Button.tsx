import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends PressableProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-primary active:opacity-80',
  secondary: 'bg-accent active:opacity-80',
  outline:   'border border-border bg-transparent active:bg-muted/20',
  ghost:     'bg-transparent active:bg-muted/20',
  danger:    'bg-danger active:opacity-80',
};

const textStyles: Record<Variant, string> = {
  primary:   'text-white',
  secondary: 'text-white',
  outline:   'text-primary',
  ghost:     'text-primary',
  danger:    'text-white',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 rounded-lg',
  md: 'h-11 px-5 rounded-xl',
  lg: 'h-14 px-6 rounded-2xl',
};

const textSizeStyles: Record<Size, string> = {
  sm: 'text-xs font-medium',
  md: 'text-sm font-semibold',
  lg: 'text-base font-bold',
};

export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, icon, fullWidth = false, disabled, style, ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      className={`
        flex-row items-center justify-center gap-2
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50' : ''}
      `}
      style={style}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#0f172a' : '#fff'} />
        : icon}
      {typeof children === 'string'
        ? <Text className={`${textStyles[variant]} ${textSizeStyles[size]}`}>{children}</Text>
        : children}
    </Pressable>
  );
}

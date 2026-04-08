import React, { createContext, useContext } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { COLORS } from "../../../shared/lib/constants";
import { cn } from "../../../lib/utils";

type AccordionContextValue = {
  value: string[];
  onValueChange?: (value: string[]) => void;
};

type AccordionItemContextValue = {
  itemValue: string;
  isExpanded: boolean;
};

const AccordionContext = createContext<AccordionContextValue>({ value: [] });
const AccordionItemContext = createContext<AccordionItemContextValue>({ itemValue: "", isExpanded: false });

export function Accordion({
  value = [],
  onValueChange,
  children,
  className,
}: {
  type?: "single" | "multiple";
  isCollapsible?: boolean;
  value?: string[];
  onValueChange?: (value: string[]) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AccordionContext.Provider value={{ value, onValueChange }}>
      <View className={className}>{children}</View>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const accordion = useContext(AccordionContext);
  const isExpanded = accordion.value.includes(value);

  return (
    <AccordionItemContext.Provider value={{ itemValue: value, isExpanded }}>
      <View className={className}>{children}</View>
    </AccordionItemContext.Provider>
  );
}

export function AccordionHeader({ children, className }: ViewProps & { className?: string }) {
  return <View className={className}>{children}</View>;
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: React.ReactNode | ((state: { isExpanded?: boolean }) => React.ReactNode);
  className?: string;
}) {
  const accordion = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);

  const toggle = () => {
    accordion.onValueChange?.(item.isExpanded ? [] : [item.itemValue]);
  };

  return (
    <Pressable onPress={toggle} className={className}>
      {typeof children === "function" ? children({ isExpanded: item.isExpanded }) : children}
    </Pressable>
  );
}

export function AccordionTitleText({ children, className, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={className} {...props}>
      {children}
    </Text>
  );
}

export function AccordionContent({ children, className }: ViewProps & { className?: string }) {
  const item = useContext(AccordionItemContext);
  if (!item.isExpanded) return null;
  return <View className={className}>{children}</View>;
}

export function Button({
  children,
  className,
  style,
  disabled,
  onPress,
  variant,
  action,
  ...props
}: PressableProps & {
  variant?: "solid" | "outline" | "link";
  action?: "primary" | "secondary" | "negative";
  className?: string;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}) {
  const effectiveVariant = variant ?? "solid";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "items-center justify-center flex-row",
        effectiveVariant === "solid" && "rounded-xl bg-primary px-4 py-2.5",
        effectiveVariant === "outline" && "rounded-xl border border-slate-200 bg-white px-4 py-2.5",
        effectiveVariant === "link" && "bg-transparent px-0 py-0",
        disabled && "opacity-50",
        className,
      )}
      style={(state) => {
        const resolved = typeof style === "function" ? style(state) : style;
        return [{ opacity: state.pressed && !disabled ? 0.75 : 1 }, resolved];
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
}

export function ButtonText({ children, className, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={cn("font-semibold text-slate-800", className)} {...props}>
      {children}
    </Text>
  );
}

export function Card({ children, className, style, ...props }: ViewProps & { children?: React.ReactNode; className?: string }) {
  return (
    <View
      className={cn("rounded-2xl border border-slate-200/80 bg-white p-4", className)}
      style={[
        {
          shadowColor: COLORS.text.primary,
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function FormControl({ children, className }: ViewProps & { className?: string }) {
  return <View className={className}>{children}</View>;
}

export function FormControlLabel({ children, className }: ViewProps & { className?: string }) {
  return <View className={className}>{children}</View>;
}

export function FormControlLabelText({ children, className, ...props }: TextProps & { className?: string }) {
  return (
    <Text className={className} {...props}>
      {children}
    </Text>
  );
}

export function Input({ children, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}

export function InputField({ className, ...props }: TextInputProps & { className?: string }) {
  return <TextInput className={className} {...props} />;
}

export function Spinner({ color, size }: { color?: string; size?: "small" | "large" }) {
  return (
    <ActivityIndicator
      color={color === "$white" ? COLORS.text.inverted : color ?? COLORS.primary}
      size={size ?? "small"}
    />
  );
}

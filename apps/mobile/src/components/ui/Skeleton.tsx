/**
 * Skeleton — design system component (Sprint 2).
 */
import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { cn } from "../../lib/utils";

export function Skeleton({
  className,
  ...props
}: { className?: string } & React.ComponentPropsWithoutRef<typeof View>) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      className={cn("rounded-lg bg-slate-200", className)}
      style={{ opacity }}
      {...props}
    />
  );
}
